import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { Cobranca, CobrancaId } from './cobranca';

export interface CobrancaItemAttributes {
  id: string;
  cobrancaId: string;
  descricao: string;
  quantidade: number;
  valorUnitario: number;
  ordem: number;
}

export type CobrancaItemPk = "id";
export type CobrancaItemId = CobrancaItem[CobrancaItemPk];
export type CobrancaItemOptionalAttributes = "id" | "ordem";
export type CobrancaItemCreationAttributes = Optional<CobrancaItemAttributes, CobrancaItemOptionalAttributes>;

export class CobrancaItem extends Model<CobrancaItemAttributes, CobrancaItemCreationAttributes> implements CobrancaItemAttributes {
  id!: string;
  cobrancaId!: string;
  descricao!: string;
  quantidade!: number;
  valorUnitario!: number;
  ordem!: number;

  // CobrancaItem belongsTo Cobranca via cobrancaId
  cobranca!: Cobranca;
  getCobranca!: Sequelize.BelongsToGetAssociationMixin<Cobranca>;
  setCobranca!: Sequelize.BelongsToSetAssociationMixin<Cobranca, CobrancaId>;
  createCobranca!: Sequelize.BelongsToCreateAssociationMixin<Cobranca>;

  static initModel(sequelize: Sequelize.Sequelize): typeof CobrancaItem {
    return CobrancaItem.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    cobrancaId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'cobranca',
        key: 'id'
      },
      field: 'cobranca_id'
    },
    descricao: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    quantidade: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    valorUnitario: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      field: 'valor_unitario'
    },
    ordem: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    tableName: 'cobranca_item',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "cobranca_item_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "idx_cobranca_item_cobranca",
        fields: [
          { name: "cobranca_id" },
        ]
      },
    ]
  });
  }
}
