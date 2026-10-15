export const DENSIDADE_APARENTE_REFERENCIA_SOLO = 1.2;

export function converterUmidadeGravimetricaParaVolumetrica(percentual: number) {
  return (percentual / 100) * DENSIDADE_APARENTE_REFERENCIA_SOLO;
}

export const UMIDADE_MEDIA_SOLO = {
  cc: 21,
  ccMin: 18,
  ccMax: 26,
  pmp: 9.5,
  pmpMin: 8,
  pmpMax: 12,
} as const;

export const REFERENCIAS_TEXTURAIS = [
  { id: 'muito-argilosa', nome: 'Muito argilosa' },
  { id: 'argilosa', nome: 'Argilosa' },
  { id: 'media', nome: 'Média' },
  { id: 'siltosa', nome: 'Siltosa' },
  { id: 'arenosa', nome: 'Arenosa' },
] as const;
