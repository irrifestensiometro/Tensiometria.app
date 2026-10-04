export function parseNumeroLocalizado(valor: string) {
  const limpo = valor.trim().replace(/\s/g, '');
  if (!limpo) return Number.NaN;

  const ultimaVirgula = limpo.lastIndexOf(',');
  const ultimoPonto = limpo.lastIndexOf('.');
  const indiceDecimal = Math.max(ultimaVirgula, ultimoPonto);
  const inteiro = limpo.slice(0, indiceDecimal).replace(/[.,]/g, '');
  const decimal = indiceDecimal >= 0 ? limpo.slice(indiceDecimal + 1) : '';
  const normalizado = indiceDecimal >= 0
    ? `${inteiro || '0'}.${decimal}`
    : limpo;

  if (!/^[+-]?\d+(?:\.\d*)?$/.test(normalizado)) return Number.NaN;
  return Number(normalizado);
}

export function formatarNumeroLocalizado(valor: string) {
  const numero = parseNumeroLocalizado(valor);
  if (!Number.isFinite(numero)) return valor;
  return new Intl.NumberFormat('pt-BR', {
    useGrouping: false,
    maximumFractionDigits: 10,
  }).format(numero);
}
