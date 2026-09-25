import { BusinessService } from './crud/BusinessService';
import { CobrancaService } from './crud/CobrancaService';
import { SaqueService } from './crud/SaqueService';
import { BusinessRepositorio } from './repositorios/BusinessRepositorio';
import { PagamentoService } from './services/PagamentoService';

export const USUARIO_DEMO = { email: 'amanda@silvatech.com.br', senha: 'multipag123' };

/**
 * Cria a empresa das telas do Figma com algumas cobranças e pagamentos,
 * para o sistema já abrir com dados. Roda só se a conta demo não existir.
 */
export async function popularDadosDeExemplo(): Promise<void> {
  if (await new BusinessRepositorio().buscarPorEmail(USUARIO_DEMO.email)) return;

  const business = await new BusinessService().cadastrar({
    tipoConta: 'empresa',
    nomeEmpresa: 'Silva Tech Desenvolvimento de Software Ltda',
    nomeFantasia: 'Silva Tech Desenvolvimento',
    cnpj: '12.ABC.345/01DE-35',
    nomeResponsavel: 'Amanda Silva Vasconcelos',
    cpf: '412.890.312-40',
    dataNascimento: '1991-10-14',
    email: USUARIO_DEMO.email,
    senha: USUARIO_DEMO.senha,
  });
  const ctx = { businessId: business.id };
  const cobrancas = new CobrancaService();
  const pagamentos = new PagamentoService();

  const todosMetodos = {
    metodosPagamento: ['pix', 'cartao', 'boleto', 'cripto'],
    parcelasMaximas: 6,
    criptomoedas: ['BTC', 'USDT'],
  };

  const pagas = [
    { cliente: 'Maria Silva', cpf: '529.982.247-25', item: 'Landing page', valor: 350, pagar: { metodo: 'pix' } },
    {
      cliente: 'João Santos',
      cpf: '111.444.777-35',
      item: 'Sistema de agendamento',
      valor: 1200,
      pagar: { metodo: 'cartao', numeroCartao: '4242424242424242', nomeImpresso: 'JOAO SANTOS', validade: '09/29', cvv: '123', parcelas: 3 },
    },
    { cliente: 'Ana Costa', cpf: '390.533.447-05', item: 'Manutenção mensal', valor: 780, pagar: { metodo: 'boleto' } },
    { cliente: 'Pedro Lima', cpf: '987.654.321-00', item: 'Consultoria técnica', valor: 450.5, pagar: { metodo: 'cripto', criptomoeda: 'BTC' } },
  ];

  for (const p of pagas) {
    const cobranca = await cobrancas.criar(
      {
        ...todosMetodos,
        itens: [{ descricao: p.item, quantidade: 1, valorUnitario: p.valor }],
        clienteNome: p.cliente,
        clienteCpf: p.cpf,
      },
      ctx,
    );
    // Cartão confirma na hora; Pix, boleto e cripto confirmam pelo webhook alguns segundos depois.
    await pagamentos.pagar(cobranca.linkToken, { ...p.pagar, cpfPagador: p.cpf });
  }

  // Saque sobre o valor do cartão (único já confirmado neste momento).
  await new SaqueService().criar({ valor: 500, chavePix: USUARIO_DEMO.email }, ctx);

  // Cobranças em aberto, iguais às das telas do Figma.
  await cobrancas.criar(
    {
      ...todosMetodos,
      itens: [
        { descricao: 'Consultoria mensal', quantidade: 1, valorUnitario: 350 },
        { descricao: 'Taxa de setup', quantidade: 1, valorUnitario: 150 },
      ],
      recorrencia: { tipo: 'mensal', inicio: '2026-10-05', repeticoes: 12 },
      clienteNome: 'Guilherme Silva Santos',
      clienteCpf: '429.182.840-33',
      clienteEmail: 'guilherme@email.com',
    },
    ctx,
  );
  await cobrancas.criar(
    {
      metodosPagamento: ['pix', 'cartao'],
      parcelasMaximas: 3,
      itens: [{ descricao: 'Workshop de React', quantidade: 2, valorUnitario: 197 }],
      linkAberto: true,
    },
    ctx,
  );

  console.log(`Dados de exemplo criados. Login: ${USUARIO_DEMO.email} / ${USUARIO_DEMO.senha}`);
}
