import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { Business, BusinessId } from './business';
import type { Cliente, ClienteId } from './cliente';
import type { CobrancaItem, CobrancaItemId } from './cobrancaItem';
import type { CobrancaMetodoPagamento, CobrancaMetodoPagamentoId } from './cobrancaMetodoPagamento';
import type { Pagamento, PagamentoId } from './pagamento';

export interface CobrancaAttributes {
  id: string;
  businessId: string;
  clienteId?: string;
  clienteCpf?: string;
  clienteEmail?: string;
  valor: number;
  descricao?: string;
  linkPagamento: string;
  status: "pendente" | "paga" | "expirada" | "cancelada";
  criadoEm: Date;
  pagoEm?: Date;
  clienteNome?: string;
  recorrencia: string;
  recorrenciaInicio?: string;
  recorrenciaRepeticoes?: number;
  parcelasMaximas: number;
  criptomoedas: string[];
}

export type CobrancaPk = "id";
export type CobrancaId = Cobranca[CobrancaPk];
export type CobrancaOptionalAttributes = "id" | "clienteId" | "clienteCpf" | "clienteEmail" | "descricao" | "status" | "criadoEm" | "pagoEm" | "clienteNome" | "recorrencia" | "recorrenciaInicio" | "recorrenciaRepeticoes" | "parcelasMaximas" | "criptomoedas";
export type CobrancaCreationAttributes = Optional<CobrancaAttributes, CobrancaOptionalAttributes>;

export class Cobranca extends Model<CobrancaAttributes, CobrancaCreationAttributes> implements CobrancaAttributes {
  id!: string;
  businessId!: string;
  clienteId?: string;
  clienteCpf?: string;
  clienteEmail?: string;
  valor!: number;
  descricao?: string;
  linkPagamento!: string;
  status!: "pendente" | "paga" | "expirada" | "cancelada";
  criadoEm!: Date;
  pagoEm?: Date;
  clienteNome?: string;
  recorrencia!: string;
  recorrenciaInicio?: string;
  recorrenciaRepeticoes?: number;
  parcelasMaximas!: number;
  criptomoedas!: string[];

  // Cobranca belongsTo Business via businessId
  business!: Business;
  getBusiness!: Sequelize.BelongsToGetAssociationMixin<Business>;
  setBusiness!: Sequelize.BelongsToSetAssociationMixin<Business, BusinessId>;
  createBusiness!: Sequelize.BelongsToCreateAssociationMixin<Business>;
  // Cobranca belongsTo Cliente via clienteId
  cliente!: Cliente;
  getCliente!: Sequelize.BelongsToGetAssociationMixin<Cliente>;
  setCliente!: Sequelize.BelongsToSetAssociationMixin<Cliente, ClienteId>;
  createCliente!: Sequelize.BelongsToCreateAssociationMixin<Cliente>;
  // Cobranca hasMany CobrancaItem via cobrancaId
  cobrancaItems!: CobrancaItem[];
  getCobrancaItems!: Sequelize.HasManyGetAssociationsMixin<CobrancaItem>;
  setCobrancaItems!: Sequelize.HasManySetAssociationsMixin<CobrancaItem, CobrancaItemId>;
  addCobrancaItem!: Sequelize.HasManyAddAssociationMixin<CobrancaItem, CobrancaItemId>;
  addCobrancaItems!: Sequelize.HasManyAddAssociationsMixin<CobrancaItem, CobrancaItemId>;
  createCobrancaItem!: Sequelize.HasManyCreateAssociationMixin<CobrancaItem>;
  removeCobrancaItem!: Sequelize.HasManyRemoveAssociationMixin<CobrancaItem, CobrancaItemId>;
  removeCobrancaItems!: Sequelize.HasManyRemoveAssociationsMixin<CobrancaItem, CobrancaItemId>;
  hasCobrancaItem!: Sequelize.HasManyHasAssociationMixin<CobrancaItem, CobrancaItemId>;
  hasCobrancaItems!: Sequelize.HasManyHasAssociationsMixin<CobrancaItem, CobrancaItemId>;
  countCobrancaItems!: Sequelize.HasManyCountAssociationsMixin;
  // Cobranca hasMany CobrancaMetodoPagamento via cobrancaId
  cobrancaMetodoPagamentos!: CobrancaMetodoPagamento[];
  getCobrancaMetodoPagamentos!: Sequelize.HasManyGetAssociationsMixin<CobrancaMetodoPagamento>;
  setCobrancaMetodoPagamentos!: Sequelize.HasManySetAssociationsMixin<CobrancaMetodoPagamento, CobrancaMetodoPagamentoId>;
  addCobrancaMetodoPagamento!: Sequelize.HasManyAddAssociationMixin<CobrancaMetodoPagamento, CobrancaMetodoPagamentoId>;
  addCobrancaMetodoPagamentos!: Sequelize.HasManyAddAssociationsMixin<CobrancaMetodoPagamento, CobrancaMetodoPagamentoId>;
  createCobrancaMetodoPagamento!: Sequelize.HasManyCreateAssociationMixin<CobrancaMetodoPagamento>;
  removeCobrancaMetodoPagamento!: Sequelize.HasManyRemoveAssociationMixin<CobrancaMetodoPagamento, CobrancaMetodoPagamentoId>;
  removeCobrancaMetodoPagamentos!: Sequelize.HasManyRemoveAssociationsMixin<CobrancaMetodoPagamento, CobrancaMetodoPagamentoId>;
  hasCobrancaMetodoPagamento!: Sequelize.HasManyHasAssociationMixin<CobrancaMetodoPagamento, CobrancaMetodoPagamentoId>;
  hasCobrancaMetodoPagamentos!: Sequelize.HasManyHasAssociationsMixin<CobrancaMetodoPagamento, CobrancaMetodoPagamentoId>;
  countCobrancaMetodoPagamentos!: Sequelize.HasManyCountAssociationsMixin;
  // Cobranca hasMany Pagamento via cobrancaId
  pagamentos!: Pagamento[];
  getPagamentos!: Sequelize.HasManyGetAssociationsMixin<Pagamento>;
  setPagamentos!: Sequelize.HasManySetAssociationsMixin<Pagamento, PagamentoId>;
  addPagamento!: Sequelize.HasManyAddAssociationMixin<Pagamento, PagamentoId>;
  addPagamentos!: Sequelize.HasManyAddAssociationsMixin<Pagamento, PagamentoId>;
  createPagamento!: Sequelize.HasManyCreateAssociationMixin<Pagamento>;
  removePagamento!: Sequelize.HasManyRemoveAssociationMixin<Pagamento, PagamentoId>;
  removePagamentos!: Sequelize.HasManyRemoveAssociationsMixin<Pagamento, PagamentoId>;
  hasPagamento!: Sequelize.HasManyHasAssociationMixin<Pagamento, PagamentoId>;
  hasPagamentos!: Sequelize.HasManyHasAssociationsMixin<Pagamento, PagamentoId>;
  countPagamentos!: Sequelize.HasManyCountAssociationsMixin;

  static initModel(sequelize: Sequelize.Sequelize): typeof Cobranca {
    return Cobranca.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    businessId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'business',
        key: 'id'
      },
      field: 'business_id'
    },
    clienteId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'cliente',
        key: 'id'
      },
      field: 'cliente_id'
    },
    clienteCpf: {
      type: DataTypes.CHAR(11),
      allowNull: true,
      field: 'cliente_cpf'
    },
    clienteEmail: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: 'cliente_email'
    },
    valor: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    descricao: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    linkPagamento: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: "cobranca_link_pagamento_key",
      field: 'link_pagamento'
    },
    status: {
      type: DataTypes.ENUM("pendente","paga","expirada","cancelada"),
      allowNull: false,
      defaultValue: "pendente"
    },
    criadoEm: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.fn('now'),
      field: 'criado_em'
    },
    pagoEm: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'pago_em'
    },
    clienteNome: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: 'cliente_nome'
    },
    recorrencia: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "unica"
    },
    recorrenciaInicio: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'recorrencia_inicio'
    },
    recorrenciaRepeticoes: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'recorrencia_repeticoes'
    },
    parcelasMaximas: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: 1,
      field: 'parcelas_maximas'
    },
    criptomoedas: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: []
    }
  }, {
    sequelize,
    tableName: 'cobranca',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "cobranca_link_pagamento_key",
        unique: true,
        fields: [
          { name: "link_pagamento" },
        ]
      },
      {
        name: "cobranca_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_cobranca_business",
        fields: [
          { name: "business_id" },
        ]
      },
      {
        name: "idx_cobranca_cliente_cpf",
        fields: [
          { name: "cliente_cpf" },
        ]
      },
    ]
  });
  }
}
