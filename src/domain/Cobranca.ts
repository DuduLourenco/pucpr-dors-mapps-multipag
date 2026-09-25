import { randomBytes } from 'node:crypto';
import { AppConfigSingleton } from '../config/AppConfigSingleton';
import { ErroDeNegocio } from '../shared/erros';
import { arredondar } from '../shared/validacao';
import type { Cpf } from './Cpf';
import { Entidade, type Persistido } from './Entidade';
import type { ItemCobranca } from './ItemCobranca';
import type { Criptomoeda, MetodoPagamento, Recorrencia, StatusCobranca } from './tipos';

export interface ConfigRecorrencia {
  tipo: Recorrencia;
  inicio?: string;
  /** undefined = sem data de término, até cancelar */
  repeticoes?: number;
}

export interface DadosCobranca {
  businessId: string;
  itens: ItemCobranca[];
  metodos: MetodoPagamento[];
  parcelasMaximas: number;
  criptomoedas: Criptomoeda[];
  recorrencia: ConfigRecorrencia;
  /** Sem CPF = link aberto: quem acessar informa o próprio CPF para pagar. */
  clienteCpf?: Cpf;
  clienteNome?: string;
  clienteEmail?: string;
}

/** Cobrança criada pelo business e paga pelo cliente via link único (RF03-RF06, RF10). */
export class Cobranca extends Entidade {
  readonly businessId: string;
  readonly linkToken: string;
  itens: ItemCobranca[];
  metodos: MetodoPagamento[];
  parcelasMaximas: number;
  criptomoedas: Criptomoeda[];
  recorrencia: ConfigRecorrencia;
  clienteCpf?: Cpf;
  clienteNome?: string;
  clienteEmail?: string;
  pagoEm?: Date;
  private statusAtual: StatusCobranca = 'pendente';

  private constructor(dados: DadosCobranca, linkToken: string, persistido?: Persistido) {
    super(persistido);
    this.businessId = dados.businessId;
    this.linkToken = linkToken;
    this.itens = dados.itens;
    this.metodos = [...new Set(dados.metodos)];
    this.parcelasMaximas = dados.parcelasMaximas;
    this.criptomoedas = dados.criptomoedas;
    this.recorrencia = dados.recorrencia;
    this.clienteCpf = dados.clienteCpf;
    this.clienteNome = dados.clienteNome;
    this.clienteEmail = dados.clienteEmail;
  }

  static criar(dados: DadosCobranca): Cobranca {
    return new Cobranca(dados, `mpg${randomBytes(5).toString('hex')}`);
  }

  static restaurar(
    dados: DadosCobranca,
    persistido: Persistido,
    extras: { linkToken: string; status: StatusCobranca; pagoEm?: Date },
  ): Cobranca {
    const cobranca = new Cobranca(dados, extras.linkToken, persistido);
    cobranca.statusAtual = extras.status;
    cobranca.pagoEm = extras.pagoEm;
    return cobranca;
  }

  get valor(): number {
    return arredondar(this.itens.reduce((total, item) => total + item.subtotal, 0));
  }

  /** "Consultoria mensal + Taxa de setup", como nas telas de pagamento. */
  get descricao(): string {
    return this.itens.map((i) => i.descricao).join(' + ');
  }

  /** Uma cobrança pendente vira "expirada" sozinha depois do prazo configurado. */
  get status(): StatusCobranca {
    if (this.statusAtual === 'pendente' && new Date() > this.expiraEm) return 'expirada';
    return this.statusAtual;
  }

  /** Status que vai para o banco (a expiração é calculada na leitura). */
  get statusPersistido(): StatusCobranca {
    return this.statusAtual;
  }

  get expiraEm(): Date {
    const dias = AppConfigSingleton.instancia().diasValidadeLink;
    return new Date(this.criadoEm.getTime() + dias * 24 * 60 * 60 * 1000);
  }

  get linkPagamento(): string {
    return `${AppConfigSingleton.instancia().urlBase}/#/pagar/${this.linkToken}`;
  }

  get linkAberto(): boolean {
    return !this.clienteCpf;
  }

  estaPendente(): boolean {
    return this.status === 'pendente';
  }

  aceita(metodo: MetodoPagamento): boolean {
    return this.metodos.includes(metodo);
  }

  garantirPendente(acao: string): void {
    if (!this.estaPendente()) {
      throw new ErroDeNegocio('COBRANCA_NAO_PENDENTE', `Não é possível ${acao}: a cobrança está "${this.status}".`);
    }
  }

  /** Edição completa (PUT): só permitida enquanto ninguém pagou. */
  atualizar(dados: Omit<DadosCobranca, 'businessId'>): void {
    this.garantirPendente('editar');
    this.itens = dados.itens;
    this.metodos = [...new Set(dados.metodos)];
    this.parcelasMaximas = dados.parcelasMaximas;
    this.criptomoedas = dados.criptomoedas;
    this.recorrencia = dados.recorrencia;
    this.clienteCpf = dados.clienteCpf;
    this.clienteNome = dados.clienteNome;
    this.clienteEmail = dados.clienteEmail;
  }

  marcarComoPaga(): void {
    this.garantirPendente('pagar');
    this.statusAtual = 'paga';
    this.pagoEm = new Date();
  }

  cancelar(): void {
    this.garantirPendente('cancelar');
    this.statusAtual = 'cancelada';
  }

  toJSON() {
    return {
      id: this.id,
      businessId: this.businessId,
      valor: this.valor,
      descricao: this.descricao,
      itens: this.itens,
      metodosPagamento: this.metodos,
      parcelasMaximas: this.parcelasMaximas,
      criptomoedas: this.criptomoedas,
      recorrencia: this.recorrencia,
      clienteNome: this.clienteNome ?? null,
      clienteCpf: this.clienteCpf?.formatado() ?? null,
      clienteEmail: this.clienteEmail ?? null,
      linkAberto: this.linkAberto,
      linkToken: this.linkToken,
      linkPagamento: this.linkPagamento,
      status: this.status,
      criadoEm: this.criadoEm,
      expiraEm: this.expiraEm,
      pagoEm: this.pagoEm ?? null,
    };
  }

  /** Versão para a tela pública do cliente: sem dados internos e com CPF mascarado. */
  paraCliente(nomeBusiness: string) {
    return {
      id: this.id,
      business: nomeBusiness,
      valor: this.valor,
      descricao: this.descricao,
      itens: this.itens,
      metodosPagamento: this.metodos,
      parcelasMaximas: this.parcelasMaximas,
      criptomoedas: this.criptomoedas,
      recorrencia: this.recorrencia,
      clienteNome: this.clienteNome ?? null,
      clienteCpf: this.clienteCpf?.mascarado() ?? null,
      linkAberto: this.linkAberto,
      status: this.status,
      expiraEm: this.expiraEm,
    };
  }
}
