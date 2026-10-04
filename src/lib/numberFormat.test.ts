import assert from 'node:assert/strict';
import test from 'node:test';
import { formatarNumeroLocalizado, parseNumeroLocalizado } from './numberFormat';

test('interpreta vírgula e ponto como separador decimal', () => {
  assert.equal(parseNumeroLocalizado('0,85'), 0.85);
  assert.equal(parseNumeroLocalizado('0.85'), 0.85);
});

test('interpreta separadores de milhar e decimal combinados', () => {
  assert.equal(parseNumeroLocalizado('1.234,56'), 1234.56);
  assert.equal(parseNumeroLocalizado('1,234.56'), 1234.56);
});

test('formata entradas numéricas com vírgula decimal e sem agrupamento', () => {
  assert.equal(formatarNumeroLocalizado('0.280'), '0,28');
  assert.equal(formatarNumeroLocalizado('1234.56'), '1234,56');
});

test('mantém valores vazios ou inválidos para não os converter silenciosamente', () => {
  assert.equal(Number.isNaN(parseNumeroLocalizado('')), true);
  assert.equal(Number.isNaN(parseNumeroLocalizado('abc')), true);
  assert.equal(formatarNumeroLocalizado('abc'), 'abc');
});
