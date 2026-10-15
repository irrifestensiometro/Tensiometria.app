import assert from 'node:assert/strict';
import test from 'node:test';
import type { Area } from '../types';
import { listarCulturasMaisUsadas, MIN_CULTURE_RECOMMENDATION_COUNT } from './cultureRecommendations';

function area(cultura: string, prof_raiz_mm: number): Area {
  return {
    id: `${cultura}-${prof_raiz_mm}`,
    agronomo_id: 'agronomo-1',
    produtor_id: 'produtor-1',
    nome: 'Área de teste',
    cultura,
    solo: { coef_a: 0.4, coef_b: -0.1, umidade_cc: 0.3 },
    planta: { prof_raiz_mm },
    irrigacao: { eficiencia_ea: 0.8, vazao_ip: 10, pam: 1 },
    tensiometros: [],
  };
}

test('recommends a culture and root-depth pair after five saved areas', () => {
  const areas = Array.from(
    { length: MIN_CULTURE_RECOMMENDATION_COUNT },
    () => area('Milho', 600),
  );

  assert.deepEqual(listarCulturasMaisUsadas(areas), [
    { cultura: 'Milho', prof_raiz_mm: 600, quantidade: 5 },
  ]);
  assert.deepEqual(listarCulturasMaisUsadas(areas.slice(1)), []);
});

test('groups culture names ignoring case, accents, and extra spaces', () => {
  const areas = [
    area('Café', 800),
    area(' cafe ', 800),
    area('CAFÉ', 800),
    area('Cafe', 800),
    area('  café  ', 800),
  ];

  assert.deepEqual(listarCulturasMaisUsadas(areas), [
    { cultura: 'Café', prof_raiz_mm: 800, quantidade: 5 },
  ]);
});

test('ranks most-used pairs and ignores different root depths', () => {
  const areas = [
    ...Array.from({ length: 6 }, () => area('Soja', 400)),
    ...Array.from({ length: 5 }, () => area('Milho', 600)),
    ...Array.from({ length: 4 }, () => area('Trigo', 400)),
  ];

  assert.deepEqual(
    listarCulturasMaisUsadas(areas).map(({ cultura, prof_raiz_mm }) => [cultura, prof_raiz_mm]),
    [['Soja', 400], ['Milho', 600]],
  );
});
