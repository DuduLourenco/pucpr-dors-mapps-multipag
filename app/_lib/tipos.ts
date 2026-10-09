import type { Business } from '../../src/domain/Business';
import type { Cobranca } from '../../src/domain/Cobranca';
import type { Movimentacao } from '../../src/domain/Movimentacao';
import type { Pagamento } from '../../src/domain/Pagamento';
import type { Saque } from '../../src/domain/Saque';
import type { ExtratoService } from '../../src/services/ExtratoService';
import type { PagamentoService } from '../../src/services/PagamentoService';

export type { Criptomoeda, MetodoPagamento, StatusCobranca, StatusSaque, TipoConta } from '../../src/domain/tipos';

/**
 * Como um valor do back-end chega pelo JSON da API: o que tem toJSON()
 * (entidades, Date) vira o retorno dele. Os tipos das telas são derivados
 * das próprias entidades, então front e back não saem de sincronia.
 */
type Json<T> = T extends { toJSON(): infer R } ? Json<R> : T extends object ? { [K in keyof T]: Json<T[K]> } : T;

export type BusinessJson = Json<Business>;
export type CobrancaJson = Json<Cobranca>;
export type PagamentoJson = Json<Pagamento>;
export type SaqueJson = Json<Saque>;
export type MovimentacaoJson = Json<Movimentacao>;
export type ExtratoJson = Json<Awaited<ReturnType<ExtratoService['consultar']>>>;
/** Resposta de GET /api/publico/cobrancas/:token (o que o cliente final enxerga). */
export type LinkPagamentoJson = Json<Awaited<ReturnType<PagamentoService['cobrancaPublica']>>>;
