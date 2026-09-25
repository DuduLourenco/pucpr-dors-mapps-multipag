import { AppConfigSingleton } from '../config/AppConfigSingleton';
import { ErroDeNegocio } from '../shared/erros';
import type { GatewayPagamento, NotificacaoGateway, RequisicaoGateway, RespostaGateway } from './GatewayPagamento';
import { BancoPixSdk, type PixWebhookPayload } from './sdks/BancoPixSdk';

/**
 * PADRÃO ADAPTER (exemplo 1 de 3): SDK Pix do banco -> GatewayPagamento
 *
 * Ida: converte reais (number) para o formato string do BACEN, move o CPF
 * para "devedor" e traduz "ATIVA" para situacao = pendente.
 * Volta: traduz o webhook { pix: [...] } do banco para NotificacaoGateway.
 * O restante do sistema reutiliza o SDK do banco sem saber que ele existe.
 */
export class PixGatewayAdapter implements GatewayPagamento {
  readonly nome = 'Pix (Banco Parceiro)';
  private readonly sdk: BancoPixSdk;
  private readonly chaveRecebedora = 'pagamentos@multipag.com.br';

  constructor(sdk?: BancoPixSdk) {
    const config = AppConfigSingleton.instancia();
    this.sdk =
      sdk ??
      new BancoPixSdk(config.credenciais.pixClientId, {
        webhookUrl: config.urlWebhook('pix'),
        atrasoLiquidacaoMs: config.atrasoLiquidacaoMs,
      });
  }

  async cobrar(req: RequisicaoGateway): Promise<RespostaGateway> {
    const resposta = await this.sdk.criarCobrancaImediata({
      calendario: { expiracao: 600 },
      devedor: { cpf: req.cpfPagador },
      valor: { original: req.valor.toFixed(2) },
      chave: this.chaveRecebedora,
      solicitacaoPagador: req.descricao.slice(0, 140),
      infoAdicionais: [{ nome: 'referencia', valor: req.referencia }],
    });

    const situacoes = { ATIVA: 'pendente', CONCLUIDA: 'aprovado', REMOVIDA_PELO_PSP: 'recusado' } as const;
    return {
      situacao: situacoes[resposta.status],
      transacaoExternaId: resposta.txid,
      instrucoes: resposta.pixCopiaECola,
      detalhes: { expiraEmSegundos: resposta.calendario.expiracao },
    };
  }

  traduzirNotificacao(payload: unknown): NotificacaoGateway {
    const pix = (payload as PixWebhookPayload)?.pix?.[0];
    if (!pix?.txid) throw new ErroDeNegocio('WEBHOOK_INVALIDO', 'Payload Pix inválido.', 400);
    // No padrão do BACEN, receber um item em "pix" significa que o valor foi liquidado.
    return { transacaoExternaId: pix.txid, aprovado: true };
  }
}
