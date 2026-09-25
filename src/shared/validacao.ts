import { ErroDeNegocio } from './erros';

/** Pequenos validadores reaproveitados por todos os services. */

export function texto(valor: unknown, campo: string, opcoes: { min?: number; max?: number } = {}): string {
  const { min = 1, max = 255 } = opcoes;
  const t = typeof valor === 'string' ? valor.trim() : '';
  if (t.length < min || t.length > max) {
    throw new ErroDeNegocio('CAMPO_INVALIDO', `O campo "${campo}" deve ter entre ${min} e ${max} caracteres.`);
  }
  return t;
}

export function textoOpcional(valor: unknown, campo: string, max = 255): string | undefined {
  if (valor === undefined || valor === null || valor === '') return undefined;
  return texto(valor, campo, { min: 1, max });
}

export function email(valor: unknown, campo = 'email'): string {
  const e = texto(valor, campo, { min: 5, max: 150 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
    throw new ErroDeNegocio('EMAIL_INVALIDO', 'E-mail inválido.');
  }
  return e;
}

export function valorMonetario(valor: unknown, campo = 'valor'): number {
  const n = typeof valor === 'string' ? Number(valor.replace(',', '.')) : Number(valor);
  if (!Number.isFinite(n) || n <= 0) {
    throw new ErroDeNegocio('VALOR_INVALIDO', `O campo "${campo}" deve ser um valor maior que zero.`);
  }
  return arredondar(n);
}

export function data(valor: unknown, campo: string): string {
  const t = texto(valor, campo, { min: 10, max: 10 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t) || Number.isNaN(Date.parse(t))) {
    throw new ErroDeNegocio('DATA_INVALIDA', `O campo "${campo}" deve estar no formato AAAA-MM-DD.`);
  }
  return t;
}

/** Arredonda para centavos, evitando lixo de ponto flutuante (0.1 + 0.2). */
export function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}
