import { ErroDeNegocio } from '../shared/erros';
import { conferirSenha, gerarHashSenha } from '../shared/senha';
import { arredondar } from '../shared/validacao';
import type { Cnpj } from './Cnpj';
import type { Cpf } from './Cpf';
import { Entidade, type Persistido } from './Entidade';
import type { TipoConta } from './tipos';

export interface DadosBusiness {
  tipoConta: TipoConta;
  /** Nome da pessoa (PF) ou razão social (empresa). */
  nomeEmpresa: string;
  nomeFantasia?: string;
  cnpj?: Cnpj;
  nomeResponsavel: string;
  email: string;
  cpf: Cpf;
  dataNascimento: string;
}

/** Lojista/prestador que cria cobranças e recebe na conta digital (RF01, RF07). */
export class Business extends Entidade {
  readonly tipoConta: TipoConta;
  nomeEmpresa: string;
  nomeFantasia?: string;
  readonly cnpj?: Cnpj;
  nomeResponsavel: string;
  email: string;
  readonly cpf: Cpf;
  readonly dataNascimento: string;
  private senhaHash = '';
  private saldo = 0;

  private constructor(dados: DadosBusiness, persistido?: Persistido) {
    super(persistido);
    this.tipoConta = dados.tipoConta;
    this.nomeEmpresa = dados.nomeEmpresa;
    this.nomeFantasia = dados.nomeFantasia;
    this.cnpj = dados.cnpj;
    this.nomeResponsavel = dados.nomeResponsavel;
    this.email = dados.email;
    this.cpf = dados.cpf;
    this.dataNascimento = dados.dataNascimento;
  }

  static criar(dados: DadosBusiness, senha: string): Business {
    const business = new Business(dados);
    business.senhaHash = gerarHashSenha(senha);
    return business;
  }

  /** Reconstrói a partir do que está gravado no banco (sem regerar hash). */
  static restaurar(dados: DadosBusiness, persistido: Persistido, senhaHash: string, saldo: number): Business {
    const business = new Business(dados, persistido);
    business.senhaHash = senhaHash;
    business.saldo = saldo;
    return business;
  }

  get saldoDisponivel(): number {
    return this.saldo;
  }

  get hashDaSenha(): string {
    return this.senhaHash;
  }

  /** Nome mostrado para o cliente no link de pagamento. */
  get nomeExibicao(): string {
    return this.nomeFantasia || this.nomeEmpresa;
  }

  creditar(valor: number): void {
    if (valor <= 0) throw new ErroDeNegocio('VALOR_INVALIDO', 'Crédito deve ser positivo.');
    this.saldo = arredondar(this.saldo + valor);
  }

  debitar(valor: number): void {
    if (valor <= 0) throw new ErroDeNegocio('VALOR_INVALIDO', 'Débito deve ser positivo.');
    if (valor > this.saldo) {
      throw new ErroDeNegocio('SALDO_INSUFICIENTE', 'Saldo insuficiente para esta operação.');
    }
    this.saldo = arredondar(this.saldo - valor);
  }

  verificarSenha(senha: string): boolean {
    return conferirSenha(senha, this.senhaHash);
  }

  alterarSenha(novaSenha: string): void {
    this.senhaHash = gerarHashSenha(novaSenha);
  }

  atualizarPerfil(dados: { nomeEmpresa?: string; nomeFantasia?: string; nomeResponsavel?: string; email?: string }): void {
    if (dados.nomeEmpresa !== undefined) this.nomeEmpresa = dados.nomeEmpresa;
    if (dados.nomeFantasia !== undefined) this.nomeFantasia = dados.nomeFantasia;
    if (dados.nomeResponsavel !== undefined) this.nomeResponsavel = dados.nomeResponsavel;
    if (dados.email !== undefined) this.email = dados.email;
  }

  /** O hash da senha nunca sai na resposta da API. */
  toJSON() {
    return {
      id: this.id,
      tipoConta: this.tipoConta,
      nomeEmpresa: this.nomeEmpresa,
      nomeFantasia: this.nomeFantasia ?? null,
      nomeExibicao: this.nomeExibicao,
      cnpj: this.cnpj?.formatado() ?? null,
      nomeResponsavel: this.nomeResponsavel,
      email: this.email,
      cpf: this.cpf.formatado(),
      dataNascimento: this.dataNascimento,
      saldoDisponivel: this.saldo,
      criadoEm: this.criadoEm,
    };
  }
}
