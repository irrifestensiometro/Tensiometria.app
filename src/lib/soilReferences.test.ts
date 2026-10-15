import assert from 'node:assert/strict';
import test from 'node:test';
import {
  converterUmidadeGravimetricaParaVolumetrica,
  REFERENCIAS_TEXTURAIS,
  UMIDADE_MEDIA_SOLO,
} from './soilReferences';

test('exposes the textural classes shown in the EMBRAPA triangle', () => {
  assert.deepEqual(
    REFERENCIAS_TEXTURAIS.map(({ nome }) => nome),
    ['Muito argilosa', 'Argilosa', 'Média', 'Siltosa', 'Arenosa'],
  );
});

test('converts the spreadsheet mean field capacity using the reference density', () => {
  assert.equal(UMIDADE_MEDIA_SOLO.cc, 21);
  assert.equal(converterUmidadeGravimetricaParaVolumetrica(UMIDADE_MEDIA_SOLO.cc), 0.252);
  assert.equal(converterUmidadeGravimetricaParaVolumetrica(UMIDADE_MEDIA_SOLO.ccMin), 0.216);
  assert.equal(converterUmidadeGravimetricaParaVolumetrica(UMIDADE_MEDIA_SOLO.ccMax), 0.312);
  assert.equal(UMIDADE_MEDIA_SOLO.pmp, 9.5);
  assert.ok(Math.abs(converterUmidadeGravimetricaParaVolumetrica(UMIDADE_MEDIA_SOLO.pmp) - 0.114) < 1e-12);
  assert.ok(Math.abs(converterUmidadeGravimetricaParaVolumetrica(UMIDADE_MEDIA_SOLO.pmpMin) - 0.096) < 1e-12);
  assert.ok(Math.abs(converterUmidadeGravimetricaParaVolumetrica(UMIDADE_MEDIA_SOLO.pmpMax) - 0.144) < 1e-12);
});
