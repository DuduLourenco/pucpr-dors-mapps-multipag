import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { Cobranca, CobrancaId } from './cobranca';

export interface CobrancaMetodoPagamentoAttributes {
  cobrancaId: string;
  metodo: "pix" | "cartao" | "boleto" | "cripto";
}

export type CobrancaMetodoPagamentoPk = "cobrancaId" | "metodo";
export type CobrancaMetodoPagamentoId = CobrancaMetodoPagamento[CobrancaMetodoPagamentoPk];
export type CobrancaMetodoPagamentoCreationAttributes = CobrancaMetodoPagamentoAttributes;

export class CobrancaMetodoPagamento extends Model<CobrancaMetodoPagamentoAttributes, CobrancaMetodoPagamentoCreationAttributes> implements CobrancaMetodoPagamentoAttributes {
  cobrancaId!: string;
  metodo!: "pix" | "cartao" | "boleto" | "cripto";

  // CobrancaMetodoPagamento belongsTo Cobranca via cobrancaId
  cobranca!: Cobranca;
  getCobranca!: Sequelize.BelongsToGetAssociationMixin<Cobranca>;
  setCobranca!: Sequelize.BelongsToSetAssociationMixin<Cobranca, CobrancaId>;
  createCobranca!: Sequelize.BelongsToCreateAssociationMixin<Cobranca>;

  static initModel(sequelize: Sequelize.Sequelize): typeof CobrancaMetodoPagamento {
    return CobrancaMetodoPagamento.init({
    cobrancaId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'cobranca',
        key: 'id'
      },
      field: 'cobranca_id'
    },
    metodo: {
      type: DataTypes.ENUM("pix","cartao","boleto","cripto"),
      allowNull: false,
      primaryKey: true
    }
  }, {
    sequelize,
    tableName: 'cobranca_metodo_pagamento',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "cobranca_metodo_pagamento_pkey",
        unique: true,
        fields: [
          { name: "cobranca_id" },
          { name: "metodo" },
        ]
      },
    ]
  });
  }
}
