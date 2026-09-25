import { Entidade, type Persistido } from './Entidade';
import type { Pagamento } from './Pagamento';
import type { Saque } from './Saque';
import type { MetodoPagamento, TipoMovimentacao } from './tipos';

export interface DadosMovimentacao {
  businessId: string;
  tipo: TipoMovimentacao;
  valor: number;
  descricao: string;
  metodo?: MetodoPagamento;
  pagamentoId?: string;
  saqueId?: string;
}

/**
 * Linha do extrato do business (RF08 / RNF09 - auditoria).
 * Entradas têm valor positivo e saques valor negativo, então somar
 * a coluna "valor" sempre dá a variação do saldo.
 */
export class Movimentacao extends Entidade {
  readonly businessId: string;
  readonly tipo: TipoMovimentacao;
  readonly valor: number;
  readonly descricao: string;
  readonly metodo?: MetodoPagamento;
  readonly pagamentoId?: string;
  readonly saqueId?: string;

  constructor(dados: DadosMovimentacao, persistido?: Persistido) {
    super(persistido);
    this.businessId = dados.businessId;
    this.tipo = dados.tipo;
    this.valor = dados.valor;
    this.descricao = dados.descricao;
    this.metodo = dados.metodo;
    this.pagamentoId = dados.pagamentoId;
    this.saqueId = dados.saqueId;
  }

  /** Entrada no extrato: título é o nome do cliente (ou a descrição da cobrança). */
  static deEntrada(businessId: string, pagamento: Pagamento, titulo: string): Movimentacao {
    return new Movimentacao({
      businessId,
      tipo: 'entrada_pagamento',
      valor: pagamento.valorLiquido,
      descricao: titulo,
      metodo: pagamento.metodo,
      pagamentoId: pagamento.id,
    });
  }

  static deSaque(saque: Saque): Movimentacao {
    return new Movimentacao({
      businessId: saque.businessId,
      tipo: 'saque',
      valor: -saque.valor,
      descricao: 'Saque via Pix',
      saqueId: saque.id,
    });
  }

  ehEntrada(): boolean {
    return this.valor > 0;
  }

  toJSON() {
    return {
      id: this.id,
      tipo: this.tipo,
      valor: this.valor,
      descricao: this.descricao,
      metodo: this.metodo ?? null,
      criadoEm: this.criadoEm,
    };
  }
}
