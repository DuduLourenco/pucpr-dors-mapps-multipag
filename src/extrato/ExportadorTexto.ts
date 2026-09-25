import type { Business } from '../domain/Business';
import type { Movimentacao } from '../domain/Movimentacao';
import { ExportadorExtratoTemplateMethod, type ResumoExtrato } from './ExportadorExtratoTemplateMethod';

/** Extrato legível, no estilo comprovante bancário, para imprimir ou enviar. */
export class ExportadorTexto extends ExportadorExtratoTemplateMethod {
  readonly extensao = 'txt';
  readonly contentType = 'text/plain; charset=utf-8';
  private readonly largura = 64;

  protected cabecalho(business: Business, periodo: string): string {
    return [
      '='.repeat(this.largura),
      'MULTIPAG - EXTRATO DE MOVIMENTAÇÕES',
      business.nomeExibicao,
      business.cnpj ? `CNPJ ${business.cnpj.formatado()}` : `CPF ${business.cpf.mascarado()}`,
      `Período: ${periodo}`,
      '='.repeat(this.largura),
    ].join('\n');
  }

  protected linha(m: Movimentacao): string {
    const valor = `${m.ehEntrada() ? '+' : '-'} ${this.moeda(Math.abs(m.valor))}`;
    const descricao = `${m.descricao}${m.metodo ? ` (${m.metodo})` : ''}`.slice(0, 30);
    return `${this.dataHora(m.criadoEm).padEnd(20)} ${descricao.padEnd(30)} ${valor.padStart(12)}`;
  }

  protected rodape(resumo: ResumoExtrato, saldoAtual: number): string {
    const linha = (rotulo: string, valor: string) => `${rotulo.padEnd(this.largura - valor.length)}${valor}`;
    return [
      '-'.repeat(this.largura),
      linha('Entradas', `+ ${this.moeda(resumo.entradas)}`),
      linha('Saques', `- ${this.moeda(resumo.saques)}`),
      linha('Saldo disponível hoje', this.moeda(saldoAtual)),
      '='.repeat(this.largura),
    ].join('\n');
  }
}
