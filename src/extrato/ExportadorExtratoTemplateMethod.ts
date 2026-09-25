import type { Business } from '../domain/Business';
import type { Movimentacao } from '../domain/Movimentacao';
import { arredondar } from '../shared/validacao';

export interface ResumoExtrato {
  entradas: number;
  saques: number;
  variacao: number;
  quantidade: number;
}

/**
 * PADRÃO TEMPLATE METHOD (exemplo 3 de 3): exportação do extrato
 *
 * Qualquer formato de exportação tem a mesma estrutura:
 *   cabeçalho -> uma linha por movimentação (em ordem cronológica) -> rodapé com totais
 * A ordenação e o cálculo dos totais (a parte que não pode divergir entre
 * formatos, por ser dado de auditoria, RNF09) ficam aqui. Cada formato só
 * diz como escrever cada pedaço.
 */
export abstract class ExportadorExtratoTemplateMethod {
  abstract readonly extensao: string;
  abstract readonly contentType: string;

  // TEMPLATE METHOD
  exportar(business: Business, movimentacoes: Movimentacao[], periodo: string): string {
    const ordenadas = [...movimentacoes].sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime());
    const resumo = ExportadorExtratoTemplateMethod.resumir(ordenadas);
    const partes = [
      this.cabecalho(business, periodo),
      ...ordenadas.map((m) => this.linha(m)),
      this.rodape(resumo, business.saldoDisponivel),
    ];
    return partes.filter((p) => p !== '').join(this.separadorLinhas());
  }

  static resumir(movimentacoes: Movimentacao[]): ResumoExtrato {
    const entradas = movimentacoes.filter((m) => m.ehEntrada()).reduce((s, m) => s + m.valor, 0);
    const saques = movimentacoes.filter((m) => !m.ehEntrada()).reduce((s, m) => s + Math.abs(m.valor), 0);
    return {
      entradas: arredondar(entradas),
      saques: arredondar(saques),
      variacao: arredondar(entradas - saques),
      quantidade: movimentacoes.length,
    };
  }

  // Passos que cada formato implementa
  protected abstract cabecalho(business: Business, periodo: string): string;
  protected abstract linha(movimentacao: Movimentacao): string;
  protected abstract rodape(resumo: ResumoExtrato, saldoAtual: number): string;

  // Gancho com padrão
  protected separadorLinhas(): string {
    return '\n';
  }

  // Utilitários reaproveitados pelas subclasses
  protected moeda(valor: number): string {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  protected dataHora(data: Date): string {
    return data.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  }
}
