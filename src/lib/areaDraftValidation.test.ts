import assert from 'node:assert/strict';
import test from 'node:test';
import { temDadosMinimosParaRascunho } from './areaDraftValidation';

const formData = {
  nome: 'Talhão Norte',
  produtor_id: 'produtor-1',
  cultura: 'Milho',
  prof_raiz_mm: '600',
};

test('allows draft saving when all step-one fields are completed', () => {
  assert.equal(temDadosMinimosParaRascunho(formData), true);
});

test('requires a non-empty area name, producer, and crop', () => {
  assert.equal(temDadosMinimosParaRascunho({ ...formData, nome: '  ' }), false);
  assert.equal(temDadosMinimosParaRascunho({ ...formData, produtor_id: '' }), false);
  assert.equal(temDadosMinimosParaRascunho({ ...formData, cultura: ' ' }), false);
});

test('requires a numeric root depth between 50 and 2000 mm', () => {
  assert.equal(temDadosMinimosParaRascunho({ ...formData, prof_raiz_mm: '' }), false);
  assert.equal(temDadosMinimosParaRascunho({ ...formData, prof_raiz_mm: 'abc' }), false);
  assert.equal(temDadosMinimosParaRascunho({ ...formData, prof_raiz_mm: '49' }), false);
  assert.equal(temDadosMinimosParaRascunho({ ...formData, prof_raiz_mm: '2001' }), false);
  assert.equal(temDadosMinimosParaRascunho({ ...formData, prof_raiz_mm: '50' }), true);
  assert.equal(temDadosMinimosParaRascunho({ ...formData, prof_raiz_mm: '2000' }), true);
});
