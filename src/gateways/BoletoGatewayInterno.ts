import { randomInt } from 'node:crypto';
import { AppConfigSingleton } from '../config/AppConfigSingleton';
import { ErroDeNegocio } from '../shared/erros';
import type { GatewayPagamento, NotificacaoGateway, RequisicaoGateway, RespostaGateway } from './GatewayPagamento';
import { simularWebhook } from './sdks/sandbox';

/**
 * Emissor de boleto próprio do MultiPag. Como foi escrito já seguindo a
 * interface GatewayPagamento, NÃO precisa de adapter, o que serve de
 * contraste com os três adapters.
 */
export class BoletoGatewayInterno implements GatewayPagamento {
  readonly nome = 'Boleto (emissão própria)';

  async cobrar(req: RequisicaoGateway): Promise<RespostaGateway> {
    const config = AppConfigSingleton.instancia();
    const nossoNumero = String(randomInt(10 ** 9, 10 ** 10));
    const valor = String(Math.round(req.valor * 100)).padStart(10, '0');
    const vencimento = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    // Sandbox: a "compensação bancária" avisa o webhook depois de alguns segundos.
    simularWebhook(config.urlWebhook('boleto'), { nossoNumero, situacao: 'LIQUIDADO' }, config.atrasoLiquidacaoMs);

    return {
      situacao: 'pendente',
      transacaoExternaId: nossoNumero,
      instrucoes: `34191.79001 ${nossoNumero.slice(0, 5)}.${nossoNumero.slice(5)} 1 ${valor}`,
      detalhes: { vencimento: vencimento.toISOString().slice(0, 10) },
    };
  }

  traduzirNotificacao(payload: unknown): NotificacaoGateway {
    const aviso = payload as { nossoNumero?: string; situacao?: string };
    if (!aviso?.nossoNumero) throw new ErroDeNegocio('WEBHOOK_INVALIDO', 'Aviso de boleto inválido.', 400);
    return { transacaoExternaId: aviso.nossoNumero, aprovado: aviso.situacao === 'LIQUIDADO' };
  }
}
