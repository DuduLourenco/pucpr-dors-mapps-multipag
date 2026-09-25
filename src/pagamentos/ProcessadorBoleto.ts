import type { Cobranca } from '../domain/Cobranca';
import { BoletoGatewayInterno } from '../gateways/BoletoGatewayInterno';
import { ErroDeNegocio } from '../shared/erros';
import { ProcessadorPagamentoTemplateMethod } from './ProcessadorPagamentoTemplateMethod';

const VALOR_MINIMO_BOLETO = 5;

export class ProcessadorBoleto extends ProcessadorPagamentoTemplateMethod {
  readonly metodo = 'boleto' as const;
  readonly gateway = new BoletoGatewayInterno();

  protected validarEspecifico(cobranca: Cobranca): void {
    if (cobranca.valor < VALOR_MINIMO_BOLETO) {
      throw new ErroDeNegocio('VALOR_MINIMO', `Boleto só pode ser emitido a partir de R$ ${VALOR_MINIMO_BOLETO},00.`);
    }
  }

  /** Boleto não é percentual: é uma tarifa fixa por título emitido. */
  protected calcularTaxa(): number {
    return this.config.tarifaFixaBoleto;
  }
}
