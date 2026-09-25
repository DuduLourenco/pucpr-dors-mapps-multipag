import type { TipoMovimentacao } from '../domain/tipos';
import { ExportadorCsv } from '../extrato/ExportadorCsv';
import { ExportadorExtratoTemplateMethod } from '../extrato/ExportadorExtratoTemplateMethod';
import { ExportadorTexto } from '../extrato/ExportadorTexto';
import { BusinessRepositorio } from '../repositorios/BusinessRepositorio';
import { MovimentacaoRepositorio } from '../repositorios/MovimentacaoRepositorio';
import { ErroDeNegocio, ErroNaoEncontrado } from '../shared/erros';

const EXPORTADORES: Record<string, ExportadorExtratoTemplateMethod> = {
  csv: new ExportadorCsv(),
  txt: new ExportadorTexto(),
};

/** Tela de extrato (RF08) e exportação para auditoria (RNF09). */
export class ExtratoService {
  private readonly movimentacoes = new MovimentacaoRepositorio();
  private readonly businesses = new BusinessRepositorio();

  async consultar(businessId: string, filtro: { mes?: string; tipo?: string; limite?: number }) {
    const mes = this.validarMes(filtro.mes);
    const tipo = filtro.tipo === 'entrada_pagamento' || filtro.tipo === 'saque' ? (filtro.tipo as TipoMovimentacao) : undefined;
    const business = await this.businesses.buscarPorId(businessId);
    if (!business) throw new ErroNaoEncontrado('Conta');

    const doMes = await this.movimentacoes.filtrar(businessId, { mes });
    const lista = tipo ? doMes.filter((m) => m.tipo === tipo) : doMes;
    return {
      mes,
      resumo: ExportadorExtratoTemplateMethod.resumir(doMes),
      saldoDisponivel: business.saldoDisponivel,
      movimentacoes: filtro.limite ? lista.slice(0, filtro.limite) : lista,
    };
  }

  async exportar(businessId: string, formato: string, mesInformado?: string) {
    const exportador = EXPORTADORES[formato];
    if (!exportador) throw new ErroDeNegocio('FORMATO_INVALIDO', 'Formatos aceitos: csv, txt.', 400);
    const business = await this.businesses.buscarPorId(businessId);
    if (!business) throw new ErroNaoEncontrado('Conta');

    const mes = this.validarMes(mesInformado);
    const movimentacoes = await this.movimentacoes.filtrar(businessId, { mes });
    return {
      nomeArquivo: `extrato-${mes}.${exportador.extensao}`,
      contentType: exportador.contentType,
      conteudo: exportador.exportar(business, movimentacoes, mes),
    };
  }

  private validarMes(mes?: string): string {
    if (!mes) return new Date().toISOString().slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) throw new ErroDeNegocio('MES_INVALIDO', 'Mês deve estar no formato AAAA-MM.', 400);
    return mes;
  }
}
