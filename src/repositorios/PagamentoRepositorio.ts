import { Cpf } from '../domain/Cpf';
import { Pagamento } from '../domain/Pagamento';
import type { MetodoPagamento } from '../domain/tipos';
import { RepositorioPostgres } from './RepositorioPostgres';

export class PagamentoRepositorio extends RepositorioPostgres<Pagamento> {
  protected readonly tabela = 'pagamento';
  // No schema original a coluna de criação do pagamento se chama pago_em.
  protected readonly colunaCriacao = 'pago_em';

  async listarDoBusiness(businessId: string): Promise<Pagamento[]> {
    return this.buscarOnde(
      'cobranca_id IN (SELECT id FROM cobranca WHERE business_id = $1) ORDER BY pago_em DESC',
      [businessId],
    );
  }

  async buscarPorTransacao(metodo: MetodoPagamento, transacaoExternaId: string): Promise<Pagamento | undefined> {
    const [pagamento] = await this.buscarOnde('metodo_utilizado = $1 AND transacao_externa_id = $2', [
      metodo,
      transacaoExternaId,
    ]);
    return pagamento;
  }

  protected deLinha(l: Record<string, any>): Pagamento {
    const pagamento = new Pagamento(
      {
        cobrancaId: l.cobranca_id,
        metodo: l.metodo_utilizado,
        valorPago: l.valor_pago,
        taxa: l.taxa,
        cpfPagador: Cpf.criar(l.cpf_pagador),
        detalhes: l.detalhes,
      },
      { id: l.id, criadoEm: l.pago_em },
    );
    pagamento.status = l.status;
    pagamento.transacaoExternaId = l.transacao_externa_id ?? undefined;
    pagamento.instrucoes = l.instrucoes ?? undefined;
    pagamento.motivoFalha = l.motivo_falha ?? undefined;
    pagamento.confirmadoEm = l.confirmado_em ?? undefined;
    return pagamento;
  }

  protected paraLinha(p: Pagamento) {
    return {
      cobranca_id: p.cobrancaId,
      metodo_utilizado: p.metodo,
      valor_pago: p.valorPago,
      cpf_pagador: p.cpfPagador.valor,
      status: p.status,
      transacao_externa_id: p.transacaoExternaId ?? null,
      taxa: p.taxa,
      instrucoes: p.instrucoes ?? null,
      motivo_falha: p.motivoFalha ?? null,
      detalhes: p.detalhes,
      confirmado_em: p.confirmadoEm ?? null,
    };
  }
}
