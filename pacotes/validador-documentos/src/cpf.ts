/** Deixa só os dígitos: "529.982.247-25" -> "52998224725". */
export function limparCpf(entrada: unknown): string {
  return String(entrada ?? '').replace(/\D/g, '');
}

/**
 * Confere o tamanho, recusa sequências repetidas (111.111.111-11) e calcula
 * os dois dígitos verificadores. Aceita o CPF com ou sem pontuação.
 */
export function cpfValido(entrada: unknown): boolean {
  const digitos = limparCpf(entrada);
  if (digitos.length !== 11 || /^(\d)\1{10}$/.test(digitos)) return false;
  const digitoVerificador = (tamanho: number) => {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) soma += Number(digitos[i]) * (tamanho + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return digitoVerificador(9) === Number(digitos[9]) && digitoVerificador(10) === Number(digitos[10]);
}

/** "52998224725" -> "529.982.247-25". Não valida: sem os 11 dígitos, devolve só os dígitos. */
export function formatarCpf(entrada: unknown): string {
  return limparCpf(entrada).replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

/** "***.982.247-**": para exibir em telas públicas sem expor o CPF inteiro. */
export function ocultarCpf(entrada: unknown): string {
  const digitos = limparCpf(entrada);
  return `***.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-**`;
}

/** Máscara de campo de formulário: pontua enquanto a pessoa digita ("5299" -> "529.9"). */
export function mascaraCpf(digitando: unknown): string {
  return limparCpf(digitando).slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}
