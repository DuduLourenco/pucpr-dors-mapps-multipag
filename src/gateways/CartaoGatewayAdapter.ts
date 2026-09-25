import { AppConfigSingleton } from '../config/AppConfigSingleton';
import { ErroDeNegocio } from '../shared/erros';
import type { GatewayPagamento, NotificacaoGateway, RequisicaoGateway, RespostaGateway } from './GatewayPagamento';
import { CardAcquirerClient, type Charge } from './sdks/CardAcquirerClient';

/**
 * PADRÃO ADAPTER (exemplo 2 de 3): adquirente de cartão -> GatewayPagamento
 *
 * Converte reais para centavos, separa a validade "MM/AA" em mês/ano,
 * monta o objeto em inglês que a adquirente espera e traduz os códigos de
 * recusa para mensagens em português.
 */
export class CartaoGatewayAdapter implements GatewayPagamento {
  readonly nome = 'Cartão de crédito (Adquirente)';
  private readonly client: CardAcquirerClient;

  private static readonly MENSAGENS: Record<NonNullable<Charge['decline_code']>, string> = {
    insufficient_funds: 'Cartão recusado: saldo ou limite insuficiente.',
    invalid_card: 'Cartão recusado: número inválido.',
    expired_card: 'Cartão recusado: cartão vencido.',
    do_not_honor: 'Cartão recusado pelo banco emissor.',
  };

  constructor(client = new CardAcquirerClient(AppConfigSingleton.instancia().credenciais.cartaoApiKey)) {
    this.client = client;
  }

  async cobrar(req: RequisicaoGateway): Promise<RespostaGateway> {
    if (!req.cartao) throw new ErroDeNegocio('CARTAO_OBRIGATORIO', 'Informe os dados do cartão.');
    const [mes, ano] = req.cartao.validade.split('/').map(Number);

    const charge = await this.client.createCharge({
      amount_cents: Math.round(req.valor * 100),
      currency: 'BRL',
      installments: req.cartao.parcelas,
      card: {
        number: req.cartao.numero,
        holder_name: req.cartao.nomeImpresso,
        exp_month: mes,
        exp_year: 2000 + ano,
        cvc: req.cartao.cvv,
      },
      description: req.descricao,
      metadata: { referencia: req.referencia, cpf: req.cpfPagador },
    });

    const aprovado = charge.outcome === 'approved';
    return {
      situacao: aprovado ? 'aprovado' : 'recusado',
      transacaoExternaId: charge.id,
      mensagem: aprovado ? undefined : CartaoGatewayAdapter.MENSAGENS[charge.decline_code ?? 'do_not_honor'],
      detalhes: { cartaoFinal: charge.card_last4, bandeira: charge.card_brand, parcelas: req.cartao.parcelas },
    };
  }

  /** Cartão é aprovado/recusado na hora; a adquirente não manda webhook de liquidação. */
  traduzirNotificacao(): NotificacaoGateway {
    throw new ErroDeNegocio('WEBHOOK_NAO_SUPORTADO', 'Cartão não usa confirmação assíncrona.', 400);
  }
}
