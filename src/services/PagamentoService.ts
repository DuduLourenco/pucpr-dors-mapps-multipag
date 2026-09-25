import { Cpf } from '../domain/Cpf';
import { ehUmDe, type MetodoPagamento, METODOS_PAGAMENTO } from '../domain/tipos';
import type { ProcessadorPagamentoTemplateMethod } from '../pagamentos/ProcessadorPagamentoTemplateMethod';
import { ProcessadorBoleto } from '../pagamentos/ProcessadorBoleto';
import { ProcessadorCartao } from '../pagamentos/ProcessadorCartao';
import { ProcessadorCripto } from '../pagamentos/ProcessadorCripto';
import { ProcessadorPix } from '../pagamentos/ProcessadorPix';
import { BusinessRepositorio } from '../repositorios/BusinessRepositorio';
import { CobrancaRepositorio } from '../repositorios/CobrancaRepositorio';
import { PagamentoRepositorio } from '../repositorios/PagamentoRepositorio';
import { ErroDeNegocio, ErroNaoEncontrado } from '../shared/erros';

/** Lado do cliente final: ver a cobrança pelo link e pagar (RF10-RF12, RF15). */
export class PagamentoService {
  private readonly processadores: Record<MetodoPagamento, ProcessadorPagamentoTemplateMethod<any>> = {
    pix: new ProcessadorPix(),
    cartao: new ProcessadorCartao(),
    boleto: new ProcessadorBoleto(),
    cripto: new ProcessadorCripto(),
  };
  private readonly cobrancas = new CobrancaRepositorio();
  private readonly businesses = new BusinessRepositorio();
  private readonly pagamentos = new PagamentoRepositorio();

  async cobrancaPublica(token: string) {
    const cobranca = await this.cobrancas.buscarPorToken(token);
    if (!cobranca) throw new ErroNaoEncontrado('Cobrança');
    const business = await this.businesses.buscarPorId(cobranca.businessId);
    return {
      cobranca: cobranca.paraCliente(business?.nomeExibicao ?? 'MultiPag'),
      contatoVendedor: business?.email ?? null,
    };
  }

  async pagar(token: string, entrada: Record<string, unknown>) {
    const cobranca = await this.cobrancas.buscarPorToken(token);
    if (!cobranca) throw new ErroNaoEncontrado('Cobrança');
    if (!ehUmDe(METODOS_PAGAMENTO, entrada.metodo)) {
      throw new ErroDeNegocio('METODO_INVALIDO', 'Escolha como pagar.');
    }
    const cpf = Cpf.criar(entrada.cpfPagador);
    return this.processadores[entrada.metodo].processar(cobranca, cpf, entrada);
  }

  /** Usado pela tela "Aguardando pagamento..." para saber quando o webhook chegou. */
  async consultarPagamento(id: string) {
    const pagamento = await this.pagamentos.buscarPorId(id);
    if (!pagamento) throw new ErroNaoEncontrado('Pagamento');
    return pagamento;
  }

  async receberWebhook(metodo: string, payload: unknown) {
    if (!ehUmDe(METODOS_PAGAMENTO, metodo)) throw new ErroNaoEncontrado('Gateway');
    return this.processadores[metodo].receberNotificacao(payload);
  }
}
