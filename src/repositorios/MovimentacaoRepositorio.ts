import { Movimentacao } from '../domain/Movimentacao';
import type { TipoMovimentacao } from '../domain/tipos';
import { RepositorioPostgres } from './RepositorioPostgres';

export interface FiltroExtrato {
  tipo?: TipoMovimentacao;
  /** AAAA-MM */
  mes?: string;
  limite?: number;
}

export class MovimentacaoRepositorio extends RepositorioPostgres<Movimentacao> {
  protected readonly tabela = 'movimentacao';

  async listarDoBusiness(businessId: string): Promise<Movimentacao[]> {
    return this.filtrar(businessId, {});
  }

  async filtrar(businessId: string, filtro: FiltroExtrato): Promise<Movimentacao[]> {
    const condicoes = ['business_id = $1'];
    const params: unknown[] = [businessId];
    if (filtro.tipo) {
      params.push(filtro.tipo);
      condicoes.push(`tipo = $${params.length}`);
    }
    if (filtro.mes) {
      params.push(`${filtro.mes}-01`);
      condicoes.push(`date_trunc('month', criado_em) = date_trunc('month', $${params.length}::date)`);
    }
    params.push(filtro.limite ?? 500);
    return this.buscarOnde(`${condicoes.join(' AND ')} ORDER BY criado_em DESC LIMIT $${params.length}`, params);
  }

  protected deLinha(l: Record<string, any>): Movimentacao {
    return new Movimentacao(
      {
        businessId: l.business_id,
        tipo: l.tipo,
        valor: l.valor,
        descricao: l.descricao,
        metodo: l.metodo ?? undefined,
        pagamentoId: l.pagamento_id ?? undefined,
        saqueId: l.saque_id ?? undefined,
      },
      { id: l.id, criadoEm: l.criado_em },
    );
  }

  protected paraLinha(m: Movimentacao) {
    return {
      business_id: m.businessId,
      tipo: m.tipo,
      valor: m.valor,
      descricao: m.descricao,
      metodo: m.metodo ?? null,
      pagamento_id: m.pagamentoId ?? null,
      saque_id: m.saqueId ?? null,
    };
  }
}
