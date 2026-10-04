import assert from 'node:assert/strict';
import test from 'node:test';
import type { AreaDraft } from '../types';
import { desserializarRascunhoArea, serializarRascunhoArea } from './areaDraftCodec';

const draft: AreaDraft = {
  id: 'draft-1',
  agronomo_id: 'agronomist-1',
  step: 2,
  formData: {
    nome: 'Área teste',
    produtor_id: 'producer-1',
    coef_a: '',
    coef_b: '',
    umidade_cc: '',
    prof_raiz_mm: '',
    eficiencia_ea: '',
    vazao_ip: '',
    pam: '',
  },
  polygonPoints: [[-20.1, -40.2], [-20.2, -40.3]],
  culturaSugerida: '',
  setores: [],
  updated_at: 123,
};

test('serializes map points as objects accepted by Firestore', () => {
  const serialized = serializarRascunhoArea(draft);
  assert.deepEqual(serialized.polygonPoints, [
    { lat: -20.1, lng: -40.2 },
    { lat: -20.2, lng: -40.3 },
  ]);
  assert.equal(serialized.polygonPoints.some(Array.isArray), false);
});

test('restores Firestore map point objects to coordinate tuples', () => {
  const serialized = serializarRascunhoArea(draft);
  assert.deepEqual(desserializarRascunhoArea(serialized).polygonPoints, draft.polygonPoints);
});
