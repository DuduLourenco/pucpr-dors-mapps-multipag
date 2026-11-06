import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { Cobranca, CobrancaId } from './cobranca';
import type { Movimentacao, MovimentacaoId } from './movimentacao';

export interface PagamentoAttributes {
  id: string;
  cobrancaId: string;
  metodoUtilizado: "pix" | "cartao" | "boleto" | "cripto";
  valorPago: number;
  cpfPagador: string;
  status: "pendente" | "confirmado" | "falhou";
  transacaoExternaId?: string;
  pagoEm: Date;
  taxa: number;
  instrucoes?: string;
  motivoFalha?: string;
  detalhes: object;
  confirmadoEm?: Date;
}

export type PagamentoPk = "id";
export type PagamentoId = Pagamento[PagamentoPk];
export type PagamentoOptionalAttributes = "id" | "status" | "transacaoExternaId" | "pagoEm" | "taxa" | "instrucoes" | "motivoFalha" | "detalhes" | "confirmadoEm";
export type PagamentoCreationAttributes = Optional<PagamentoAttributes, PagamentoOptionalAttributes>;

export class Pagamento extends Model<PagamentoAttributes, PagamentoCreationAttributes> implements PagamentoAttributes {
  id!: string;
  cobrancaId!: string;
  metodoUtilizado!: "pix" | "cartao" | "boleto" | "cripto";
  valorPago!: number;
  cpfPagador!: string;
  status!: "pendente" | "confirmado" | "falhou";
  transacaoExternaId?: string;
  pagoEm!: Date;
  taxa!: number;
  instrucoes?: string;
  motivoFalha?: string;
  detalhes!: object;
  confirmadoEm?: Date;

  // Pagamento belongsTo Cobranca via cobrancaId
  cobranca!: Cobranca;
  getCobranca!: Sequelize.BelongsToGetAssociationMixin<Cobranca>;
  setCobranca!: Sequelize.BelongsToSetAssociationMixin<Cobranca, CobrancaId>;
  createCobranca!: Sequelize.BelongsToCreateAssociationMixin<Cobranca>;
  // Pagamento hasMany Movimentacao via pagamentoId
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

  static initModel(sequelize: Sequelize.Sequelize): typeof Pagamento {
    return Pagamento.init({
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
    metodoUtilizado: {
      type: DataTypes.ENUM("pix","cartao","boleto","cripto"),
      allowNull: false,
      field: 'metodo_utilizado'
    },
    valorPago: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      field: 'valor_pago'
    },
    cpfPagador: {
      type: DataTypes.CHAR(11),
      allowNull: false,
      field: 'cpf_pagador'
    },
    status: {
      type: DataTypes.ENUM("pendente","confirmado","falhou"),
      allowNull: false,
      defaultValue: "pendente"
    },
    transacaoExternaId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'transacao_externa_id'
    },
    pagoEm: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.fn('now'),
      field: 'pago_em'
    },
    taxa: {
      type: DataTypes.DECIMAL,
      allowNull: false,
      defaultValue: 0
    },
    instrucoes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    motivoFalha: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'motivo_falha'
    },
    detalhes: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {}
    },
    confirmadoEm: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'confirmado_em'
    }
  }, {
    sequelize,
    tableName: 'pagamento',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "idx_pagamento_transacao",
        fields: [
          { name: "transacao_externa_id" },
        ]
      },
      {
        name: "pagamento_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
      {
        name: "ux_pagamento_confirmado",
        unique: true,
        fields: [
          { name: "cobranca_id" },
        ]
      },
    ]
  });
  }
}
