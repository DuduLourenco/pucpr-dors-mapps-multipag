import type { Criptomoeda } from '../domain/tipos';

/**
 * INTERFACE ALVO (Target) do padrão Adapter.
 *
 * É a única forma com que o MultiPag conversa com um provedor de pagamento.
 * Os processadores (Template Method) e a rota de webhooks dependem só desta
 * interface, nunca de um SDK específico.
 */
export interface RequisicaoGateway {
  /** Sempre em reais, com 2 casas. */
  valor: number;
  /** Id interno do pagamento, devolvido pelo provedor para conciliação. */
  referencia: string;
  cpfPagador: string;
  descricao: string;
  cartao?: { numero: string; nomeImpresso: string; validade: string; cvv: string; parcelas: number };
  criptomoeda?: Criptomoeda;
}

export interface RespostaGateway {
  /** pendente = aguardando o pagador (Pix, boleto, cripto); chega depois por webhook. */
  situacao: 'aprovado' | 'pendente' | 'recusado';
  transacaoExternaId: string;
  /** Texto mostrado ao pagador: copia-e-cola, linha digitável, endereço da carteira. */
  instrucoes?: string;
  /** Motivo em português quando recusado. */
  mensagem?: string;
  /** Dados extras para o comprovante (cotação, quantidade, final do cartão...). */
  detalhes?: Record<string, string | number>;
}

/** Aviso assíncrono do provedor, já traduzido para o formato do MultiPag. */
export interface NotificacaoGateway {
  transacaoExternaId: string;
  aprovado: boolean;
  mensagem?: string;
}

export interface GatewayPagamento {
  readonly nome: string;
  cobrar(requisicao: RequisicaoGateway): Promise<RespostaGateway>;
  /** Converte o corpo do webhook do provedor (formato dele) para o nosso formato. */
  traduzirNotificacao(payload: unknown): NotificacaoGateway;
}
