import type { Entidade } from '../domain/Entidade';
import { DatabaseSingleton } from '../infra/DatabaseSingleton';

type Linha = Record<string, any>;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Contrato mínimo que o CrudServiceTemplateMethod espera de um repositório. */
export interface Repositorio<T> {
  buscarPorId(id: string, opcoes?: { bloquear?: boolean }): Promise<T | undefined>;
  listarDoBusiness(businessId: string): Promise<T[]>;
  inserir(entidade: T): Promise<void>;
  atualizar(entidade: T): Promise<void>;
  remover(id: string): Promise<void>;
}

/**
 * Implementação genérica de repositório para PostgreSQL.
 * O SQL de buscar/inserir/atualizar/remover é escrito uma vez só; cada
 * repositório concreto informa apenas a tabela e como converter
 * linha <-> entidade (deLinha / paraLinha).
 */
export abstract class RepositorioPostgres<T extends Entidade> implements Repositorio<T> {
  protected readonly db = DatabaseSingleton.instancia();
  protected abstract readonly tabela: string;
  /** Nome da coluna de data de criação (varia entre as tabelas do schema original). */
  protected readonly colunaCriacao: string = 'criado_em';

  protected abstract deLinha(linha: Linha): T;
  protected abstract paraLinha(entidade: T): Linha;

  abstract listarDoBusiness(businessId: string): Promise<T[]>;

  async buscarPorId(id: string, opcoes: { bloquear?: boolean } = {}): Promise<T | undefined> {
    if (!UUID.test(id)) return undefined;
    const bloqueio = opcoes.bloquear ? ' FOR UPDATE' : '';
    const [entidade] = await this.buscarOnde(`id = $1${bloqueio}`, [id]);
    return entidade;
  }

  async inserir(entidade: T): Promise<void> {
    const linha: Linha = { id: entidade.id, [this.colunaCriacao]: entidade.criadoEm, ...this.paraLinha(entidade) };
    const colunas = Object.keys(linha);
    const marcadores = colunas.map((_, i) => `$${i + 1}`);
    await this.db.consultar(
      `INSERT INTO ${this.tabela} (${colunas.join(', ')}) VALUES (${marcadores.join(', ')})`,
      Object.values(linha),
    );
    await this.aposGravar(entidade);
  }

  async atualizar(entidade: T): Promise<void> {
    const linha = this.paraLinha(entidade);
    const colunas = Object.keys(linha);
    const atribuicoes = colunas.map((c, i) => `${c} = $${i + 2}`);
    await this.db.consultar(`UPDATE ${this.tabela} SET ${atribuicoes.join(', ')} WHERE id = $1`, [
      entidade.id,
      ...Object.values(linha),
    ]);
    await this.aposGravar(entidade);
  }

  async remover(id: string): Promise<void> {
    await this.db.consultar(`DELETE FROM ${this.tabela} WHERE id = $1`, [id]);
  }

  /** SELECT * com um WHERE livre; o resto (ORDER BY, LIMIT) pode vir junto no filtro. */
  protected async buscarOnde(filtro: string, params: unknown[]): Promise<T[]> {
    const linhas = await this.db.consultar(`SELECT * FROM ${this.tabela} WHERE ${filtro}`, params);
    return this.hidratar(linhas);
  }

  /** Converte linhas em entidades. Sobrescrito quando há tabelas filhas para carregar. */
  protected async hidratar(linhas: Linha[]): Promise<T[]> {
    return linhas.map((l) => this.deLinha(l));
  }

  /** Gancho para gravar tabelas filhas (ex.: itens da cobrança). */
  protected async aposGravar(_entidade: T): Promise<void> {}
}
