import { AppConfigSingleton } from '../config/AppConfigSingleton';
import { ErroDeNegocio } from '../shared/erros';
import type { GatewayPagamento, NotificacaoGateway, RequisicaoGateway, RespostaGateway } from './GatewayPagamento';
import { CryptoExchangeApi, type ExchangeWebhookPayload } from './sdks/CryptoExchangeApi';

/**
 * PADRÃO ADAPTER (exemplo 3 de 3): exchange de cripto -> GatewayPagamento
 *
 * O caso de adaptação mais "pesado": além de renomear campos, o adapter
 * consulta a cotação e converte o valor em reais para a moeda escolhida
 * antes de criar a fatura. Para quem chama, é só mais um cobrar(valorEmReais).
 */
export class CriptoGatewayAdapter implements GatewayPagamento {
  readonly nome = 'Criptomoedas (Exchange)';
  private readonly api: CryptoExchangeApi;

  constructor(api?: CryptoExchangeApi) {
    const config = AppConfigSingleton.instancia();
    this.api =
      api ??
      new CryptoExchangeApi(config.credenciais.criptoApiKey, {
        callbackUrl: config.urlWebhook('cripto'),
        atrasoLiquidacaoMs: config.atrasoLiquidacaoMs,
      });
  }

  async cobrar(req: RequisicaoGateway): Promise<RespostaGateway> {
    const moeda = req.criptomoeda ?? 'BTC';
    const ticker = await this.api.getTicker(`${moeda}-BRL`);
    const quantidade = (req.valor / Number(ticker.last)).toFixed(moeda === 'USDT' ? 2 : 8);

    const invoice = await this.api.createInvoice({ asset: moeda, amount: quantidade, memo: req.referencia });

    const situacoes = { PENDING: 'pendente', PAID: 'aprovado', EXPIRED: 'recusado' } as const;
    return {
      situacao: situacoes[invoice.state],
      transacaoExternaId: invoice.invoice_id,
      instrucoes: invoice.address,
      mensagem: invoice.state === 'EXPIRED' ? 'A fatura cripto expirou.' : undefined,
      detalhes: { criptomoeda: moeda, cotacao: Number(ticker.last), quantidade: invoice.amount },
    };
  }

  traduzirNotificacao(payload: unknown): NotificacaoGateway {
    const evento = payload as ExchangeWebhookPayload;
    if (!evento?.data?.invoice_id) throw new ErroDeNegocio('WEBHOOK_INVALIDO', 'Payload da exchange inválido.', 400);
    return {
      transacaoExternaId: evento.data.invoice_id,
      aprovado: evento.event === 'invoice.paid' && evento.data.state === 'PAID',
      mensagem: evento.event === 'invoice.expired' ? 'A fatura cripto expirou sem pagamento.' : undefined,
    };
  }
}
