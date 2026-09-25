import { randomBytes } from 'node:crypto';
import { simularWebhook } from './sandbox';

/**
 * ⚠️ SIMULAÇÃO de biblioteca de terceiros: SDK do banco parceiro, no
 * formato da API Pix do Banco Central. Em um projeto real viria do npm e
 * NÃO poderíamos alterá-la — por isso precisamos de um Adapter.
 *
 * Incompatibilidades com o nosso GatewayPagamento:
 *  - valor vem como STRING ("100.00") dentro de { valor: { original } }
 *  - CPF fica em { devedor: { cpf } }
 *  - status "ATIVA" / "CONCLUIDA" em vez de aprovado/pendente
 *  - o webhook chega como { pix: [{ txid, endToEndId, valor, horario }] }
 */
export interface PixCobImediataRequest {
  calendario: { expiracao: number };
  devedor: { cpf: string; nome?: string };
  valor: { original: string };
  chave: string;
  solicitacaoPagador?: string;
  infoAdicionais?: { nome: string; valor: string }[];
}

export interface PixCobImediataResponse {
  txid: string;
  status: 'ATIVA' | 'CONCLUIDA' | 'REMOVIDA_PELO_PSP';
  pixCopiaECola: string;
  calendario: { criacao: string; expiracao: number };
}

export interface PixWebhookPayload {
  pix: { endToEndId: string; txid: string; valor: string; horario: string }[];
}

export class BancoPixSdk {
  private readonly clientId: string;
  private readonly opcoes: { webhookUrl: string; atrasoLiquidacaoMs: number };

  constructor(clientId: string, opcoes: { webhookUrl: string; atrasoLiquidacaoMs: number }) {
    this.clientId = clientId;
    this.opcoes = opcoes;
  }

  async criarCobrancaImediata(req: PixCobImediataRequest): Promise<PixCobImediataResponse> {
    const txid = randomBytes(16).toString('hex');
    const payload: PixWebhookPayload = {
      pix: [{ endToEndId: `E${randomBytes(15).toString('hex')}`, txid, valor: req.valor.original, horario: new Date().toISOString() }],
    };
    simularWebhook(this.opcoes.webhookUrl, payload, this.opcoes.atrasoLiquidacaoMs);

    const valor = req.valor.original;
    return {
      txid,
      status: 'ATIVA',
      calendario: { criacao: new Date().toISOString(), expiracao: req.calendario.expiracao },
      pixCopiaECola:
        `00020126580014BR.GOV.BCB.PIX0136${req.chave}520400005303986` +
        `54${String(valor.length).padStart(2, '0')}${valor}5802BR5908MULTIPAG6009SAO PAULO` +
        `62${String(txid.length + 4).padStart(2, '0')}05${String(txid.length).padStart(2, '0')}${txid}6304${this.clientId.slice(0, 4).toUpperCase()}`,
    };
  }
}
