import type { Cobranca, ConfigRecorrencia, DadosCobranca } from '../domain/Cobranca';
import { Cobranca as CobrancaEntidade } from '../domain/Cobranca';
import { Cpf } from '../domain/Cpf';
import { ItemCobranca } from '../domain/ItemCobranca';
import { CRIPTOMOEDAS, ehUmDe, METODOS_PAGAMENTO, RECORRENCIAS } from '../domain/tipos';
import { CobrancaRepositorio } from '../repositorios/CobrancaRepositorio';
import { ErroDeNegocio } from '../shared/erros';
import { data, email, texto, textoOpcional, valorMonetario } from '../shared/validacao';
import { type Contexto, CrudServiceTemplateMethod } from './CrudServiceTemplateMethod';

type DadosEditaveis = Omit<DadosCobranca, 'businessId'>;

const MAX_ITENS = 20;

/** CRUD de cobranças: assistente de 5 etapas (telas criar-cobranca-*), lista, edição e cancelamento. */
export class CobrancaService extends CrudServiceTemplateMethod<Cobranca, DadosEditaveis, DadosEditaveis> {
  protected readonly repositorio = new CobrancaRepositorio();
  protected readonly nomeRecurso = 'Cobrança';

  async buscarPorToken(token: string): Promise<Cobranca | undefined> {
    return this.repositorio.buscarPorToken(token);
  }

  protected async validarCriacao(entrada: unknown): Promise<DadosEditaveis> {
    return this.validarDados(entrada as Record<string, any>);
  }

  protected construir(dados: DadosEditaveis, ctx: Contexto): Cobranca {
    return CobrancaEntidade.criar({ ...dados, businessId: this.exigirLogin(ctx) });
  }

  /** Mesmo formulário da criação: a edição é um PUT completo. */
  protected async validarAtualizacao(entrada: unknown): Promise<DadosEditaveis> {
    return this.validarDados(entrada as Record<string, any>);
  }

  protected aplicarAlteracoes(cobranca: Cobranca, dados: DadosEditaveis): void {
    cobranca.atualizar(dados);
  }

  protected pertenceAo(cobranca: Cobranca, businessId: string): boolean {
    return cobranca.businessId === businessId;
  }

  protected verificarPodeAlterar(cobranca: Cobranca): void {
    cobranca.garantirPendente('editar');
  }

  protected verificarPodeRemover(cobranca: Cobranca): void {
    cobranca.garantirPendente('cancelar');
  }

  /**
   * Exclusão LÓGICA: a cobrança vira "cancelada" e continua no banco,
   * porque pode ter pagamentos recusados ligados a ela (auditoria, RNF09).
   */
  protected async executarRemocao(cobranca: Cobranca): Promise<void> {
    cobranca.cancelar();
    await this.repositorio.atualizar(cobranca);
  }

  protected async aposCriar(cobranca: Cobranca): Promise<void> {
    if (cobranca.clienteEmail) {
      // Envio real de e-mail fica fora do escopo; o link é logado para testes.
      console.log(`[cobrança] link enviado para ${cobranca.clienteEmail}: ${cobranca.linkPagamento}`);
    }
  }

  private validarDados(entrada: Record<string, any>): DadosEditaveis {
    // Etapa 1: itens
    const itensEntrada: any[] = Array.isArray(entrada.itens) ? entrada.itens : [];
    if (itensEntrada.length === 0 || itensEntrada.length > MAX_ITENS) {
      throw new ErroDeNegocio('ITENS_INVALIDOS', `Adicione entre 1 e ${MAX_ITENS} itens.`);
    }
    const itens = itensEntrada.map((i, n) => {
      const quantidade = Number(i?.quantidade ?? 1);
      if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 999) {
        throw new ErroDeNegocio('ITENS_INVALIDOS', `Quantidade inválida no item ${n + 1}.`);
      }
      return new ItemCobranca(
        texto(i?.descricao, `descrição do item ${n + 1}`, { max: 150 }),
        quantidade,
        valorMonetario(i?.valorUnitario, `valor do item ${n + 1}`),
      );
    });

    // Etapa 2: métodos de pagamento
    const metodos = Array.isArray(entrada.metodosPagamento) ? entrada.metodosPagamento : [];
    if (metodos.length === 0 || !metodos.every((m: unknown) => ehUmDe(METODOS_PAGAMENTO, m))) {
      throw new ErroDeNegocio('METODOS_INVALIDOS', 'Escolha ao menos um método de pagamento válido.');
    }
    const parcelasMaximas = metodos.includes('cartao') ? Number(entrada.parcelasMaximas ?? 1) : 1;
    if (!Number.isInteger(parcelasMaximas) || parcelasMaximas < 1 || parcelasMaximas > 12) {
      throw new ErroDeNegocio('PARCELAS_INVALIDAS', 'Parcelamento máximo deve ser entre 1x e 12x.');
    }
    const criptomoedas = metodos.includes('cripto') ? (entrada.criptomoedas ?? ['BTC']) : [];
    if (!Array.isArray(criptomoedas) || !criptomoedas.every((c) => ehUmDe(CRIPTOMOEDAS, c)) || (metodos.includes('cripto') && criptomoedas.length === 0)) {
      throw new ErroDeNegocio('CRIPTO_INVALIDA', 'Escolha ao menos uma criptomoeda aceita.');
    }

    // Etapa 3: recorrência
    const tipo = entrada.recorrencia?.tipo ?? 'unica';
    if (!ehUmDe(RECORRENCIAS, tipo)) throw new ErroDeNegocio('RECORRENCIA_INVALIDA', 'Recorrência inválida.');
    const recorrencia: ConfigRecorrencia = { tipo };
    if (tipo !== 'unica') {
      recorrencia.inicio = data(entrada.recorrencia.inicio, 'primeira cobrança em');
      const repeticoes = entrada.recorrencia.repeticoes;
      if (repeticoes !== undefined && repeticoes !== null && repeticoes !== '') {
        recorrencia.repeticoes = Number(repeticoes);
        if (!Number.isInteger(recorrencia.repeticoes) || recorrencia.repeticoes < 2 || recorrencia.repeticoes > 120) {
          throw new ErroDeNegocio('RECORRENCIA_INVALIDA', 'Repetições devem ser entre 2 e 120.');
        }
      }
    }

    // Etapa 4: pagador (identificado ou link aberto)
    const linkAberto = entrada.linkAberto === true;
    return {
      itens,
      metodos,
      parcelasMaximas,
      criptomoedas,
      recorrencia,
      clienteNome: linkAberto ? undefined : textoOpcional(entrada.clienteNome, 'nome do cliente', 150),
      clienteCpf: linkAberto ? undefined : Cpf.criar(entrada.clienteCpf),
      clienteEmail: linkAberto || !entrada.clienteEmail ? undefined : email(entrada.clienteEmail, 'e-mail do cliente'),
    };
  }
}
