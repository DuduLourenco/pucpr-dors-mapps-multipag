import type { Cobranca } from '../domain/Cobranca';
import { PixGatewayAdapter } from '../gateways/PixGatewayAdapter';
import { ProcessadorPagamentoTemplateMethod } from './ProcessadorPagamentoTemplateMethod';

/**
 * Pix não tem nenhuma regra extra: herda o fluxo inteiro e só informa
 * o método e o gateway. É o melhor exemplo do quanto o template reaproveita.
 */
export class ProcessadorPix extends ProcessadorPagamentoTemplateMethod {
  readonly metodo = 'pix' as const;
  readonly gateway = new PixGatewayAdapter();

  protected validarEspecifico(_cobranca: Cobranca): void {}
}
