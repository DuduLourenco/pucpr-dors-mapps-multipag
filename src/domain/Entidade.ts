import { randomUUID } from 'node:crypto';

export interface Persistido {
  id: string;
  criadoEm: Date;
}

/**
 * Base de todas as entidades persistidas: garante id e data de criação
 * sem que cada classe precise repetir esse código. Quando a entidade vem
 * do banco, recebe o id/data já gravados.
 */
export abstract class Entidade {
  readonly id: string;
  readonly criadoEm: Date;

  protected constructor(persistido?: Persistido) {
    this.id = persistido?.id ?? randomUUID();
    this.criadoEm = persistido?.criadoEm ?? new Date();
  }
}
