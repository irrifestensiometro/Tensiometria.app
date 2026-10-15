import assert from 'node:assert/strict';
import test from 'node:test';
import { Area, LeituraValor, Tensiometro } from '../types';
import { calcularIrrigacao, ErroCalculoIrrigacao } from './irrigationMath';
import { converterUmidadeGravimetricaParaVolumetrica } from './soilReferences';

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
  solo: { coef_a: 0.4, coef_b: -0.1, umidade_cc: 0.3 },
  planta: { prof_raiz_mm: 300 },
  irrigacao: { eficiencia_ea: 0.8, vazao_ip: 10, pam: 1 },
  tensiometros,
});

const leituras = (...valores: number[]): LeituraValor[] => valores.map((leitura_kpa, indice) => ({
  tensiometro_id: `sensor-${indice + 1}`,
  leitura_kpa,
}));

test('converte umidades gravimétricas da planilha usando Ds de referência', () => {
  assert.equal(converterUmidadeGravimetricaParaVolumetrica(21), 0.252);
});

const ensaiosPlanilha = [
  {
    nome: 'Planilha 1',
    coef_a: converterUmidadeGravimetricaParaVolumetrica(29.641),
    coef_b: -0.091,
    umidade_cc: converterUmidadeGravimetricaParaVolumetrica(23.56),
    prof_raiz_mm: 400,
    eficiencia_ea: 0.9,
    vazao_ip: 1.14,
    pam: 0.55 / 2.8,
    laminaLiquida: 2.9594475869036785,
    laminaBruta: 3.2882750965596426,
    tempoHoras: 2.8844518390874061,
  },
  {
    nome: 'Centro do pivô',
    coef_a: converterUmidadeGravimetricaParaVolumetrica(44.731),
    coef_b: -0.097,
    umidade_cc: converterUmidadeGravimetricaParaVolumetrica(35.09),
    prof_raiz_mm: 400,
    eficiencia_ea: 0.9,
    vazao_ip: 1.14,
    pam: 0.55 / 2.8,
    laminaLiquida: 4.7335013901086498,
    laminaBruta: 5.2594459890096106,
    tempoHoras: 4.6135491131663251,
  },
  {
    nome: 'Banana',
    coef_a: converterUmidadeGravimetricaParaVolumetrica(37.775),
    coef_b: -0.129,
    umidade_cc: converterUmidadeGravimetricaParaVolumetrica(27.33),
    prof_raiz_mm: 400,
    eficiencia_ea: 0.9,
    vazao_ip: 1.4285714285714288,
    pam: 0.55 / 2.8,
    laminaLiquida: 4.7658890179288518,
    laminaBruta: 5.2954322421431685,
    tempoHoras: 3.7068025695002174,
  },
] as const;

for (const ensaio of ensaiosPlanilha) {
  test(`reproduz o ensaio ${ensaio.nome} da planilha`, () => {
    const areaEnsaio = area([sensor({ tensao_critica: 60, camada_fim_cm: 40 })]);
    areaEnsaio.solo.coef_a = ensaio.coef_a;
    areaEnsaio.solo.coef_b = ensaio.coef_b;
    areaEnsaio.solo.umidade_cc = ensaio.umidade_cc;
    areaEnsaio.planta.prof_raiz_mm = ensaio.prof_raiz_mm;
    areaEnsaio.irrigacao.eficiencia_ea = ensaio.eficiencia_ea;
    areaEnsaio.irrigacao.vazao_ip = ensaio.vazao_ip;
    areaEnsaio.irrigacao.pam = ensaio.pam;

    const resultado = calcularIrrigacao(areaEnsaio, leituras(60)).setores[0];

    assert.ok(Math.abs(resultado.laminaLiquidaMm - ensaio.laminaLiquida) < 1e-10);
    assert.ok(Math.abs(resultado.laminaBrutaMm - ensaio.laminaBruta) < 1e-10);
    assert.ok(Math.abs(resultado.tempoHoras - ensaio.tempoHoras) < 1e-10);
  });
}

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

test('mantém o mesmo cálculo para áreas antigas com coeficiente B positivo', () => {
  const areaLegada = area();
  areaLegada.solo.coef_b = 0.1;

  const resultadoNegativo = calcularIrrigacao(area(), leituras(50)).setores[0];
  const resultadoLegado = calcularIrrigacao(areaLegada, leituras(50)).setores[0];

  assert.equal(resultadoLegado.laminaLiquidaMm, resultadoNegativo.laminaLiquidaMm);
  assert.equal(resultadoLegado.tempoHoras, resultadoNegativo.tempoHoras);
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

  areaInvalida.solo.coef_b = 0;
  assert.throws(() => calcularIrrigacao(areaInvalida, leituras(50)), ErroCalculoIrrigacao);
});
