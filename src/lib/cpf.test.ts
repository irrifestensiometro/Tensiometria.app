import assert from 'node:assert/strict';
import test from 'node:test';
import { formatarCpf, normalizarCpf, validarCpf } from './cpf';

test('normaliza e formata CPF', () => {
  assert.equal(normalizarCpf('529.982.247-25'), '52998224725');
  assert.equal(formatarCpf('52998224725'), '529.982.247-25');
});

test('valida CPF pelo dígito verificador', () => {
  assert.equal(validarCpf('529.982.247-25'), true);
  assert.equal(validarCpf('529.982.247-24'), false);
  assert.equal(validarCpf('111.111.111-11'), false);
  assert.equal(validarCpf('123'), false);
});
