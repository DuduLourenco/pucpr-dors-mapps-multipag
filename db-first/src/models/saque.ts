import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { Business, BusinessId } from './business';
import type { Movimentacao, MovimentacaoId } from './movimentacao';

export interface SaqueAttributes {
  id: string;
  businessId: string;
  valor: number;
  chavePix: string;
  status: "solicitado" | "processando" | "concluido" | "falhou";
  solicitadoEm: Date;
  concluidoEm?: Date;
}

export type SaquePk = "id";
export type SaqueId = Saque[SaquePk];
export type SaqueOptionalAttributes = "id" | "status" | "solicitadoEm" | "concluidoEm";
export type SaqueCreationAttributes = Optional<SaqueAttributes, SaqueOptionalAttributes>;

export class Saque extends Model<SaqueAttributes, SaqueCreationAttributes> implements SaqueAttributes {
  id!: string;
  businessId!: string;
  valor!: number;
  chavePix!: string;
  status!: "solicitado" | "processando" | "concluido" | "falhou";
  solicitadoEm!: Date;
  concluidoEm?: Date;

  // Saque belongsTo Business via businessId
  business!: Business;
  getBusiness!: Sequelize.BelongsToGetAssociationMixin<Business>;
  setBusiness!: Sequelize.BelongsToSetAssociationMixin<Business, BusinessId>;
  createBusiness!: Sequelize.BelongsToCreateAssociationMixin<Business>;
  // Saque hasMany Movimentacao via saqueId
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

  static initModel(sequelize: Sequelize.Sequelize): typeof Saque {
    return Saque.init({
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
    valor: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    chavePix: {
      type: DataTypes.STRING(150),
      allowNull: false,
      field: 'chave_pix'
    },
    status: {
      type: DataTypes.ENUM("solicitado","processando","concluido","falhou"),
      allowNull: false,
      defaultValue: "solicitado"
    },
    solicitadoEm: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.fn('now'),
      field: 'solicitado_em'
    },
    concluidoEm: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'concluido_em'
    }
  }, {
    sequelize,
    tableName: 'saque',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "saque_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
