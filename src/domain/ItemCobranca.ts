import { arredondar } from '../shared/validacao';

/** Produto/serviço dentro de uma cobrança (tela criar-cobranca-etapa-1). */
export class ItemCobranca {
  readonly descricao: string;
  readonly quantidade: number;
  readonly valorUnitario: number;

  constructor(descricao: string, quantidade: number, valorUnitario: number) {
    this.descricao = descricao;
    this.quantidade = quantidade;
    this.valorUnitario = valorUnitario;
  }

  get subtotal(): number {
    return arredondar(this.quantidade * this.valorUnitario);
  }

  toJSON() {
    return {
      descricao: this.descricao,
      quantidade: this.quantidade,
      valorUnitario: this.valorUnitario,
      subtotal: this.subtotal,
    };
  }
}
