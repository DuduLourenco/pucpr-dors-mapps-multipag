import type { Sequelize } from "sequelize";
import { Business as _Business } from "./business";
import type { BusinessAttributes, BusinessCreationAttributes } from "./business";
import { Cliente as _Cliente } from "./cliente";
import type { ClienteAttributes, ClienteCreationAttributes } from "./cliente";
import { Cobranca as _Cobranca } from "./cobranca";
import type { CobrancaAttributes, CobrancaCreationAttributes } from "./cobranca";
import { CobrancaItem as _CobrancaItem } from "./cobrancaItem";
import type { CobrancaItemAttributes, CobrancaItemCreationAttributes } from "./cobrancaItem";
import { CobrancaMetodoPagamento as _CobrancaMetodoPagamento } from "./cobrancaMetodoPagamento";
import type { CobrancaMetodoPagamentoAttributes, CobrancaMetodoPagamentoCreationAttributes } from "./cobrancaMetodoPagamento";
import { Movimentacao as _Movimentacao } from "./movimentacao";
import type { MovimentacaoAttributes, MovimentacaoCreationAttributes } from "./movimentacao";
import { Pagamento as _Pagamento } from "./pagamento";
import type { PagamentoAttributes, PagamentoCreationAttributes } from "./pagamento";
import { Saque as _Saque } from "./saque";
import type { SaqueAttributes, SaqueCreationAttributes } from "./saque";

export {
  _Business as Business,
  _Cliente as Cliente,
  _Cobranca as Cobranca,
  _CobrancaItem as CobrancaItem,
  _CobrancaMetodoPagamento as CobrancaMetodoPagamento,
  _Movimentacao as Movimentacao,
  _Pagamento as Pagamento,
  _Saque as Saque,
};

export type {
  BusinessAttributes,
  BusinessCreationAttributes,
  ClienteAttributes,
  ClienteCreationAttributes,
  CobrancaAttributes,
  CobrancaCreationAttributes,
  CobrancaItemAttributes,
  CobrancaItemCreationAttributes,
  CobrancaMetodoPagamentoAttributes,
  CobrancaMetodoPagamentoCreationAttributes,
  MovimentacaoAttributes,
  MovimentacaoCreationAttributes,
  PagamentoAttributes,
  PagamentoCreationAttributes,
  SaqueAttributes,
  SaqueCreationAttributes,
};

export function initModels(sequelize: Sequelize) {
  const Business = _Business.initModel(sequelize);
  const Cliente = _Cliente.initModel(sequelize);
  const Cobranca = _Cobranca.initModel(sequelize);
  const CobrancaItem = _CobrancaItem.initModel(sequelize);
  const CobrancaMetodoPagamento = _CobrancaMetodoPagamento.initModel(sequelize);
  const Movimentacao = _Movimentacao.initModel(sequelize);
  const Pagamento = _Pagamento.initModel(sequelize);
  const Saque = _Saque.initModel(sequelize);

  Cobranca.belongsTo(Business, { as: "business", foreignKey: "businessId"});
  Business.hasMany(Cobranca, { as: "cobrancas", foreignKey: "businessId"});
  Movimentacao.belongsTo(Business, { as: "business", foreignKey: "businessId"});
  Business.hasMany(Movimentacao, { as: "movimentacaos", foreignKey: "businessId"});
  Saque.belongsTo(Business, { as: "business", foreignKey: "businessId"});
  Business.hasMany(Saque, { as: "saques", foreignKey: "businessId"});
  Cobranca.belongsTo(Cliente, { as: "cliente", foreignKey: "clienteId"});
  Cliente.hasMany(Cobranca, { as: "cobrancas", foreignKey: "clienteId"});
  CobrancaItem.belongsTo(Cobranca, { as: "cobranca", foreignKey: "cobrancaId"});
  Cobranca.hasMany(CobrancaItem, { as: "cobrancaItems", foreignKey: "cobrancaId"});
  CobrancaMetodoPagamento.belongsTo(Cobranca, { as: "cobranca", foreignKey: "cobrancaId"});
  Cobranca.hasMany(CobrancaMetodoPagamento, { as: "cobrancaMetodoPagamentos", foreignKey: "cobrancaId"});
  Pagamento.belongsTo(Cobranca, { as: "cobranca", foreignKey: "cobrancaId"});
  Cobranca.hasMany(Pagamento, { as: "pagamentos", foreignKey: "cobrancaId"});
  Movimentacao.belongsTo(Pagamento, { as: "pagamento", foreignKey: "pagamentoId"});
  Pagamento.hasMany(Movimentacao, { as: "movimentacaos", foreignKey: "pagamentoId"});
  Movimentacao.belongsTo(Saque, { as: "saque", foreignKey: "saqueId"});
  Saque.hasMany(Movimentacao, { as: "movimentacaos", foreignKey: "saqueId"});

  return {
    Business: Business,
    Cliente: Cliente,
    Cobranca: Cobranca,
    CobrancaItem: CobrancaItem,
    CobrancaMetodoPagamento: CobrancaMetodoPagamento,
    Movimentacao: Movimentacao,
    Pagamento: Pagamento,
    Saque: Saque,
  };
}
