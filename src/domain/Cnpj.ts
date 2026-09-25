import { ErroDeNegocio } from '../shared/erros';

/**
 * Value object de CNPJ. Já aceita o CNPJ alfanumérico (letras nas 12
 * primeiras posições), obrigatório a partir de julho/2026 — como no
 * exemplo "45.976.F31/0001-95" do Figma.
 */
export class Cnpj {
  readonly valor: string;

  private constructor(valor: string) {
    this.valor = valor;
  }

  static criar(entrada: unknown): Cnpj {
    const limpo = String(entrada ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '');
    if (!Cnpj.valido(limpo)) {
      throw new ErroDeNegocio('CNPJ_INVALIDO', 'CNPJ inválido.');
    }
    return new Cnpj(limpo);
  }

  static valido(cnpj: string): boolean {
    if (!/^[0-9A-Z]{12}\d{2}$/.test(cnpj) || /^(\d)\1{13}$/.test(cnpj)) return false;
    // Regra da Receita: cada caractere vale (código ASCII - 48), então '0'..'9' = 0..9 e 'A' = 17.
    const digitoVerificador = (base: string) => {
      const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
      const soma = [...base].reduce((acc, c, i) => acc + (c.charCodeAt(0) - 48) * pesos[i], 0);
      const resto = soma % 11;
      return resto < 2 ? 0 : 11 - resto;
    };
    const dv1 = digitoVerificador(cnpj.slice(0, 12));
    const dv2 = digitoVerificador(cnpj.slice(0, 12) + dv1);
    return cnpj.endsWith(`${dv1}${dv2}`);
  }

  formatado(): string {
    return this.valor.replace(/^(.{2})(.{3})(.{3})(.{4})(.{2})$/, '$1.$2.$3/$4-$5');
  }

  toJSON(): string {
    return this.formatado();
  }
}
