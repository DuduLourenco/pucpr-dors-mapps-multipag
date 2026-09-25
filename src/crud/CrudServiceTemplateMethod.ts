import type { Entidade } from '../domain/Entidade';
import { DatabaseSingleton } from '../infra/DatabaseSingleton';
import type { Repositorio } from '../repositorios/RepositorioPostgres';
import { ErroNaoAutorizado, ErroNaoEncontrado } from '../shared/erros';

/** Quem está fazendo a operação (vem do token de login). */
export interface Contexto {
  businessId?: string;
}

/**
 * PADRÃO TEMPLATE METHOD (exemplo 2 de 3): base de todos os CRUDs
 *
 * As telas de Business, Cobrança e Saque fazem as mesmas 5 operações e
 * todas precisam de: checar dono do registro (um lojista não pode ver a
 * cobrança do outro), validar entrada, abrir transação, gravar e devolver
 * 404 padronizado. Esse roteiro fica aqui; as subclasses implementam só
 * as regras do seu recurso.
 *
 *   criar()     = validarCriacao -> construir -> [antesDeCriar] -> inserir -> [aposCriar]
 *   atualizar() = buscar -> [verificarPodeAlterar] -> validarAtualizacao -> aplicarAlteracoes -> atualizar
 *   remover()   = buscar -> [verificarPodeRemover] -> [executarRemocao]
 *
 * Entre colchetes: ganchos com implementação padrão (opcionais).
 */
export abstract class CrudServiceTemplateMethod<T extends Entidade, TCriar, TAtualizar> {
  protected readonly db = DatabaseSingleton.instancia();
  protected abstract readonly repositorio: Repositorio<T>;
  protected abstract readonly nomeRecurso: string;

  // ------------------------------ templates ------------------------------

  async listar(ctx: Contexto): Promise<T[]> {
    return this.repositorio.listarDoBusiness(this.exigirLogin(ctx));
  }

  async buscar(id: string, ctx: Contexto, opcoes: { bloquear?: boolean } = {}): Promise<T> {
    const businessId = this.exigirLogin(ctx);
    const entidade = await this.repositorio.buscarPorId(id, opcoes);
    // Registro de outro business responde 404, sem revelar que ele existe.
    if (!entidade || !this.pertenceAo(entidade, businessId)) throw new ErroNaoEncontrado(this.nomeRecurso);
    return entidade;
  }

  async criar(entrada: unknown, ctx: Contexto): Promise<T> {
    const dados = await this.validarCriacao(entrada ?? {}, ctx);
    const entidade = this.construir(dados, ctx);
    return this.db.transacao(async () => {
      await this.antesDeCriar(entidade, ctx);
      await this.repositorio.inserir(entidade);
      await this.aposCriar(entidade, ctx);
      return entidade;
    });
  }

  async atualizar(id: string, entrada: unknown, ctx: Contexto): Promise<T> {
    return this.db.transacao(async () => {
      const entidade = await this.buscar(id, ctx, { bloquear: true });
      this.verificarPodeAlterar(entidade);
      const dados = await this.validarAtualizacao(entrada ?? {}, entidade);
      this.aplicarAlteracoes(entidade, dados);
      await this.repositorio.atualizar(entidade);
      return entidade;
    });
  }

  async remover(id: string, ctx: Contexto): Promise<void> {
    await this.db.transacao(async () => {
      const entidade = await this.buscar(id, ctx, { bloquear: true });
      this.verificarPodeRemover(entidade);
      await this.executarRemocao(entidade);
    });
  }

  // ------------------------- passos obrigatórios -------------------------

  /** Converte o corpo da requisição (desconhecido) em dados tipados e válidos. */
  protected abstract validarCriacao(entrada: unknown, ctx: Contexto): Promise<TCriar>;
  protected abstract construir(dados: TCriar, ctx: Contexto): T;
  protected abstract validarAtualizacao(entrada: unknown, atual: T): Promise<TAtualizar>;
  protected abstract aplicarAlteracoes(entidade: T, dados: TAtualizar): void;
  protected abstract pertenceAo(entidade: T, businessId: string): boolean;

  // --------------------- ganchos com comportamento padrão ---------------------

  protected async antesDeCriar(_entidade: T, _ctx: Contexto): Promise<void> {}
  protected async aposCriar(_entidade: T, _ctx: Contexto): Promise<void> {}
  protected verificarPodeAlterar(_entidade: T): void {}
  protected verificarPodeRemover(_entidade: T): void {}

  /** Padrão: DELETE físico. Quem precisa de exclusão lógica sobrescreve. */
  protected async executarRemocao(entidade: T): Promise<void> {
    await this.repositorio.remover(entidade.id);
  }

  // ------------------------------ utilitário ------------------------------

  protected exigirLogin(ctx: Contexto): string {
    if (!ctx.businessId) throw new ErroNaoAutorizado();
    return ctx.businessId;
  }
}
