import type { AreaDraft } from '../types';
import { parseNumeroLocalizado } from './numberFormat';

type MinimumDraftFormData = Pick<
  AreaDraft['formData'],
  'nome' | 'produtor_id' | 'cultura' | 'prof_raiz_mm'
>;

export function temDadosMinimosParaRascunho(formData: MinimumDraftFormData) {
  const profundidade = parseNumeroLocalizado(formData.prof_raiz_mm);
  return Boolean(
    formData.nome.trim()
    && formData.produtor_id.trim()
    && formData.cultura.trim()
    && Number.isFinite(profundidade)
    && profundidade >= 50
    && profundidade <= 2000,
  );
}
