import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { Business, BusinessId } from './business';
import type { Pagamento, PagamentoId } from './pagamento';
import type { Saque, SaqueId } from './saque';

export interface MovimentacaoAttributes {
  id: string;
  businessId: string;
  tipo: string;
  valor: number;
  pagamentoId?: string;
  saqueId?: string;
  descricao?: string;
  criadoEm: Date;
  metodo?: "pix" | "cartao" | "boleto" | "cripto";
}

export type MovimentacaoPk = "id";
export type MovimentacaoId = Movimentacao[MovimentacaoPk];
export type MovimentacaoOptionalAttributes = "id" | "pagamentoId" | "saqueId" | "descricao" | "criadoEm" | "metodo";
export type MovimentacaoCreationAttributes = Optional<MovimentacaoAttributes, MovimentacaoOptionalAttributes>;

export class Movimentacao extends Model<MovimentacaoAttributes, MovimentacaoCreationAttributes> implements MovimentacaoAttributes {
  id!: string;
  businessId!: string;
  tipo!: string;
  valor!: number;
  pagamentoId?: string;
  saqueId?: string;
  descricao?: string;
  criadoEm!: Date;
  metodo?: "pix" | "cartao" | "boleto" | "cripto";

  // Movimentacao belongsTo Business via businessId
  business!: Business;
  getBusiness!: Sequelize.BelongsToGetAssociationMixin<Business>;
  setBusiness!: Sequelize.BelongsToSetAssociationMixin<Business, BusinessId>;
  createBusiness!: Sequelize.BelongsToCreateAssociationMixin<Business>;
  // Movimentacao belongsTo Pagamento via pagamentoId
  pagamento!: Pagamento;
  getPagamento!: Sequelize.BelongsToGetAssociationMixin<Pagamento>;
  setPagamento!: Sequelize.BelongsToSetAssociationMixin<Pagamento, PagamentoId>;
  createPagamento!: Sequelize.BelongsToCreateAssociationMixin<Pagamento>;
  // Movimentacao belongsTo Saque via saqueId
  saque!: Saque;
  getSaque!: Sequelize.BelongsToGetAssociationMixin<Saque>;
  setSaque!: Sequelize.BelongsToSetAssociationMixin<Saque, SaqueId>;
  createSaque!: Sequelize.BelongsToCreateAssociationMixin<Saque>;

  static initModel(sequelize: Sequelize.Sequelize): typeof Movimentacao {
    return Movimentacao.init({
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
    tipo: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    valor: {
      type: DataTypes.DECIMAL,
      allowNull: false
    },
    pagamentoId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'pagamento',
        key: 'id'
      },
      field: 'pagamento_id'
    },
    saqueId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'saque',
        key: 'id'
      },
      field: 'saque_id'
    },
    descricao: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    criadoEm: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.fn('now'),
      field: 'criado_em'
    },
    metodo: {
      type: DataTypes.ENUM("pix","cartao","boleto","cripto"),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'movimentacao',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "idx_movimentacao_business",
        fields: [
          { name: "business_id" },
        ]
      },
      {
        name: "movimentacao_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
