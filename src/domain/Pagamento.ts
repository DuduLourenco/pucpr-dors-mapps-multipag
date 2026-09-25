import { arredondar } from '../shared/validacao';
import type { Cpf } from './Cpf';
import { Entidade, type Persistido } from './Entidade';
import type { MetodoPagamento, StatusPagamento } from './tipos';

export interface DadosPagamento {
  cobrancaId: string;
  metodo: MetodoPagamento;
  valorPago: number;
  taxa: number;
  cpfPagador: Cpf;
  /** Dados de exibição do comprovante: parcelas, final do cartão, cotação... */
  detalhes?: Record<string, string | number>;
}

/** Tentativa de pagamento de uma cobrança (RF11, RF12, RF15). */
export class Pagamento extends Entidade {
  readonly cobrancaId: string;
  readonly metodo: MetodoPagamento;
  readonly valorPago: number;
  readonly taxa: number;
  readonly cpfPagador: Cpf;
  detalhes: Record<string, string | number>;
  status: StatusPagamento = 'pendente';
  transacaoExternaId?: string;
  /** Pix copia-e-cola, linha digitável do boleto, endereço da carteira... */
  instrucoes?: string;
  motivoFalha?: string;
  confirmadoEm?: Date;

  constructor(dados: DadosPagamento, persistido?: Persistido) {
    super(persistido);
    this.cobrancaId = dados.cobrancaId;
    this.metodo = dados.metodo;
    this.valorPago = dados.valorPago;
    this.taxa = dados.taxa;
    this.cpfPagador = dados.cpfPagador;
    this.detalhes = dados.detalhes ?? {};
  }

  /** Quanto efetivamente entra no saldo do business. */
  get valorLiquido(): number {
    return arredondar(this.valorPago - this.taxa);
  }

  estaPendente(): boolean {
    return this.status === 'pendente';
  }

  /** Guarda o que o gateway devolveu enquanto o pagamento ainda está em aberto. */
  registrarEnvio(transacaoExternaId: string, instrucoes?: string, detalhes?: Record<string, string | number>): void {
    this.transacaoExternaId = transacaoExternaId;
    this.instrucoes = instrucoes;
    this.detalhes = { ...this.detalhes, ...detalhes };
  }

  confirmar(): void {
    this.status = 'confirmado';
    this.confirmadoEm = new Date();
  }

  falhar(motivo: string): void {
    this.status = 'falhou';
    this.motivoFalha = motivo;
  }

  toJSON() {
    return {
      id: this.id,
      cobrancaId: this.cobrancaId,
      metodo: this.metodo,
      valorPago: this.valorPago,
      taxa: this.taxa,
      valorLiquido: this.valorLiquido,
      status: this.status,
      transacaoExternaId: this.transacaoExternaId ?? null,
      instrucoes: this.instrucoes ?? null,
      detalhes: this.detalhes,
      motivoFalha: this.motivoFalha ?? null,
      criadoEm: this.criadoEm,
      confirmadoEm: this.confirmadoEm ?? null,
    };
  }
}
