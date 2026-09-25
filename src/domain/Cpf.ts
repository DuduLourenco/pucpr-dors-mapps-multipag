import { ErroDeNegocio } from '../shared/erros';

/**
 * Value object de CPF. Toda entrada de CPF no sistema passa por aqui,
 * então a regra dos dígitos verificadores existe em um único lugar.
 */
export class Cpf {
  readonly valor: string;

  private constructor(valor: string) {
    this.valor = valor;
  }

  static criar(entrada: unknown): Cpf {
    const digitos = String(entrada ?? '').replace(/\D/g, '');
    if (!Cpf.valido(digitos)) {
      throw new ErroDeNegocio('CPF_INVALIDO', 'CPF inválido.');
    }
    return new Cpf(digitos);
  }

  static valido(digitos: string): boolean {
    if (!/^\d{11}$/.test(digitos) || /^(\d)\1{10}$/.test(digitos)) return false;
    const digitoVerificador = (tamanho: number) => {
      let soma = 0;
      for (let i = 0; i < tamanho; i++) soma += Number(digitos[i]) * (tamanho + 1 - i);
      const resto = (soma * 10) % 11;
      return resto === 10 ? 0 : resto;
    };
    return digitoVerificador(9) === Number(digitos[9]) && digitoVerificador(10) === Number(digitos[10]);
  }

  igual(outro: Cpf): boolean {
    return this.valor === outro.valor;
  }

  formatado(): string {
    return this.valor.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }

  /** Usado em telas públicas (link de pagamento) para não expor o CPF inteiro. */
  mascarado(): string {
    return `***.${this.valor.slice(3, 6)}.${this.valor.slice(6, 9)}-**`;
  }

  toJSON(): string {
    return this.formatado();
  }
}
