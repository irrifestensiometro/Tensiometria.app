import type { Area } from '../types';

export const MIN_CULTURE_RECOMMENDATION_COUNT = 5;
const MAX_CULTURE_RECOMMENDATIONS = 5;

export interface CultureRecommendation {
  cultura: string;
  prof_raiz_mm: number;
  quantidade: number;
}

function normalizarCultura(cultura: string) {
  return cultura
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('pt-BR');
}

export function listarCulturasMaisUsadas(areas: Area[]): CultureRecommendation[] {
  const contagens = new Map<string, CultureRecommendation>();

  for (const area of areas) {
    const cultura = area.cultura?.trim();
    const profRaiz = area.planta.prof_raiz_mm;
    if (!cultura || !Number.isFinite(profRaiz) || profRaiz <= 0) continue;

    const chave = `${normalizarCultura(cultura)}:${profRaiz}`;
    const recomendacao = contagens.get(chave);
    if (recomendacao) {
      recomendacao.quantidade += 1;
    } else {
      contagens.set(chave, { cultura, prof_raiz_mm: profRaiz, quantidade: 1 });
    }
  }

  return Array.from(contagens.values())
    .filter(({ quantidade }) => quantidade >= MIN_CULTURE_RECOMMENDATION_COUNT)
    .sort((a, b) =>
      b.quantidade - a.quantidade
      || a.cultura.localeCompare(b.cultura, 'pt-BR')
      || a.prof_raiz_mm - b.prof_raiz_mm,
    )
    .slice(0, MAX_CULTURE_RECOMMENDATIONS);
}
