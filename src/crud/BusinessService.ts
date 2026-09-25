import { Business, type DadosBusiness } from '../domain/Business';
import { Cnpj } from '../domain/Cnpj';
import { Cpf } from '../domain/Cpf';
import { BusinessRepositorio } from '../repositorios/BusinessRepositorio';
import { ErroDeNegocio } from '../shared/erros';
import { data, email, texto, textoOpcional } from '../shared/validacao';
import { CrudServiceTemplateMethod } from './CrudServiceTemplateMethod';

interface CriarBusiness {
  dados: DadosBusiness;
  senha: string;
}

interface AtualizarBusiness {
  nomeEmpresa?: string;
  nomeFantasia?: string;
  nomeResponsavel?: string;
  email?: string;
  novaSenha?: string;
}

const IDADE_MINIMA = 18;

/** CRUD do lojista: cadastro em 3 etapas (telas cadastro-etapa-*), perfil e exclusão. */
export class BusinessService extends CrudServiceTemplateMethod<Business, CriarBusiness, AtualizarBusiness> {
  protected readonly repositorio = new BusinessRepositorio();
  protected readonly nomeRecurso = 'Conta';

  protected async validarCriacao(entrada: any): Promise<CriarBusiness> {
    const tipoConta = entrada.tipoConta === 'empresa' ? 'empresa' : 'pessoa_fisica';
    const nomeResponsavel = texto(entrada.nomeResponsavel, 'nome completo', { min: 3, max: 150 });
    const cpf = Cpf.criar(entrada.cpf);
    const dataNascimento = data(entrada.dataNascimento, 'data de nascimento');
    const emailValido = email(entrada.email);
    const senha = this.validarSenha(entrada.senha, entrada.confirmacaoSenha);

    const idade = (Date.now() - Date.parse(dataNascimento)) / (365.25 * 24 * 60 * 60 * 1000);
    if (idade < IDADE_MINIMA) throw new ErroDeNegocio('MENOR_DE_IDADE', 'O responsável precisa ter 18 anos ou mais.');

    let nomeEmpresa = nomeResponsavel;
    let cnpj: Cnpj | undefined;
    let nomeFantasia: string | undefined;
    if (tipoConta === 'empresa') {
      nomeEmpresa = texto(entrada.nomeEmpresa, 'razão social', { min: 3, max: 150 });
      cnpj = Cnpj.criar(entrada.cnpj);
      nomeFantasia = textoOpcional(entrada.nomeFantasia, 'nome fantasia', 150);
      if (await this.repositorio.existe('cnpj', cnpj.valor)) {
        throw new ErroDeNegocio('CNPJ_JA_CADASTRADO', 'Este CNPJ já possui conta.', 409);
      }
    }
    if (await this.repositorio.existe('email', emailValido)) {
      throw new ErroDeNegocio('EMAIL_JA_CADASTRADO', 'Este e-mail já está em uso.', 409);
    }
    if (await this.repositorio.existe('cpf', cpf.valor)) {
      throw new ErroDeNegocio('CPF_JA_CADASTRADO', 'Este CPF já possui conta.', 409);
    }

    return {
      dados: { tipoConta, nomeEmpresa, nomeFantasia, cnpj, nomeResponsavel, email: emailValido, cpf, dataNascimento },
      senha,
    };
  }

  protected construir({ dados, senha }: CriarBusiness): Business {
    return Business.criar(dados, senha);
  }

  protected async validarAtualizacao(entrada: any, atual: Business): Promise<AtualizarBusiness> {
    const dados: AtualizarBusiness = {
      nomeResponsavel: entrada.nomeResponsavel !== undefined ? texto(entrada.nomeResponsavel, 'nome completo', { min: 3, max: 150 }) : undefined,
      nomeFantasia: entrada.nomeFantasia !== undefined ? textoOpcional(entrada.nomeFantasia, 'nome fantasia', 150) ?? '' : undefined,
      email: entrada.email !== undefined ? email(entrada.email) : undefined,
    };
    if (atual.tipoConta === 'empresa' && entrada.nomeEmpresa !== undefined) {
      dados.nomeEmpresa = texto(entrada.nomeEmpresa, 'razão social', { min: 3, max: 150 });
    }
    if (atual.tipoConta === 'pessoa_fisica' && dados.nomeResponsavel) dados.nomeEmpresa = dados.nomeResponsavel;
    if (dados.email && (await this.repositorio.existe('email', dados.email, atual.id))) {
      throw new ErroDeNegocio('EMAIL_JA_CADASTRADO', 'Este e-mail já está em uso.', 409);
    }
    if (entrada.novaSenha) {
      if (!atual.verificarSenha(String(entrada.senhaAtual ?? ''))) {
        throw new ErroDeNegocio('SENHA_ATUAL_INCORRETA', 'Senha atual incorreta.');
      }
      dados.novaSenha = this.validarSenha(entrada.novaSenha, entrada.confirmacaoSenha);
    }
    return dados;
  }

  protected aplicarAlteracoes(business: Business, dados: AtualizarBusiness): void {
    business.atualizarPerfil(dados);
    if (dados.novaSenha) business.alterarSenha(dados.novaSenha);
  }

  protected pertenceAo(business: Business, businessId: string): boolean {
    return business.id === businessId;
  }

  /** Não deixa excluir conta com dinheiro parado: primeiro saque tudo. */
  protected verificarPodeRemover(business: Business): void {
    if (business.saldoDisponivel > 0) {
      throw new ErroDeNegocio('SALDO_PENDENTE', 'Saque todo o saldo antes de excluir a conta.');
    }
  }

  /** Cadastro é público: ainda não existe login, então o contexto vai vazio. */
  async cadastrar(entrada: unknown): Promise<Business> {
    return this.criar(entrada, {});
  }

  private validarSenha(senha: unknown, confirmacao: unknown): string {
    const valida = texto(senha, 'senha', { min: 8, max: 72 });
    if (confirmacao !== undefined && confirmacao !== senha) {
      throw new ErroDeNegocio('SENHAS_DIFERENTES', 'As senhas não coincidem.');
    }
    return valida;
  }
}
