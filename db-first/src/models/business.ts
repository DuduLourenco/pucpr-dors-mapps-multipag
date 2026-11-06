import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { Cobranca, CobrancaId } from './cobranca';
import type { Movimentacao, MovimentacaoId } from './movimentacao';
import type { Saque, SaqueId } from './saque';

export interface BusinessAttributes {
  id: string;
  nomeEmpresa: string;
  email: string;
  cpf: string;
  dataNascimento: string;
  senhaHash: string;
  saldoDisponivel: number;
  criadoEm: Date;
  tipoConta: "pessoa_fisica" | "empresa";
  cnpj?: string;
  nomeFantasia?: string;
  nomeResponsavel?: string;
}

export type BusinessPk = "id";
export type BusinessId = Business[BusinessPk];
export type BusinessOptionalAttributes = "id" | "saldoDisponivel" | "criadoEm" | "tipoConta" | "cnpj" | "nomeFantasia" | "nomeResponsavel";
export type BusinessCreationAttributes = Optional<BusinessAttributes, BusinessOptionalAttributes>;

export class Business extends Model<BusinessAttributes, BusinessCreationAttributes> implements BusinessAttributes {
  id!: string;
  nomeEmpresa!: string;
  email!: string;
  cpf!: string;
  dataNascimento!: string;
  senhaHash!: string;
  saldoDisponivel!: number;
  criadoEm!: Date;
  tipoConta!: "pessoa_fisica" | "empresa";
  cnpj?: string;
  nomeFantasia?: string;
  nomeResponsavel?: string;

  // Business hasMany Cobranca via businessId
  cobrancas!: Cobranca[];
  getCobrancas!: Sequelize.HasManyGetAssociationsMixin<Cobranca>;
  setCobrancas!: Sequelize.HasManySetAssociationsMixin<Cobranca, CobrancaId>;
  addCobranca!: Sequelize.HasManyAddAssociationMixin<Cobranca, CobrancaId>;
  addCobrancas!: Sequelize.HasManyAddAssociationsMixin<Cobranca, CobrancaId>;
  createCobranca!: Sequelize.HasManyCreateAssociationMixin<Cobranca>;
  removeCobranca!: Sequelize.HasManyRemoveAssociationMixin<Cobranca, CobrancaId>;
  removeCobrancas!: Sequelize.HasManyRemoveAssociationsMixin<Cobranca, CobrancaId>;
  hasCobranca!: Sequelize.HasManyHasAssociationMixin<Cobranca, CobrancaId>;
  hasCobrancas!: Sequelize.HasManyHasAssociationsMixin<Cobranca, CobrancaId>;
  countCobrancas!: Sequelize.HasManyCountAssociationsMixin;
  // Business hasMany Movimentacao via businessId
  movimentacaos!: Movimentacao[];
  getMovimentacaos!: Sequelize.HasManyGetAssociationsMixin<Movimentacao>;
  setMovimentacaos!: Sequelize.HasManySetAssociationsMixin<Movimentacao, MovimentacaoId>;
  addMovimentacao!: Sequelize.HasManyAddAssociationMixin<Movimentacao, MovimentacaoId>;
  addMovimentacaos!: Sequelize.HasManyAddAssociationsMixin<Movimentacao, MovimentacaoId>;
  createMovimentacao!: Sequelize.HasManyCreateAssociationMixin<Movimentacao>;
  removeMovimentacao!: Sequelize.HasManyRemoveAssociationMixin<Movimentacao, MovimentacaoId>;
  removeMovimentacaos!: Sequelize.HasManyRemoveAssociationsMixin<Movimentacao, MovimentacaoId>;
  hasMovimentacao!: Sequelize.HasManyHasAssociationMixin<Movimentacao, MovimentacaoId>;
  hasMovimentacaos!: Sequelize.HasManyHasAssociationsMixin<Movimentacao, MovimentacaoId>;
  countMovimentacaos!: Sequelize.HasManyCountAssociationsMixin;
  // Business hasMany Saque via businessId
  saques!: Saque[];
  getSaques!: Sequelize.HasManyGetAssociationsMixin<Saque>;
  setSaques!: Sequelize.HasManySetAssociationsMixin<Saque, SaqueId>;
  addSaque!: Sequelize.HasManyAddAssociationMixin<Saque, SaqueId>;
  addSaques!: Sequelize.HasManyAddAssociationsMixin<Saque, SaqueId>;
  createSaque!: Sequelize.HasManyCreateAssociationMixin<Saque>;
  removeSaque!: Sequelize.HasManyRemoveAssociationMixin<Saque, SaqueId>;
  removeSaques!: Sequelize.HasManyRemoveAssociationsMixin<Saque, SaqueId>;
  hasSaque!: Sequelize.HasManyHasAssociationMixin<Saque, SaqueId>;
  hasSaques!: Sequelize.HasManyHasAssociationsMixin<Saque, SaqueId>;
  countSaques!: Sequelize.HasManyCountAssociationsMixin;

  static initModel(sequelize: Sequelize.Sequelize): typeof Business {
    return Business.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    nomeEmpresa: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: 'nome_empresa'
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: "business_email_key"
    },
    cpf: {
      type: DataTypes.CHAR(11),
      allowNull: false,
      unique: "business_cpf_key"
    },
    dataNascimento: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'data_nascimento'
    },
    senhaHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'senha_hash'
    },
    saldoDisponivel: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0,
      field: 'saldo_disponivel'
    },
    criadoEm: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.fn('now'),
      field: 'criado_em'
    },
    tipoConta: {
      type: DataTypes.ENUM("pessoa_fisica","empresa"),
      allowNull: false,
      defaultValue: "pessoa_fisica",
      field: 'tipo_conta'
    },
    cnpj: {
      type: DataTypes.CHAR(14),
      allowNull: true,
      unique: "business_cnpj_key"
    },
    nomeFantasia: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: 'nome_fantasia'
    },
    nomeResponsavel: {
      type: DataTypes.STRING(150),
      allowNull: true,
      field: 'nome_responsavel'
    }
  }, {
    sequelize,
    tableName: 'business',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "business_cnpj_key",
        unique: true,
        fields: [
          { name: "cnpj" },
        ]
      },
      {
        name: "business_cpf_key",
        unique: true,
        fields: [
          { name: "cpf" },
        ]
      },
      {
        name: "business_email_key",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "business_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
