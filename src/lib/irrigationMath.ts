import { Area, LeituraValor, Tensiometro } from '../types';

export interface ResultadoCamadaIrrigacao {
  inicioMm: number;
  fimMm: number;
  espessuraMm: number;
  umidadeAtual: number;
  laminaLiquidaMm: number;
  sensoresConsiderados: number;
}

export interface ResultadoIrrigacao {
  necessitaIrrigacao: boolean;
  tempoHoras: number;
  mensagem: string;
  laminaLiquidaMm: number;
  laminaBrutaMm: number;
  tensaoDecisaoKpa: number | null;
  tensaoCriticaKpa: number | null;
  umidadeMedia: number | null;
  camadas: ResultadoCamadaIrrigacao[];
}

export class ErroCalculoIrrigacao extends Error {
  constructor(public readonly problemas: string[]) {
    super(problemas.join(' '));
    this.name = 'ErroCalculoIrrigacao';
  }
}

const numeroFinito = (valor: number) => Number.isFinite(valor);

function sensorEhControle(sensor: Tensiometro) {
  return sensor.tipo === 'controle' || sensor.is_controle;
}

export function validarParametrosIrrigacao(area: Area, leituras?: LeituraValor[]): string[] {
  const problemas: string[] = [];
  const { coef_a: a, coef_b: b, umidade_cc: cc } = area.solo;
  const { eficiencia_ea: ea, vazao_ip: ip, pam } = area.irrigacao;

  if (!numeroFinito(a) || a <= 0) problemas.push('O coeficiente A deve ser maior que zero.');
  if (!numeroFinito(b) || b <= 0) problemas.push('O coeficiente B deve ser maior que zero.');
  if (!numeroFinito(cc) || cc <= 0 || cc > 1) problemas.push('A umidade na capacidade de campo deve estar entre 0 e 1.');
  if (!numeroFinito(area.planta.prof_raiz_mm) || area.planta.prof_raiz_mm <= 0) problemas.push('A profundidade radicular deve ser maior que zero.');
  if (!numeroFinito(ea) || ea <= 0 || ea > 1) problemas.push('A eficiência de aplicação deve estar entre 0 e 1.');
  if (!numeroFinito(ip) || ip <= 0) problemas.push('A intensidade de aplicação deve ser maior que zero.');
  if (!numeroFinito(pam) || pam <= 0 || pam > 1) problemas.push('A fração de área molhada deve estar entre 0 e 1.');
  if (area.tensiometros.length === 0) problemas.push('Cadastre ao menos um tensiômetro.');

  const ids = new Set<string>();
  area.tensiometros.forEach((sensor, indice) => {
    const nome = `Tensiômetro ${indice + 1}`;
    if (ids.has(sensor.id)) problemas.push(`${nome} possui identificador duplicado.`);
    ids.add(sensor.id);
    if (!numeroFinito(sensor.prof_cm) || sensor.prof_cm < 0) problemas.push(`${nome}: profundidade de instalação inválida.`);
    if (!numeroFinito(sensor.camada_inicio_cm) || sensor.camada_inicio_cm < 0) problemas.push(`${nome}: início da camada inválido.`);
    if (!numeroFinito(sensor.camada_fim_cm) || sensor.camada_fim_cm <= sensor.camada_inicio_cm) problemas.push(`${nome}: o fim da camada deve ser maior que o início.`);
    if (!sensorEhControle(sensor) && (!numeroFinito(sensor.tensao_critica) || sensor.tensao_critica <= 0)) {
      problemas.push(`${nome}: informe uma tensão crítica maior que zero para o sensor de decisão.`);
    }
  });

  if (area.tensiometros.length > 0 && !area.tensiometros.some(sensor => !sensorEhControle(sensor))) {
    problemas.push('Cadastre ao menos um tensiômetro de decisão.');
  }

  if (numeroFinito(area.planta.prof_raiz_mm) && area.planta.prof_raiz_mm > 0) {
    const faixasNaRaiz = area.tensiometros
      .map(sensor => ({
        inicio: Math.max(0, sensor.camada_inicio_cm * 10),
        fim: Math.min(area.planta.prof_raiz_mm, sensor.camada_fim_cm * 10),
      }))
      .filter(faixa => numeroFinito(faixa.inicio) && numeroFinito(faixa.fim) && faixa.fim > faixa.inicio)
      .sort((a, b) => a.inicio - b.inicio);
    let coberturaAteMm = 0;
    let possuiLacuna = false;
    for (const faixa of faixasNaRaiz) {
      if (faixa.inicio > coberturaAteMm) possuiLacuna = true;
      coberturaAteMm = Math.max(coberturaAteMm, faixa.fim);
    }
    if (possuiLacuna || coberturaAteMm < area.planta.prof_raiz_mm) {
      problemas.push('As camadas monitoradas devem cobrir toda a zona radicular, sem lacunas.');
    }
  }

  if (leituras) {
    const leiturasPorSensor = new Map(leituras.map(leitura => [leitura.tensiometro_id, leitura.leitura_kpa]));
    area.tensiometros.forEach((sensor, indice) => {
      const valor = leiturasPorSensor.get(sensor.id);
      if (valor === undefined) problemas.push(`Falta a leitura do tensiômetro ${indice + 1}.`);
      else if (!numeroFinito(valor) || valor < 0) problemas.push(`A leitura do tensiômetro ${indice + 1} deve ser um número maior ou igual a zero.`);
    });
  }

  return problemas;
}

function calcularUmidadeAtual(area: Area, tensaoKpa: number) {
  const psi = Math.max(tensaoKpa, 0.1);
  return Math.max(0, area.solo.coef_a * Math.pow(psi, -area.solo.coef_b));
}

function formatarTempo(horasDecimais: number): string {
  const minutosTotais = Math.max(1, Math.round(horasDecimais * 60));
  const horas = Math.floor(minutosTotais / 60);
  const minutos = minutosTotais % 60;

  if (horas > 0 && minutos > 0) return `Irrigar por ${horas}h e ${minutos}min`;
  if (horas > 0) return `Irrigar por ${horas}h`;
  return `Irrigar por ${minutos}min`;
}

export function calcularIrrigacao(area: Area, leituras: LeituraValor[]): ResultadoIrrigacao {
  const problemas = validarParametrosIrrigacao(area, leituras);
  if (problemas.length > 0) throw new ErroCalculoIrrigacao(problemas);

  const leiturasPorSensor = new Map(leituras.map(leitura => [leitura.tensiometro_id, leitura.leitura_kpa]));
  const sensoresDecisao = area.tensiometros.filter(sensor => !sensorEhControle(sensor));
  const desviosDoGatilho = sensoresDecisao.map(sensor => leiturasPorSensor.get(sensor.id)! - sensor.tensao_critica);
  const tensaoDecisaoKpa = sensoresDecisao.reduce((soma, sensor) => soma + leiturasPorSensor.get(sensor.id)!, 0) / sensoresDecisao.length;
  const tensaoCriticaKpa = sensoresDecisao.reduce((soma, sensor) => soma + sensor.tensao_critica, 0) / sensoresDecisao.length;
  const atingiuGatilho = desviosDoGatilho.reduce((soma, desvio) => soma + desvio, 0) / desviosDoGatilho.length >= 0;

  if (!atingiuGatilho) {
    return {
      necessitaIrrigacao: false,
      tempoHoras: 0,
      mensagem: 'Tensão abaixo do limite de decisão. Não irrigar hoje.',
      laminaLiquidaMm: 0,
      laminaBrutaMm: 0,
      tensaoDecisaoKpa,
      tensaoCriticaKpa,
      umidadeMedia: null,
      camadas: [],
    };
  }

  const profundidadeRaizMm = area.planta.prof_raiz_mm;
  const sensoresComFaixa = area.tensiometros
    .map(sensor => ({
      sensor,
      inicioMm: Math.max(0, sensor.camada_inicio_cm * 10),
      fimMm: Math.min(profundidadeRaizMm, sensor.camada_fim_cm * 10),
      umidade: calcularUmidadeAtual(area, leiturasPorSensor.get(sensor.id)!),
    }))
    .filter(item => item.fimMm > item.inicioMm);

  if (sensoresComFaixa.length === 0) {
    throw new ErroCalculoIrrigacao(['Nenhuma camada dos tensiômetros intercepta a zona radicular.']);
  }

  // Intervalos não sobrepostos impedem que repetições em setores diferentes
  // sejam somadas como se fossem novas camadas verticais.
  const limites = Array.from(new Set(sensoresComFaixa.flatMap(item => [item.inicioMm, item.fimMm]))).sort((a, b) => a - b);
  const camadas: ResultadoCamadaIrrigacao[] = [];

  for (let indice = 0; indice < limites.length - 1; indice += 1) {
    const inicioMm = limites[indice];
    const fimMm = limites[indice + 1];
    const meioMm = (inicioMm + fimMm) / 2;
    const sensoresDoIntervalo = sensoresComFaixa.filter(item => item.inicioMm <= meioMm && item.fimMm >= meioMm);
    if (sensoresDoIntervalo.length === 0) continue;

    const umidadeAtual = sensoresDoIntervalo.reduce((soma, item) => soma + item.umidade, 0) / sensoresDoIntervalo.length;
    const espessuraMm = fimMm - inicioMm;
    const laminaLiquidaMm = Math.max(0, (area.solo.umidade_cc - umidadeAtual) * espessuraMm);
    camadas.push({ inicioMm, fimMm, espessuraMm, umidadeAtual, laminaLiquidaMm, sensoresConsiderados: sensoresDoIntervalo.length });
  }

  const deficitPerfilMm = camadas.reduce((soma, camada) => soma + camada.laminaLiquidaMm, 0);
  const laminaLiquidaMm = deficitPerfilMm * area.irrigacao.pam;
  const laminaBrutaMm = laminaLiquidaMm / area.irrigacao.eficiencia_ea;
  const tempoHoras = laminaBrutaMm / area.irrigacao.vazao_ip;
  const espessuraMonitorada = camadas.reduce((soma, camada) => soma + camada.espessuraMm, 0);
  const umidadeMedia = espessuraMonitorada > 0
    ? camadas.reduce((soma, camada) => soma + camada.umidadeAtual * camada.espessuraMm, 0) / espessuraMonitorada
    : null;

  if (laminaLiquidaMm <= 0) {
    return {
      necessitaIrrigacao: false,
      tempoHoras: 0,
      mensagem: 'O perfil monitorado está na capacidade de campo. Não irrigar hoje.',
      laminaLiquidaMm,
      laminaBrutaMm,
      tensaoDecisaoKpa,
      tensaoCriticaKpa,
      umidadeMedia,
      camadas,
    };
  }

  return {
    necessitaIrrigacao: true,
    tempoHoras,
    mensagem: formatarTempo(tempoHoras),
    laminaLiquidaMm,
    laminaBrutaMm,
    tensaoDecisaoKpa,
    tensaoCriticaKpa,
    umidadeMedia,
    camadas,
  };
}
