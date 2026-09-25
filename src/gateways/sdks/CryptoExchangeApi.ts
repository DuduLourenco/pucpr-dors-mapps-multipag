import { randomBytes } from 'node:crypto';
import { simularWebhook } from './sandbox';

/**
 * ⚠️ SIMULAÇÃO de biblioteca de terceiros: exchange de criptomoedas.
 * Não podemos alterá-la.
 *
 * Incompatibilidades com o nosso GatewayPagamento:
 *  - não recebe reais: a fatura é na moeda cripto (string com 8 casas)
 *  - precisamos consultar a cotação antes (getTicker)
 *  - estados "PENDING | PAID | EXPIRED"
 *  - webhook chega como { event: "invoice.paid", data: { invoice_id, ... } }
 */
export type Asset = 'BTC' | 'ETH' | 'USDT';

export interface Ticker {
  pair: `${Asset}-BRL`;
  last: string;
}

export interface Invoice {
  invoice_id: string;
  asset: Asset;
  address: string;
  amount: string;
  state: 'PENDING' | 'PAID' | 'EXPIRED';
  expires_at: string;
}

export interface ExchangeWebhookPayload {
  event: 'invoice.paid' | 'invoice.expired';
  data: { invoice_id: string; state: Invoice['state']; amount: string };
}

const COTACOES: Record<Asset, string> = { BTC: '392373.36', ETH: '14250.10', USDT: '5.42' };

export class CryptoExchangeApi {
  private readonly apiKey: string;
  private readonly opcoes: { callbackUrl: string; atrasoLiquidacaoMs: number };

  constructor(apiKey: string, opcoes: { callbackUrl: string; atrasoLiquidacaoMs: number }) {
    this.apiKey = apiKey;
    this.opcoes = opcoes;
  }

  async getTicker(pair: `${Asset}-BRL`): Promise<Ticker> {
    return { pair, last: COTACOES[pair.split('-')[0] as Asset] };
  }

  async createInvoice(params: { asset: Asset; amount: string; memo?: string }): Promise<Invoice> {
    const invoice: Invoice = {
      invoice_id: `inv_${randomBytes(6).toString('hex')}`,
      asset: params.asset,
      address: params.asset === 'BTC' ? `bc1q${randomBytes(19).toString('hex')}` : `0x${randomBytes(20).toString('hex')}`,
      amount: params.amount,
      state: 'PENDING',
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };
    const payload: ExchangeWebhookPayload = {
      event: 'invoice.paid',
      data: { invoice_id: invoice.invoice_id, state: 'PAID', amount: invoice.amount },
    };
    if (this.apiKey) simularWebhook(this.opcoes.callbackUrl, payload, this.opcoes.atrasoLiquidacaoMs);
    return invoice;
  }
}
