export const METODOS_PAGAMENTO = ['pix', 'cartao', 'boleto', 'cripto'] as const;
export type MetodoPagamento = (typeof METODOS_PAGAMENTO)[number];

export const CRIPTOMOEDAS = ['BTC', 'ETH', 'USDT'] as const;
export type Criptomoeda = (typeof CRIPTOMOEDAS)[number];

export const RECORRENCIAS = ['unica', 'semanal', 'mensal', 'anual'] as const;
export type Recorrencia = (typeof RECORRENCIAS)[number];

export type TipoConta = 'pessoa_fisica' | 'empresa';
export type StatusCobranca = 'pendente' | 'paga' | 'expirada' | 'cancelada';
export type StatusPagamento = 'pendente' | 'confirmado' | 'falhou';
export type StatusSaque = 'solicitado' | 'processando' | 'concluido' | 'falhou';
export type TipoMovimentacao = 'entrada_pagamento' | 'saque';

export function ehUmDe<T extends string>(lista: readonly T[], valor: unknown): valor is T {
  return typeof valor === 'string' && (lista as readonly string[]).includes(valor);
}
