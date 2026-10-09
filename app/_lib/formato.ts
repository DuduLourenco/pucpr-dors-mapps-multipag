/** Formatação, máscaras e validações compartilhadas por todas as telas. */
import type { MetodoPagamento } from './tipos';

// ------------------------------------------------------------- formatação
const formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** "R$ 4.280,50" (com espaço normal, para caber no estilo monoespaçado). */
export const moeda = (valor: number | null | undefined) => formatoMoeda.format(valor ?? 0).replace(/\s/g, ' ');

export const dataCurta = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '').replace(' de ', ' ');
export const hora = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
export const dataHora = (iso: string) => `${new Date(iso).toLocaleDateString('pt-BR')} ${hora(iso)}`;

export const NOMES_METODO: Record<MetodoPagamento, string> = { pix: 'Pix', cartao: 'Cartão', boleto: 'Boleto', cripto: 'Cripto' };

// ------------------------------------------------------------- máscaras
export const soDigitos = (v: string) => v.replace(/\D/g, '');

export function mascaraCpf(v: string) {
  return soDigitos(v).slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function mascaraCnpj(v: string) {
  const c = v.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 14);
  return c.replace(/^(.{2})(.)/, '$1.$2').replace(/^(.{2}\..{3})(.)/, '$1.$2').replace(/^(.{2}\..{3}\..{3})(.)/, '$1/$2').replace(/^(.{2}\..{3}\..{3}\/.{4})(.)/, '$1-$2');
}

export function mascaraData(v: string) {
  return soDigitos(v).slice(0, 8).replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})(\d)/, '$1/$2');
}

/** "14/10/1991" -> "1991-10-14" */
export const dataParaIso = (v: string) => {
  const [d, m, a] = v.split('/');
  return a?.length === 4 ? `${a}-${m}-${d}` : '';
};

export const emailValido = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/** Mesma regra do back (domain/Cpf.ts), para dar feedback antes de enviar. */
export function cpfValido(v: string) {
  const d = soDigitos(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (n: number) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

/** Aceita CNPJ numérico e alfanumérico (mesma regra de domain/Cnpj.ts). */
export function cnpjValido(v: string) {
  const c = v.toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (!/^[0-9A-Z]{12}\d{2}$/.test(c) || /^(\d)\1{13}$/.test(c)) return false;
  const dv = (base: string) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const r = [...base].reduce((s, ch, i) => s + (ch.charCodeAt(0) - 48) * pesos[i], 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = dv(c.slice(0, 12));
  return c.endsWith(`${d1}${dv(c.slice(0, 12) + d1)}`);
}
