import { Business } from '../domain/Business';
import { Cnpj } from '../domain/Cnpj';
import { Cpf } from '../domain/Cpf';
import { RepositorioPostgres } from './RepositorioPostgres';

export class BusinessRepositorio extends RepositorioPostgres<Business> {
  protected readonly tabela = 'business';

  async listarDoBusiness(businessId: string): Promise<Business[]> {
    return this.buscarOnde('id = $1', [businessId]);
  }

  async buscarPorEmail(email: string): Promise<Business | undefined> {
    const [business] = await this.buscarOnde('email = $1', [email]);
    return business;
  }

  async existe(campo: 'email' | 'cpf' | 'cnpj', valor: string, excetoId?: string): Promise<boolean> {
    const linhas = await this.db.consultar(
      `SELECT 1 FROM business WHERE ${campo} = $1 AND ($2::uuid IS NULL OR id <> $2) LIMIT 1`,
      [valor, excetoId ?? null],
    );
    return linhas.length > 0;
  }

  protected deLinha(l: Record<string, any>): Business {
    return Business.restaurar(
      {
        tipoConta: l.tipo_conta,
        nomeEmpresa: l.nome_empresa,
        nomeFantasia: l.nome_fantasia ?? undefined,
        cnpj: l.cnpj ? Cnpj.criar(l.cnpj) : undefined,
        nomeResponsavel: l.nome_responsavel ?? l.nome_empresa,
        email: l.email,
        cpf: Cpf.criar(l.cpf),
        dataNascimento: l.data_nascimento,
      },
      { id: l.id, criadoEm: l.criado_em },
      l.senha_hash,
      l.saldo_disponivel,
    );
  }

  protected paraLinha(b: Business) {
    return {
      tipo_conta: b.tipoConta,
      nome_empresa: b.nomeEmpresa,
      nome_fantasia: b.nomeFantasia ?? null,
      cnpj: b.cnpj?.valor ?? null,
      nome_responsavel: b.nomeResponsavel,
      email: b.email,
      cpf: b.cpf.valor,
      data_nascimento: b.dataNascimento,
      senha_hash: b.hashDaSenha,
      saldo_disponivel: b.saldoDisponivel,
    };
  }
}
