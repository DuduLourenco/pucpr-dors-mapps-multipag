import { randomBytes } from 'node:crypto';

/**
 * ⚠️ SIMULAÇÃO de biblioteca de terceiros: adquirente de cartão
 * internacional (estilo Stripe/Adyen). Não podemos alterá-la.
 *
 * Incompatibilidades com o nosso GatewayPagamento:
 *  - API em inglês, valor em CENTAVOS inteiros (amount_cents)
 *  - validade em { exp_month, exp_year } separados
 *  - resultado em "outcome: approved | declined" + decline_code em inglês
 */
export interface CreateChargeParams {
  amount_cents: number;
  currency: 'BRL' | 'USD';
  installments: number;
  card: { number: string; holder_name: string; exp_month: number; exp_year: number; cvc: string };
  description?: string;
  metadata?: Record<string, string>;
}

export interface Charge {
  id: string;
  outcome: 'approved' | 'declined';
  decline_code?: 'insufficient_funds' | 'invalid_card' | 'expired_card' | 'do_not_honor';
  card_last4: string;
  card_brand: 'visa' | 'mastercard' | 'amex' | 'elo' | 'unknown';
}

export class CardAcquirerClient {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async createCharge(params: CreateChargeParams): Promise<Charge> {
    const base = {
      id: `ch_${randomBytes(8).toString('hex')}`,
      card_last4: params.card.number.slice(-4),
      card_brand: CardAcquirerClient.brand(params.card.number),
    };
    const agora = new Date();
    const expirado =
      params.card.exp_year < agora.getFullYear() ||
      (params.card.exp_year === agora.getFullYear() && params.card.exp_month < agora.getMonth() + 1);

    if (!this.apiKey.startsWith('sk_')) return { ...base, outcome: 'declined', decline_code: 'do_not_honor' };
    // Sandbox: cartões terminados em 0000 são sempre recusados por saldo (para testar a recusa).
    if (params.card.number.endsWith('0000')) return { ...base, outcome: 'declined', decline_code: 'insufficient_funds' };
    if (!CardAcquirerClient.luhn(params.card.number)) return { ...base, outcome: 'declined', decline_code: 'invalid_card' };
    if (expirado) return { ...base, outcome: 'declined', decline_code: 'expired_card' };
    return { ...base, outcome: 'approved' };
  }

  private static brand(numero: string): Charge['card_brand'] {
    if (/^4/.test(numero)) return 'visa';
    if (/^5[1-5]/.test(numero)) return 'mastercard';
    if (/^3[47]/.test(numero)) return 'amex';
    if (/^(4011|4389|5041|6362|6363)/.test(numero)) return 'elo';
    return 'unknown';
  }

  private static luhn(numero: string): boolean {
    if (!/^\d{13,19}$/.test(numero)) return false;
    let soma = 0;
    [...numero].reverse().forEach((c, i) => {
      let d = Number(c);
      if (i % 2 === 1) d = d * 2 > 9 ? d * 2 - 9 : d * 2;
      soma += d;
    });
    return soma % 10 === 0;
  }
}
