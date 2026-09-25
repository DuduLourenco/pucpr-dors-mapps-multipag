import type { Cobranca } from '../domain/Cobranca';
import type { Pagamento } from '../domain/Pagamento';
import { CartaoGatewayAdapter } from '../gateways/CartaoGatewayAdapter';
import type { RequisicaoGateway } from '../gateways/GatewayPagamento';
import { ErroDeNegocio } from '../shared/erros';
import { arredondar } from '../shared/validacao';
import { ProcessadorPagamentoTemplateMethod } from './ProcessadorPagamentoTemplateMethod';

interface DadosCartao {
  numero: string;
  nomeImpresso: string;
  validade: string;
  cvv: string;
  parcelas: number;
}

/** Custo extra para o lojista por parcela além da primeira (parcelado sem juros para o cliente). */
const TAXA_POR_PARCELA_EXTRA = 0.01;

export class ProcessadorCartao extends ProcessadorPagamentoTemplateMethod<DadosCartao> {
  readonly metodo = 'cartao' as const;
  readonly gateway = new CartaoGatewayAdapter();

  protected validarEspecifico(cobranca: Cobranca, dados: Record<string, unknown>): DadosCartao {
    const numero = String(dados.numeroCartao ?? '').replace(/\D/g, '');
    const nomeImpresso = String(dados.nomeImpresso ?? '').trim();
    const validade = String(dados.validade ?? '').trim();
    const cvv = String(dados.cvv ?? '').trim();
    const parcelas = Number(dados.parcelas ?? 1);

    if (!/^\d{13,19}$/.test(numero)) throw new ErroDeNegocio('CARTAO_INVALIDO', 'Número do cartão inválido.');
    if (nomeImpresso.length < 2) throw new ErroDeNegocio('CARTAO_INVALIDO', 'Informe o nome impresso no cartão.');
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(validade)) throw new ErroDeNegocio('CARTAO_INVALIDO', 'Validade deve estar no formato MM/AA.');
    if (!/^\d{3,4}$/.test(cvv)) throw new ErroDeNegocio('CARTAO_INVALIDO', 'CVV inválido.');
    if (!Number.isInteger(parcelas) || parcelas < 1 || parcelas > cobranca.parcelasMaximas) {
      throw new ErroDeNegocio('PARCELAS_INVALIDAS', `Esta cobrança pode ser parcelada em até ${cobranca.parcelasMaximas}x.`);
    }
    return { numero, nomeImpresso, validade, cvv, parcelas };
  }

  protected calcularTaxa(valor: number, cartao: DadosCartao): number {
    const extra = arredondar(valor * TAXA_POR_PARCELA_EXTRA * (cartao.parcelas - 1));
    return arredondar(super.calcularTaxa(valor, cartao) + extra);
  }

  protected montarRequisicao(cobranca: Cobranca, pagamento: Pagamento, cartao: DadosCartao): RequisicaoGateway {
    return { ...super.montarRequisicao(cobranca, pagamento, cartao), cartao };
  }
}
