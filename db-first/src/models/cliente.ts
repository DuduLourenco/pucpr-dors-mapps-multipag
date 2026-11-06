import * as Sequelize from 'sequelize';
import { DataTypes, Model, Optional } from 'sequelize';
import type { Cobranca, CobrancaId } from './cobranca';

export interface ClienteAttributes {
  id: string;
  email: string;
  cpf: string;
  senhaHash: string;
  criadoEm: Date;
}

export type ClientePk = "id";
export type ClienteId = Cliente[ClientePk];
export type ClienteOptionalAttributes = "id" | "criadoEm";
export type ClienteCreationAttributes = Optional<ClienteAttributes, ClienteOptionalAttributes>;

export class Cliente extends Model<ClienteAttributes, ClienteCreationAttributes> implements ClienteAttributes {
  id!: string;
  email!: string;
  cpf!: string;
  senhaHash!: string;
  criadoEm!: Date;

  // Cliente hasMany Cobranca via clienteId
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

  static initModel(sequelize: Sequelize.Sequelize): typeof Cliente {
    return Cliente.init({
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: "cliente_email_key"
    },
    cpf: {
      type: DataTypes.CHAR(11),
      allowNull: false,
      unique: "cliente_cpf_key"
    },
    senhaHash: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'senha_hash'
    },
    criadoEm: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.fn('now'),
      field: 'criado_em'
    }
  }, {
    sequelize,
    tableName: 'cliente',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "cliente_cpf_key",
        unique: true,
        fields: [
          { name: "cpf" },
        ]
      },
      {
        name: "cliente_email_key",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "cliente_pkey",
        unique: true,
        fields: [
          { name: "id" },
        ]
      },
    ]
  });
  }
}
