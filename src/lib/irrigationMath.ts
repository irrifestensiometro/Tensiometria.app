import { Area, LeituraValor } from '../types';

export function calcularIrrigacao(area: Area, leituras: LeituraValor[]) {
  const { coef_a: a, coef_b: b, umidade_cc } = area.solo;
  const Ea = area.irrigacao.eficiencia_ea;
  const Ip = area.irrigacao.vazao_ip;
  const PAM = area.irrigacao.pam;

  if (leituras.length === 0) {
    return { necessitaIrrigacao: false, tempoHoras: 0, mensagem: 'Sem leituras' };
  }

  // 1. Regra de Parada (Gatilho)
  const sensorControle = area.tensiometros.find(t => t.is_controle);
  if (sensorControle) {
    const leituraControle = leituras.find(l => l.tensiometro_id === sensorControle.id);
    if (leituraControle && leituraControle.leitura_kpa < sensorControle.tensao_critica) {
      return { necessitaIrrigacao: false, tempoHoras: 0, mensagem: 'Solo Úmido. Não irrigar hoje.' };
    }
  }

  let LL_total = 0;

  // 2, 3 e 4. Lâmina Líquida por Camada
  area.tensiometros.forEach(sensor => {
    const leitura = leituras.find(l => l.tensiometro_id === sensor.id);
    if (leitura) {
      const psi = Math.max(leitura.leitura_kpa, 0.1);
      
      // Umidade Atual por Camada (θ_atual_i)
      const umidade_atual = a * Math.pow(psi, -b);
      
      // Espessura da Camada (Z_i) em mm
      const Z_i = (sensor.camada_fim_cm - sensor.camada_inicio_cm) * 10;
      
      // Lâmina Líquida da Camada (LL_i)
      let LL_i = (umidade_cc - umidade_atual) * Z_i;
      
      if (umidade_atual >= umidade_cc) {
        LL_i = 0;
      }
      
      LL_total += Math.max(0, LL_i);
    }
  });

  // 5. Lâmina Líquida Total com PAM
  LL_total = LL_total * PAM;

  if (LL_total <= 0) {
    return { necessitaIrrigacao: false, tempoHoras: 0, mensagem: 'Solo Úmido. Não irrigar hoje.' };
  }

  // 6. Lâmina Bruta (LB)
  const LB = LL_total / Ea;

  // 7. Tempo de Irrigação (Ti) em horas
  const Ti = LB / Ip;

  return {
    necessitaIrrigacao: true,
    tempoHoras: Ti,
    mensagem: formatarTempo(Ti)
  };
}

function formatarTempo(horasDecimais: number): string {
    const horas = Math.floor(horasDecimais);
    const minutos = Math.round((horasDecimais - horas) * 60);
    
    if (horas > 0 && minutos > 0) return `Irrigar por ${horas}h e ${minutos}min`;
    if (horas > 0) return `Irrigar por ${horas}h`;
    return `Irrigar por ${minutos}min`;
}
