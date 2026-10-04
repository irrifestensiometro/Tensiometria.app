export function normalizarCpf(value: string) {
  return value.replace(/\D/g, '');
}

export function validarCpf(value: string) {
  const cpf = normalizarCpf(value);
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;

  const calculateDigit = (digits: string, factor: number) => {
    const sum = [...digits].reduce(
      (total, digit) => total + Number(digit) * factor--,
      0,
    );
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculateDigit(cpf.slice(0, 9), 10) === Number(cpf[9])
    && calculateDigit(cpf.slice(0, 10), 11) === Number(cpf[10]);
}

export function formatarCpf(value: string) {
  const cpf = normalizarCpf(value);
  if (cpf.length !== 11) return value;
  return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
}
