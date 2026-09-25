import { Entidade, type Persistido } from './Entidade';
import type { StatusSaque } from './tipos';

/** Retirada do saldo, exclusivamente via Pix (RF09). */
export class Saque extends Entidade {
  readonly businessId: string;
  readonly valor: number;
  readonly chavePix: string;
  status: StatusSaque = 'solicitado';
  concluidoEm?: Date;

  constructor(dados: { businessId: string; valor: number; chavePix: string }, persistido?: Persistido) {
    super(persistido);
    this.businessId = dados.businessId;
    this.valor = dados.valor;
    this.chavePix = dados.chavePix;
  }

  concluir(): void {
    this.status = 'concluido';
    this.concluidoEm = new Date();
  }

  falhar(): void {
    this.status = 'falhou';
  }

  toJSON() {
    return {
      id: this.id,
      valor: this.valor,
      chavePix: this.chavePix,
      status: this.status,
      solicitadoEm: this.criadoEm,
      concluidoEm: this.concluidoEm ?? null,
    };
  }
}
