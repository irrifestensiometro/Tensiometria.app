import assert from 'node:assert/strict';
import test from 'node:test';
import { Area, LeituraValor, Tensiometro } from '../types';
import { calcularIrrigacao, ErroCalculoIrrigacao } from './irrigationMath';

const sensor = (alteracoes: Partial<Tensiometro> = {}): Tensiometro => ({
  id: 'sensor-1',
  prof_cm: 15,
  setor: 'Setor 1',
  camada_inicio_cm: 0,
  camada_fim_cm: 30,
  tipo: 'decisao',
  is_controle: false,
  tensao_critica: 40,
  ...alteracoes,
});

const area = (tensiometros: Tensiometro[] = [sensor()]): Area => ({
  id: 'area-1',
  agronomo_id: 'agronomo-1',
  produtor_id: 'produtor-1',
  nome: 'Área de teste',
  solo: { coef_a: 0.4, coef_b: 0.1, umidade_cc: 0.3 },
  planta: { prof_raiz_mm: 300 },
  irrigacao: { eficiencia_ea: 0.8, vazao_ip: 10, pam: 1 },
  tensiometros,
});

const leituras = (...valores: number[]): LeituraValor[] => valores.map((leitura_kpa, indice) => ({
  tensiometro_id: `sensor-${indice + 1}`,
  leitura_kpa,
}));

test('não recomenda irrigação antes da tensão crítica', () => {
  const resultado = calcularIrrigacao(area(), leituras(30)).setores[0];
  assert.equal(resultado.necessitaIrrigacao, false);
  assert.equal(resultado.tempoHoras, 0);
  assert.equal(resultado.tensaoDecisaoKpa, 30);
});

test('calcula lâminas e tempo com unidades coerentes', () => {
  const resultado = calcularIrrigacao(area(), leituras(50)).setores[0];
  const theta = 0.4 * Math.pow(50, -0.1);
  const laminaLiquida = (0.3 - theta) * 300;
  const laminaBruta = laminaLiquida / 0.8;

  assert.equal(resultado.necessitaIrrigacao, true);
  assert.ok(Math.abs(resultado.laminaLiquidaMm - laminaLiquida) < 1e-10);
  assert.ok(Math.abs(resultado.laminaBrutaMm - laminaBruta) < 1e-10);
  assert.ok(Math.abs(resultado.tempoHoras - laminaBruta / 10) < 1e-10);
});

test('faz a média de sensores repetidos na mesma camada sem duplicar a lâmina', () => {
  const sensor2 = sensor({ id: 'sensor-2', setor: 'Setor 1' });
  const resultadoUmSensor = calcularIrrigacao(area(), leituras(50)).setores[0];
  const resultadoDoisSensores = calcularIrrigacao(area([sensor(), sensor2]), leituras(50, 50)).setores[0];

  assert.ok(Math.abs(resultadoUmSensor.laminaLiquidaMm - resultadoDoisSensores.laminaLiquidaMm) < 1e-10);
  assert.equal(resultadoDoisSensores.camadas[0].sensoresConsiderados, 2);
});

test('limita a camada monitorada à profundidade radicular', () => {
  const areaRaizCurta = area([sensor({ camada_fim_cm: 60 })]);
  areaRaizCurta.planta.prof_raiz_mm = 300;
  const resultado = calcularIrrigacao(areaRaizCurta, leituras(50)).setores[0];

  assert.equal(resultado.camadas.length, 1);
  assert.equal(resultado.camadas[0].fimMm, 300);
  assert.equal(resultado.camadas[0].espessuraMm, 300);
});

test('sensor de controle não substitui o sensor de decisão no gatilho', () => {
  const controle = sensor({ id: 'sensor-2', tipo: 'controle', is_controle: true, prof_cm: 45, camada_inicio_cm: 30, camada_fim_cm: 60 });
  const resultado = calcularIrrigacao(area([sensor(), controle]), leituras(50, 5)).setores[0];

  assert.equal(resultado.necessitaIrrigacao, true);
  assert.equal(resultado.tensaoDecisaoKpa, 50);
});

test('calcula cada setor independentemente usando somente suas leituras', () => {
  const setor2 = sensor({
    id: 'sensor-2',
    setor: 'Setor 2',
    camada_inicio_cm: 0,
    camada_fim_cm: 30,
  });
  const resultado = calcularIrrigacao(area([sensor(), setor2]), leituras(50, 30));

  assert.equal(resultado.setores.length, 2);
  assert.equal(resultado.setores[0].setor, 'Setor 1');
  assert.equal(resultado.setores[0].necessitaIrrigacao, true);
  assert.equal(resultado.setores[1].setor, 'Setor 2');
  assert.equal(resultado.setores[1].necessitaIrrigacao, false);
  assert.ok(resultado.setores[0].laminaLiquidaMm > 0);
  assert.equal(resultado.setores[1].laminaLiquidaMm, 0);
});

test('valida cobertura das camadas separadamente em cada setor', () => {
  const setor2 = sensor({
    id: 'sensor-2',
    setor: 'Setor 2',
    camada_inicio_cm: 0,
    camada_fim_cm: 10,
  });
  assert.throws(
    () => calcularIrrigacao(area([sensor(), setor2]), leituras(50, 50)),
    (error: unknown) => {
      assert.ok(error instanceof ErroCalculoIrrigacao);
      assert.match(error.message, /setor "Setor 2"/i);
      return true;
    },
  );
});

test('rejeita divisores e parâmetros físicos inválidos', () => {
  const areaInvalida = area();
  areaInvalida.irrigacao.eficiencia_ea = 0;

  assert.throws(() => calcularIrrigacao(areaInvalida, leituras(50)), ErroCalculoIrrigacao);
});
