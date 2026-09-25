import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AppConfigSingleton } from '../src/config/AppConfigSingleton';
import { Business } from '../src/domain/Business';
import { Cnpj } from '../src/domain/Cnpj';
import { Cpf } from '../src/domain/Cpf';
import { Movimentacao } from '../src/domain/Movimentacao';
import { Pagamento } from '../src/domain/Pagamento';
import { Saque } from '../src/domain/Saque';
import { ExportadorCsv } from '../src/extrato/ExportadorCsv';
import { ExportadorTexto } from '../src/extrato/ExportadorTexto';
import { CartaoGatewayAdapter } from '../src/gateways/CartaoGatewayAdapter';
import { CriptoGatewayAdapter } from '../src/gateways/CriptoGatewayAdapter';
import { PixGatewayAdapter } from '../src/gateways/PixGatewayAdapter';
import { BancoPixSdk } from '../src/gateways/sdks/BancoPixSdk';
import { CryptoExchangeApi } from '../src/gateways/sdks/CryptoExchangeApi';
import { DatabaseSingleton } from '../src/infra/DatabaseSingleton';

// Os SDKs de sandbox chamam um webhook depois de alguns segundos; nos testes o atraso é enorme
// (e o timer é unref), então nada é chamado de verdade.
const SEM_WEBHOOK = { webhookUrl: 'http://localhost:0', callbackUrl: 'http://localhost:0', atrasoLiquidacaoMs: 3_600_000 };

describe('Singleton', () => {
  it('AppConfigSingleton devolve sempre a mesma instância, imutável', () => {
    const a = AppConfigSingleton.instancia();
    assert.equal(a, AppConfigSingleton.instancia());
    assert.throws(() => {
      (a as { porta: number }).porta = 1;
    });
  });

  it('DatabaseSingleton devolve sempre a mesma instância (mesmo pool de conexões)', () => {
    assert.equal(DatabaseSingleton.instancia(), DatabaseSingleton.instancia());
  });
});

describe('Adapter', () => {
  it('Pix: converte reais para o formato string do BACEN e ATIVA -> pendente', async () => {
    let recebido: any;
    const sdk = new BancoPixSdk('teste', SEM_WEBHOOK);
    const original = sdk.criarCobrancaImediata.bind(sdk);
    sdk.criarCobrancaImediata = async (req) => ((recebido = req), original(req));

    const resposta = await new PixGatewayAdapter(sdk).cobrar({ valor: 100, referencia: 'p1', cpfPagador: '12345678909', descricao: 'X' });
    assert.equal(recebido.valor.original, '100.00');
    assert.equal(recebido.devedor.cpf, '12345678909');
    assert.equal(resposta.situacao, 'pendente');
    assert.ok(resposta.instrucoes?.startsWith('000201'));
  });

  it('Pix: traduz o webhook do banco para o formato do MultiPag', () => {
    const aviso = new PixGatewayAdapter(new BancoPixSdk('t', SEM_WEBHOOK)).traduzirNotificacao({ pix: [{ txid: 'abc', endToEndId: 'E', valor: '1.00', horario: '' }] });
    assert.deepEqual(aviso, { transacaoExternaId: 'abc', aprovado: true });
  });

  it('Cartão: envia centavos e traduz recusa para português', async () => {
    const adapter = new CartaoGatewayAdapter();
    const cartao = { nomeImpresso: 'A B', validade: '12/30', cvv: '123', parcelas: 1 };
    const ok = await adapter.cobrar({ valor: 10.5, referencia: 'p', cpfPagador: '1', descricao: 'x', cartao: { ...cartao, numero: '4242424242424242' } });
    const recusado = await adapter.cobrar({ valor: 10.5, referencia: 'p', cpfPagador: '1', descricao: 'x', cartao: { ...cartao, numero: '4000000000000000' } });
    assert.equal(ok.situacao, 'aprovado');
    assert.equal(ok.detalhes?.cartaoFinal, '4242');
    assert.equal(recusado.situacao, 'recusado');
    assert.match(recusado.mensagem ?? '', /insuficiente/);
  });

  it('Cripto: consulta a cotação e converte reais para BTC', async () => {
    const adapter = new CriptoGatewayAdapter(new CryptoExchangeApi('k', SEM_WEBHOOK));
    const r = await adapter.cobrar({ valor: 392.37336, referencia: 'p', cpfPagador: '1', descricao: 'x', criptomoeda: 'BTC' });
    assert.equal(r.detalhes?.quantidade, '0.00100000');
    assert.equal(r.situacao, 'pendente');
  });
});

describe('Template Method: ExportadorExtratoTemplateMethod', () => {
  const business = Business.criar(
    {
      tipoConta: 'empresa', nomeEmpresa: 'Loja; "Teste"', nomeFantasia: 'Loja', cnpj: Cnpj.criar('12ABC34501DE35'),
      nomeResponsavel: 'Ana', email: 'a@a.com', cpf: Cpf.criar('52998224725'), dataNascimento: '1990-01-01',
    },
    'senha1234',
  );
  business.creditar(100);
  const pagamento = new Pagamento({ cobrancaId: 'c', metodo: 'pix', valorPago: 100, taxa: 0.99, cpfPagador: Cpf.criar('52998224725') });
  const movs = [
    Movimentacao.deSaque(new Saque({ businessId: business.id, valor: 30, chavePix: 'a@a.com' })),
    Movimentacao.deEntrada(business.id, pagamento, 'Cliente "VIP"; Maria'),
  ];

  it('mesmo resumo para qualquer formato (calculado no template)', () => {
    const resumo = ExportadorCsv.resumir(movs);
    assert.deepEqual(resumo, { entradas: 99.01, saques: 30, variacao: 69.01, quantidade: 2 });
  });

  it('CSV: cabeçalho, uma linha por movimentação e escape de ; e aspas', () => {
    const linhas = new ExportadorCsv().exportar(business, movs, '2026-09').split('\r\n');
    assert.equal(linhas[0], 'data_hora;tipo;metodo;descricao;valor');
    assert.equal(linhas.length, 3);
    assert.ok(linhas.some((l) => l.includes('"Cliente ""VIP""; Maria"')));
  });

  it('TXT: mesmo roteiro, formato de comprovante com totais', () => {
    const texto = new ExportadorTexto().exportar(business, movs, '2026-09');
    assert.match(texto, /CNPJ 12\.ABC\.345\/01DE-35/);
    assert.match(texto, /Entradas\s+\+ R\$\s99,01/);
  });
});

describe('Value objects', () => {
  it('CPF valida dígitos verificadores', () => {
    assert.equal(Cpf.criar('529.982.247-25').formatado(), '529.982.247-25');
    assert.throws(() => Cpf.criar('529.982.247-24'));
    assert.throws(() => Cpf.criar('111.111.111-11'));
  });

  it('CNPJ aceita o formato alfanumérico (exemplo oficial da Receita)', () => {
    assert.equal(Cnpj.criar('12.ABC.345/01DE-35').formatado(), '12.ABC.345/01DE-35');
    assert.equal(Cnpj.criar('11.222.333/0001-81').valor, '11222333000181');
    assert.throws(() => Cnpj.criar('45.976.F31/1111-11'));
  });
});
