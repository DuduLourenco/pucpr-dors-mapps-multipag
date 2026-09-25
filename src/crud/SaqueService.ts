import { AppConfigSingleton } from '../config/AppConfigSingleton';
import { Movimentacao } from '../domain/Movimentacao';
import { Saque } from '../domain/Saque';
import { BusinessRepositorio } from '../repositorios/BusinessRepositorio';
import { MovimentacaoRepositorio } from '../repositorios/MovimentacaoRepositorio';
import { SaqueRepositorio } from '../repositorios/SaqueRepositorio';
import { ErroDeNegocio, ErroNaoEncontrado } from '../shared/erros';
import { texto, valorMonetario } from '../shared/validacao';
import { type Contexto, CrudServiceTemplateMethod } from './CrudServiceTemplateMethod';

interface CriarSaque {
  valor: number;
  chavePix: string;
}

/**
 * Saque reaproveita o mesmo CrudServiceTemplateMethod, mas é um recurso "só cria e lê":
 * os ganchos verificarPodeAlterar/verificarPodeRemover bloqueiam o resto.
 */
export class SaqueService extends CrudServiceTemplateMethod<Saque, CriarSaque, never> {
  protected readonly repositorio = new SaqueRepositorio();
  protected readonly nomeRecurso = 'Saque';
  private readonly businesses = new BusinessRepositorio();
  private readonly movimentacoes = new MovimentacaoRepositorio();
  private readonly config = AppConfigSingleton.instancia();

  protected async validarCriacao(entrada: any): Promise<CriarSaque> {
    const valor = valorMonetario(entrada.valor);
    if (valor < this.config.valorMinimoSaque) {
      throw new ErroDeNegocio('VALOR_MINIMO', `O saque mínimo é de R$ ${this.config.valorMinimoSaque.toFixed(2).replace('.', ',')}.`);
    }
    return { valor, chavePix: texto(entrada.chavePix, 'chave Pix', { min: 5, max: 150 }) };
  }

  protected construir(dados: CriarSaque, ctx: Contexto): Saque {
    return new Saque({ ...dados, businessId: this.exigirLogin(ctx) });
  }

  /** Debita dentro da mesma transação do insert: se faltar saldo, nada é gravado. */
  protected async antesDeCriar(saque: Saque): Promise<void> {
    const business = await this.businesses.buscarPorId(saque.businessId, { bloquear: true });
    if (!business) throw new ErroNaoEncontrado('Conta');
    business.debitar(saque.valor);
    await this.businesses.atualizar(business);
    saque.status = 'processando';
  }

  protected async aposCriar(saque: Saque): Promise<void> {
    await this.movimentacoes.inserir(Movimentacao.deSaque(saque));
    this.simularTransferenciaPix(saque);
  }

  protected async validarAtualizacao(): Promise<never> {
    throw new ErroDeNegocio('OPERACAO_INVALIDA', 'Saques não podem ser alterados.');
  }

  protected aplicarAlteracoes(): void {}

  protected pertenceAo(saque: Saque, businessId: string): boolean {
    return saque.businessId === businessId;
  }

  protected verificarPodeAlterar(): void {
    throw new ErroDeNegocio('OPERACAO_INVALIDA', 'Saques não podem ser alterados.');
  }

  protected verificarPodeRemover(): void {
    throw new ErroDeNegocio('OPERACAO_INVALIDA', 'Saques não podem ser excluídos (auditoria).');
  }

  /** Sandbox: o Pix de saída "cai" alguns segundos depois ("O valor cai na conta em instantes"). */
  private simularTransferenciaPix(saque: Saque): void {
    setTimeout(async () => {
      try {
        saque.concluir();
        await this.repositorio.atualizar(saque);
      } catch (erro) {
        console.error('[saque] falha ao concluir:', erro);
      }
    }, this.config.atrasoLiquidacaoMs).unref();
  }
}
