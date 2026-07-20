export interface Agronomo {
  id: string;
  nome: string;
  email: string;
  senha?: string;
}

export interface Produtor {
  id: string;
  nome: string;
  email: string;
  senha?: string;
  localizacao_sede?: { lat: number; lng: number };
}

export interface Tensiometro {
  id: string;
  prof_cm: number;
  setor?: string;
  camada_inicio_cm: number;
  camada_fim_cm: number;
  is_controle: boolean;
  tensao_critica: number;
}

export interface Area {
  id: string;
  agronomo_id: string;
  produtor_id: string;
  nome: string;
  poligono?: { lat: number; lng: number }[];
  solo: {
    coef_a: number;
    coef_b: number;
    umidade_cc: number; // Umidade na Capacidade de Campo
  };
  planta: {
    prof_raiz_mm: number; // Z (Profundidade da raiz em mm)
  };
  irrigacao: {
    eficiencia_ea: number; // Ea (Eficiência do sistema em decimal)
    vazao_ip: number; // Ip (Vazão/precipitação do sistema em mm/h)
    pam: number; // Porcentagem de Área Molhada (em decimal, ex: 0.7 para 70%)
  };
  tensiometros: Tensiometro[];
}

export interface LeituraValor {
  tensiometro_id: string;
  leitura_kpa: number;
}

export interface Leitura {
  id: string;
  area_id: string;
  data: string; // ISO string
  valores: LeituraValor[];
}
