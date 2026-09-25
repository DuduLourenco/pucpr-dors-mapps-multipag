import { Saque } from '../domain/Saque';
import { RepositorioPostgres } from './RepositorioPostgres';

export class SaqueRepositorio extends RepositorioPostgres<Saque> {
  protected readonly tabela = 'saque';
  protected readonly colunaCriacao = 'solicitado_em';

  async listarDoBusiness(businessId: string): Promise<Saque[]> {
    return this.buscarOnde('business_id = $1 ORDER BY solicitado_em DESC', [businessId]);
  }

  protected deLinha(l: Record<string, any>): Saque {
    const saque = new Saque(
      { businessId: l.business_id, valor: l.valor, chavePix: l.chave_pix },
      { id: l.id, criadoEm: l.solicitado_em },
    );
    saque.status = l.status;
    saque.concluidoEm = l.concluido_em ?? undefined;
    return saque;
  }

  protected paraLinha(s: Saque) {
    return {
      business_id: s.businessId,
      valor: s.valor,
      chave_pix: s.chavePix,
      status: s.status,
      concluido_em: s.concluidoEm ?? null,
    };
  }
}
