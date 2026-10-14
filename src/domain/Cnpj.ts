import { cnpjValido, formatarCnpj, limparCnpj } from 'multipag-validador-documentos';
import { ErroDeNegocio } from '../shared/erros';

/**
 * Value object de CNPJ. A validação vem do pacote multipag-validador-documentos,
 * que já aceita o CNPJ alfanumérico (letras nas 12 primeiras posições),
 * obrigatório a partir de julho/2026 — como no exemplo "45.976.F31/0001-95" do Figma.
 */
export class Cnpj {
  readonly valor: string;

  private constructor(valor: string) {
    this.valor = valor;
  }

  static criar(entrada: unknown): Cnpj {
    if (!Cnpj.valido(entrada)) {
      throw new ErroDeNegocio('CNPJ_INVALIDO', 'CNPJ inválido.');
    }
    return new Cnpj(limparCnpj(entrada));
  }

  static valido(entrada: unknown): boolean {
    return cnpjValido(entrada);
  }

  formatado(): string {
    return formatarCnpj(this.valor);
  }

  toJSON(): string {
    return this.formatado();
  }
}
