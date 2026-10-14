import { cpfValido, formatarCpf, limparCpf, ocultarCpf } from 'multipag-validador-documentos';
import { ErroDeNegocio } from '../shared/erros';

/**
 * Value object de CPF. Toda entrada de CPF no sistema passa por aqui, e a
 * regra dos dígitos verificadores vem do pacote multipag-validador-documentos
 * (o mesmo que as telas usam), então ela existe em um único lugar.
 */
export class Cpf {
  readonly valor: string;

  private constructor(valor: string) {
    this.valor = valor;
  }

  static criar(entrada: unknown): Cpf {
    if (!Cpf.valido(entrada)) {
      throw new ErroDeNegocio('CPF_INVALIDO', 'CPF inválido.');
    }
    return new Cpf(limparCpf(entrada));
  }

  static valido(entrada: unknown): boolean {
    return cpfValido(entrada);
  }

  igual(outro: Cpf): boolean {
    return this.valor === outro.valor;
  }

  formatado(): string {
    return formatarCpf(this.valor);
  }

  /** Usado em telas públicas (link de pagamento) para não expor o CPF inteiro. */
  mascarado(): string {
    return ocultarCpf(this.valor);
  }

  toJSON(): string {
    return this.formatado();
  }
}
