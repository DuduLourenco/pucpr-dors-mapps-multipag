/** Deixa só letras maiúsculas e dígitos: "12.abc.345/01de-35" -> "12ABC34501DE35". */
export function limparCnpj(entrada: unknown): string {
  return String(entrada ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '');
}

/**
 * Valida o CNPJ numérico e o alfanumérico (letras nas 12 primeiras posições,
 * formato da Receita Federal a partir de julho/2026). Aceita com ou sem pontuação.
 */
export function cnpjValido(entrada: unknown): boolean {
  const cnpj = limparCnpj(entrada);
  if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
  // Regra da Receita: cada caractere vale (código ASCII - 48), então '0'..'9' = 0..9 e 'A' = 17.
  const digitoVerificador = (base: string) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = [...base].reduce((acumulado, caractere, i) => acumulado + (caractere.charCodeAt(0) - 48) * pesos[i], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const dv1 = digitoVerificador(cnpj.slice(0, 12));
  const dv2 = digitoVerificador(cnpj.slice(0, 12) + dv1);
  return cnpj.endsWith(`${dv1}${dv2}`);
}

/** "12ABC34501DE35" -> "12.ABC.345/01DE-35". Não valida: sem os 14 caracteres, devolve o texto limpo. */
export function formatarCnpj(entrada: unknown): string {
  return limparCnpj(entrada).replace(/^(.{2})(.{3})(.{3})(.{4})(.{2})$/, '$1.$2.$3/$4-$5');
}

/** Máscara de campo de formulário: pontua enquanto a pessoa digita ("12abc3" -> "12.ABC.3"). */
export function mascaraCnpj(digitando: unknown): string {
  return limparCnpj(digitando).slice(0, 14)
    .replace(/^(.{2})(.)/, '$1.$2').replace(/^(.{2}\..{3})(.)/, '$1.$2')
    .replace(/^(.{2}\..{3}\..{3})(.)/, '$1/$2').replace(/^(.{2}\..{3}\..{3}\/.{4})(.)/, '$1-$2');
}
