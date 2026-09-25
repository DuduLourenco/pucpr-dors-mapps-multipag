import type { Movimentacao } from '../domain/Movimentacao';
import { ExportadorExtratoTemplateMethod, type ResumoExtrato } from './ExportadorExtratoTemplateMethod';

/** CSV com ";" (padrão do Excel em português) para conciliação em planilha. */
export class ExportadorCsv extends ExportadorExtratoTemplateMethod {
  readonly extensao = 'csv';
  readonly contentType = 'text/csv; charset=utf-8';

  protected cabecalho(): string {
    return 'data_hora;tipo;metodo;descricao;valor';
  }

  protected linha(m: Movimentacao): string {
    return [this.dataHora(m.criadoEm), m.tipo, m.metodo ?? '', m.descricao, m.valor.toFixed(2).replace('.', ',')]
      .map((campo) => this.escapar(campo))
      .join(';');
  }

  /** Sem rodapé: totais atrapalham quem importa o CSV em outra ferramenta. */
  protected rodape(_resumo: ResumoExtrato, _saldo: number): string {
    return '';
  }

  protected override separadorLinhas(): string {
    return '\r\n';
  }

  private escapar(campo: string): string {
    return /[;"\r\n]/.test(campo) ? `"${campo.replace(/"/g, '""')}"` : campo;
  }
}
