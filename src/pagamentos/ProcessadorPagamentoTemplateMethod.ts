import { AppConfigSingleton } from '../config/AppConfigSingleton';
import type { Cobranca } from '../domain/Cobranca';
import type { Cpf } from '../domain/Cpf';
import { Movimentacao } from '../domain/Movimentacao';
import { Pagamento } from '../domain/Pagamento';
import type { MetodoPagamento } from '../domain/tipos';
import type { GatewayPagamento, RequisicaoGateway, RespostaGateway } from '../gateways/GatewayPagamento';
import { DatabaseSingleton } from '../infra/DatabaseSingleton';
import { BusinessRepositorio } from '../repositorios/BusinessRepositorio';
import { CobrancaRepositorio } from '../repositorios/CobrancaRepositorio';
import { MovimentacaoRepositorio } from '../repositorios/MovimentacaoRepositorio';
import { PagamentoRepositorio } from '../repositorios/PagamentoRepositorio';
import { ErroDeNegocio, ErroNaoEncontrado } from '../shared/erros';

/**
 * PADRÃO TEMPLATE METHOD (exemplo 1 de 3): fluxo de pagamento
 *
 * Pagar com Pix, cartão, boleto ou cripto segue SEMPRE o mesmo roteiro:
 *   1. validar regras comuns (cobrança pendente, método habilitado, CPF)
 *   2. validar regras do método ............................ (gancho)
 *   3. calcular a taxa da plataforma ........................ (gancho)
 *   4. registrar a tentativa no banco
 *   5. montar a requisição e chamar o gateway ............... (gancho)
 *   6. aplicar o resultado: confirmar, recusar ou aguardar webhook
 *
 * Os passos 1, 4 e 6 (a parte difícil: transação, crédito no saldo,
 * extrato, idempotência de webhook) são escritos UMA vez aqui. Cada
 * subclasse só preenche o que muda no seu método de pagamento.
 *
 * `processar()` é o template method. TypeScript não tem `final`, então
 * por convenção as subclasses NÃO o sobrescrevem.
 */
export abstract class ProcessadorPagamentoTemplateMethod<TExtras = void> {
  protected readonly config = AppConfigSingleton.instancia();
  private readonly db = DatabaseSingleton.instancia();
  private readonly pagamentos = new PagamentoRepositorio();
  private readonly cobrancas = new CobrancaRepositorio();
  private readonly businesses = new BusinessRepositorio();
  private readonly movimentacoes = new MovimentacaoRepositorio();

  abstract readonly metodo: MetodoPagamento;
  /** Cada subclasse escolhe o seu gateway (normalmente um Adapter). */
  abstract readonly gateway: GatewayPagamento;

  // ---------------------------------------------------------------
  // TEMPLATE METHOD
  // ---------------------------------------------------------------
  async processar(cobranca: Cobranca, cpfPagador: Cpf, dados: Record<string, unknown>): Promise<Pagamento> {
    this.validarComum(cobranca, cpfPagador);
    const extras = this.validarEspecifico(cobranca, dados);

    const pagamento = new Pagamento({
      cobrancaId: cobranca.id,
      metodo: this.metodo,
      valorPago: cobranca.valor,
      taxa: this.calcularTaxa(cobranca.valor, extras),
      cpfPagador,
    });
    await this.pagamentos.inserir(pagamento);

    const resposta = await this.chamarGateway(this.montarRequisicao(cobranca, pagamento, extras));
    pagamento.registrarEnvio(resposta.transacaoExternaId, resposta.instrucoes, resposta.detalhes);
    await this.pagamentos.atualizar(pagamento);

    if (resposta.situacao !== 'pendente') {
      await this.aplicarResultado(pagamento.id, resposta.situacao === 'aprovado', resposta.mensagem);
    }
    return (await this.pagamentos.buscarPorId(pagamento.id))!;
  }

  /**
   * Chamado pela rota de webhook: o gateway traduz o aviso (Adapter) e o
   * resultado passa pelo MESMO passo 6 do template.
   */
  async receberNotificacao(payload: unknown): Promise<Pagamento> {
    const aviso = this.gateway.traduzirNotificacao(payload);
    const pagamento = await this.pagamentos.buscarPorTransacao(this.metodo, aviso.transacaoExternaId);
    if (!pagamento) throw new ErroNaoEncontrado('Pagamento');
    await this.aplicarResultado(pagamento.id, aviso.aprovado, aviso.mensagem);
    return (await this.pagamentos.buscarPorId(pagamento.id))!;
  }

  // ---------------------------------------------------------------
  // GANCHOS: o que as subclasses podem (ou devem) personalizar
  // ---------------------------------------------------------------

  /** Regras próprias do método; devolve os dados extras já validados. */
  protected abstract validarEspecifico(cobranca: Cobranca, dados: Record<string, unknown>): TExtras;

  /** Padrão: percentual configurado no AppConfigSingleton para o método. */
  protected calcularTaxa(valor: number, _extras: TExtras): number {
    return this.config.taxaPara(this.metodo, valor);
  }

  /** Padrão: dados comuns a todo gateway. Subclasses acrescentam o que precisam. */
  protected montarRequisicao(cobranca: Cobranca, pagamento: Pagamento, _extras: TExtras): RequisicaoGateway {
    return {
      valor: pagamento.valorPago,
      referencia: pagamento.id,
      cpfPagador: pagamento.cpfPagador.valor,
      descricao: cobranca.descricao,
    };
  }

  // ---------------------------------------------------------------
  // PASSOS FIXOS (iguais para todos os métodos)
  // ---------------------------------------------------------------

  private validarComum(cobranca: Cobranca, cpfPagador: Cpf): void {
    cobranca.garantirPendente('pagar');
    if (!cobranca.aceita(this.metodo)) {
      throw new ErroDeNegocio('METODO_NAO_HABILITADO', 'Este método de pagamento não foi habilitado para esta cobrança.');
    }
    if (cobranca.clienteCpf && !cobranca.clienteCpf.igual(cpfPagador)) {
      throw new ErroDeNegocio('CPF_NAO_CONFERE', 'O CPF informado não é o do destinatário desta cobrança.');
    }
  }

  private async chamarGateway(requisicao: RequisicaoGateway): Promise<RespostaGateway> {
    try {
      return await this.gateway.cobrar(requisicao);
    } catch (erro) {
      if (erro instanceof ErroDeNegocio) throw erro;
      console.error(`[${this.gateway.nome}] falha na comunicação:`, erro);
      return { situacao: 'recusado', transacaoExternaId: '', mensagem: 'Provedor de pagamento indisponível. Tente novamente.' };
    }
  }

  /**
   * Confirma ou recusa dentro de UMA transação. Bloqueia as linhas para que
   * dois webhooks simultâneos (ou Pix + cartão ao mesmo tempo) não creditem
   * o saldo duas vezes.
   */
  private async aplicarResultado(pagamentoId: string, aprovado: boolean, mensagem?: string): Promise<void> {
    await this.db.transacao(async () => {
      const pagamento = await this.pagamentos.buscarPorId(pagamentoId, { bloquear: true });
      if (!pagamento || !pagamento.estaPendente()) return; // webhook repetido: nada a fazer

      if (!aprovado) {
        pagamento.falhar(mensagem ?? 'Pagamento recusado.');
        await this.pagamentos.atualizar(pagamento);
        return;
      }

      const cobranca = await this.cobrancas.buscarPorId(pagamento.cobrancaId, { bloquear: true });
      if (!cobranca?.estaPendente()) {
        pagamento.falhar('A cobrança já tinha sido paga ou cancelada; o valor será estornado.');
        await this.pagamentos.atualizar(pagamento);
        return;
      }
      const business = await this.businesses.buscarPorId(cobranca.businessId, { bloquear: true });
      if (!business) throw new ErroNaoEncontrado('Business');

      pagamento.confirmar();
      cobranca.marcarComoPaga();
      business.creditar(pagamento.valorLiquido);

      await this.pagamentos.atualizar(pagamento);
      await this.cobrancas.atualizar(cobranca);
      await this.businesses.atualizar(business);
      await this.movimentacoes.inserir(
        Movimentacao.deEntrada(business.id, pagamento, cobranca.clienteNome ?? cobranca.descricao),
      );
    });
  }
}
