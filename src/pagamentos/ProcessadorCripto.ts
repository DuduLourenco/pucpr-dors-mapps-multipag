import type { Cobranca } from '../domain/Cobranca';
import type { Pagamento } from '../domain/Pagamento';
import { CRIPTOMOEDAS, type Criptomoeda, ehUmDe } from '../domain/tipos';
import { CriptoGatewayAdapter } from '../gateways/CriptoGatewayAdapter';
import type { RequisicaoGateway } from '../gateways/GatewayPagamento';
import { ErroDeNegocio } from '../shared/erros';
import { ProcessadorPagamentoTemplateMethod } from './ProcessadorPagamentoTemplateMethod';

const VALOR_MINIMO_CRIPTO = 10;

export class ProcessadorCripto extends ProcessadorPagamentoTemplateMethod<Criptomoeda> {
  readonly metodo = 'cripto' as const;
  readonly gateway = new CriptoGatewayAdapter();

  protected validarEspecifico(cobranca: Cobranca, dados: Record<string, unknown>): Criptomoeda {
    if (cobranca.valor < VALOR_MINIMO_CRIPTO) {
      throw new ErroDeNegocio('VALOR_MINIMO', `Pagamento em cripto a partir de R$ ${VALOR_MINIMO_CRIPTO},00.`);
    }
    const moeda = dados.criptomoeda ?? cobranca.criptomoedas[0];
    if (!ehUmDe(CRIPTOMOEDAS, moeda) || !cobranca.criptomoedas.includes(moeda)) {
      throw new ErroDeNegocio('CRIPTO_NAO_ACEITA', 'Esta criptomoeda não é aceita nesta cobrança.');
    }
    return moeda;
  }

  protected montarRequisicao(cobranca: Cobranca, pagamento: Pagamento, moeda: Criptomoeda): RequisicaoGateway {
    return { ...super.montarRequisicao(cobranca, pagamento, moeda), criptomoeda: moeda };
  }
}
