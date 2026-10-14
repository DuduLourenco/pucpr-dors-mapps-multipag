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

// ------------------------------------------------------------- CPF e CNPJ
// Mesmas funções que o back-end usa (src/domain/Cpf.ts e Cnpj.ts): a regra não é repetida aqui.
export { cnpjValido, cpfValido, mascaraCnpj, mascaraCpf } from 'multipag-validador-documentos';

// ------------------------------------------------------------- máscaras
export const soDigitos = (v: string) => v.replace(/\D/g, '');

export function mascaraData(v: string) {
  return soDigitos(v).slice(0, 8).replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})(\d)/, '$1/$2');
}

/** "14/10/1991" -> "1991-10-14" */
export const dataParaIso = (v: string) => {
  const [d, m, a] = v.split('/');
  return a?.length === 4 ? `${a}-${m}-${d}` : '';
};

export const emailValido = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
