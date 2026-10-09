'use client';

// TELA 5 - Pagamento pelo cliente final (Figma: cobranca-recebida-cliente, pagamento-*, pagamento-retorno-*) | Membro 3
// CRUD: CREATE de Pagamento (POST /api/publico/cobrancas/:token/pagamentos) + READ do status (polling)
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Icone, type NomeIcone } from '../../../_componentes/Icone';
import { copiar } from '../../../_componentes/Toast';
import { Aviso, Botao, Carregando } from '../../../_componentes/ui';
import { api, mensagemDe } from '../../../_lib/api';
import { cpfValido, dataHora, mascaraCpf, moeda, soDigitos } from '../../../_lib/formato';
import { useCarregamento } from '../../../_lib/hooks';
import type { LinkPagamentoJson, MetodoPagamento, PagamentoJson } from '../../../_lib/tipos';

type CobrancaPublica = LinkPagamentoJson['cobranca'];
/** Envia o pagamento; lança o erro da API para a tela que chamou mostrar. */
type Pagar = (extras: Record<string, unknown>) => Promise<void>;

const INTERVALO_CONSULTA_MS = 2000;
const CRIPTOS: Record<string, string> = { BTC: 'Bitcoin', ETH: 'Ethereum', USDT: 'Tether' };
const NOMES: Record<MetodoPagamento, string> = { pix: 'Pix', cartao: 'Cartão de crédito', boleto: 'Boleto', cripto: 'Criptomoedas' };
const ICONES: Record<MetodoPagamento, NomeIcone> = { pix: 'raio', cartao: 'cartao', boleto: 'codigoBarras', cripto: 'bitcoin' };
const RECORRENCIAS: Record<string, string> = { semanal: 'Cobrança semanal', mensal: 'Cobrança mensal', anual: 'Cobrança anual' };

export default function Pagamento() {
  const { token } = useParams<{ token: string }>();
  const [link, setLink] = useState<LinkPagamentoJson | null>(null);
  const [erroLink, setErroLink] = useState('');

  useEffect(() => {
    let ativo = true;
    api<LinkPagamentoJson>(`/publico/cobrancas/${encodeURIComponent(token)}`).then(
      (dados) => ativo && setLink(dados),
      (erro) => ativo && setErroLink(mensagemDe(erro)),
    );
    return () => {
      ativo = false;
    };
  }, [token]);

  if (erroLink) {
    return (
      <div className="tela centro pilha-16" style={{ textAlign: 'center' }}>
        <Icone nome="xCirculo" tamanho={48} />
        <h1 className="titulo">Link inválido</h1>
        <p className="subtitulo">{erroLink}</p>
      </div>
    );
  }
  if (!link) return <Carregando />;
  return <Checkout token={token} cobranca={link.cobranca} contatoVendedor={link.contatoVendedor} />;
}

/** Decide qual passo mostrar: escolha do método, cartão, aguardando ou o retorno. */
function Checkout({ token, cobranca, contatoVendedor }: LinkPagamentoJson & { token: string }) {
  const [metodo, setMetodo] = useState(cobranca.metodosPagamento[0]);
  const [criptomoeda, setCriptomoeda] = useState(cobranca.criptomoedas[0]);
  const [cpf, setCpf] = useState('');
  const [cpfInvalido, setCpfInvalido] = useState(false);
  const [erro, setErro] = useState('');
  const [noCartao, setNoCartao] = useState(false);
  const [pagamento, setPagamento] = useState<PagamentoJson | null>(null);
  const [pagando, executar] = useCarregamento();

  const pagar: Pagar = async (extras) => {
    setPagamento(await api<PagamentoJson>(`/publico/cobrancas/${encodeURIComponent(token)}/pagamentos`, {
      metodo: 'POST',
      corpo: { metodo, cpfPagador: cpf, ...extras },
    }));
  };
  const voltarParaEscolha = () => {
    setPagamento(null);
    setNoCartao(false);
  };

  if (pagamento?.status === 'confirmado') return <Aprovado cobranca={cobranca} contatoVendedor={contatoVendedor} pagamento={pagamento} />;
  if (pagamento?.status === 'falhou') return <Recusado cobranca={cobranca} pagamento={pagamento} aoTentarDeNovo={voltarParaEscolha} />;
  // O gateway avisa o servidor por webhook; a tela só consulta até o status mudar.
  if (pagamento) return <Aguardando cobranca={cobranca} pagamento={pagamento} aoAtualizar={setPagamento} aoVoltar={voltarParaEscolha} />;
  if (cobranca.status !== 'pendente') return <Indisponivel cobranca={cobranca} />;
  if (noCartao) return <FormCartao cobranca={cobranca} pagar={pagar} aoVoltar={() => setNoCartao(false)} />;

  // ----------------------------------------------------- 1. escolher o método
  const detalhesMetodo: Record<MetodoPagamento, string> = {
    pix: 'Aprovação imediata',
    cartao: cobranca.parcelasMaximas > 1 ? `Em até ${cobranca.parcelasMaximas}x` : 'À vista',
    boleto: 'Vence em 3 dias',
    cripto: cobranca.criptomoedas.join(', '),
  };
  const recorrencia = RECORRENCIAS[cobranca.recorrencia.tipo];

  function continuar() {
    if (!cpfValido(cpf)) return setCpfInvalido(true);
    setCpfInvalido(false);
    setErro('');
    if (metodo === 'cartao') return setNoCartao(true);
    void executar(async () => {
      try {
        await pagar({ criptomoeda });
      } catch (falha) {
        setErro(mensagemDe(falha));
      }
    });
  }

  return (
    <form className="tela com-rodape" noValidate onSubmit={(e) => { e.preventDefault(); continuar(); }}>
      <header className="entre">
        <div>
          <b style={{ fontSize: 17 }}>{cobranca.business}</b>
          <p className="muted pequeno">Powered by <b style={{ color: 'var(--texto)' }}>Multi</b>Pag</p>
        </div>
      </header>
      <section className="card pilha">
        <div className="entre"><span className="rotulo-secao">Detalhes da cobrança</span><span className="chip chip-pendente">PENDENTE</span></div>
        <div className="lista-valores">
          {cobranca.itens.map((i, n) => <div key={n}><span>{i.descricao} <b>{i.quantidade}x</b></span><span className="mono">{moeda(i.subtotal)}</span></div>)}
        </div>
        <div className="divisor" />
        <div className="entre"><b>Total</b><span className="mono" style={{ fontSize: 24 }}>{moeda(cobranca.valor)}</span></div>
        {recorrencia && (
          <span className="chip chip-cinza" style={{ alignSelf: 'flex-start' }}>
            <Icone nome="repetir" tamanho={14} /> {recorrencia}{cobranca.recorrencia.repeticoes ? ` · ${cobranca.recorrencia.repeticoes}x` : ''}
          </span>
        )}
        {cobranca.clienteNome && <p className="muted pequeno">Para: <b>{cobranca.clienteNome}</b> ({cobranca.clienteCpf})</p>}
      </section>

      <section className="pilha">
        <h2 className="titulo-md" style={{ fontSize: 16 }}>Escolha como pagar</h2>
        <div className="grade-2">
          {cobranca.metodosPagamento.map((m) => (
            <button
              key={m}
              type="button"
              className={`escolha-metodo ${metodo === m ? 'ativa' : ''}`}
              aria-pressed={metodo === m}
              onClick={() => { setMetodo(m); setErro(''); setCpfInvalido(false); }}
            >
              <Icone nome={ICONES[m]} tamanho={22} /><b>{NOMES[m]}</b><small>{detalhesMetodo[m]}</small>
            </button>
          ))}
        </div>
        {metodo === 'cripto' && cobranca.criptomoedas.length > 1 && (
          <div className="pilulas">
            {cobranca.criptomoedas.map((c) => (
              <button key={c} type="button" className={`pilula contorno ${criptomoeda === c ? 'ativa' : ''}`} onClick={() => setCriptomoeda(c)}>{CRIPTOS[c]} ({c})</button>
            ))}
          </div>
        )}
      </section>

      <div className={`campo ${cpfInvalido ? 'erro' : ''}`}>
        <label htmlFor="cpf">CPF para o recibo</label>
        <input className="entrada mono" id="cpf" inputMode="numeric" placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(mascaraCpf(e.target.value))} />
        <span className="msg">{cpfInvalido ? 'CPF inválido' : 'Necessário para confirmar o pagamento'}</span>
      </div>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <div className="rodape-fixo">
        <Botao className="botao botao-primario" type="submit" carregando={pagando}>
          {metodo === 'cartao' ? 'Continuar' : <>Pagar <span className="mono">{moeda(cobranca.valor)}</span></>}
        </Botao>
        <Seguro />
      </div>
    </form>
  );
}

function Topo({ cobranca, aoVoltar }: { cobranca: CobrancaPublica; aoVoltar?: () => void }) {
  return (
    <>
      <header className="topo-simples">
        {aoVoltar && <a href="#" aria-label="Voltar" onClick={(e) => { e.preventDefault(); aoVoltar(); }}><Icone nome="voltar" tamanho={22} /></a>}
        <span>{cobranca.business}</span>
      </header>
      <div style={{ textAlign: 'center' }}>
        <p className="valor-grande">{moeda(cobranca.valor)}</p>
        <p className="muted">{cobranca.descricao}</p>
      </div>
    </>
  );
}

function Seguro() {
  return <p className="seguro"><Icone nome="cadeado" tamanho={14} /> Ambiente seguro certificado por MultiPag</p>;
}

// ----------------------------------------------------- 2a. formulário de cartão
function FormCartao({ cobranca, pagar, aoVoltar }: { cobranca: CobrancaPublica; pagar: Pagar; aoVoltar: () => void }) {
  const [cartao, setCartao] = useState({ numero: '', nome: '', validade: '', cvv: '', parcelas: 1 });
  const [erro, setErro] = useState('');
  const [pagando, executar] = useCarregamento();
  const mudar = (parcial: Partial<typeof cartao>) => setCartao({ ...cartao, ...parcial });

  async function enviar() {
    try {
      await pagar({ numeroCartao: cartao.numero, nomeImpresso: cartao.nome.toUpperCase(), validade: cartao.validade, cvv: cartao.cvv, parcelas: cartao.parcelas });
    } catch (falha) {
      setErro(mensagemDe(falha));
    }
  }

  return (
    <form className="tela com-rodape" noValidate onSubmit={(e) => { e.preventDefault(); void executar(enviar); }}>
      <Topo cobranca={cobranca} aoVoltar={aoVoltar} />
      <section className="card pilha-16">
        <div className="campo">
          <label htmlFor="numero">Número do cartão</label>
          <input className="entrada" id="numero" inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" value={cartao.numero} onChange={(e) => mudar({ numero: soDigitos(e.target.value).slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ') })} />
        </div>
        <div className="campo">
          <label htmlFor="nome">Nome impresso no cartão</label>
          <input className="entrada" id="nome" autoComplete="cc-name" style={{ textTransform: 'uppercase' }} value={cartao.nome} onChange={(e) => mudar({ nome: e.target.value })} />
        </div>
        <div className="grade-2">
          <div className="campo">
            <label htmlFor="validade">Validade</label>
            <input className="entrada" id="validade" inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" value={cartao.validade} onChange={(e) => mudar({ validade: soDigitos(e.target.value).slice(0, 4).replace(/(\d{2})(\d)/, '$1/$2') })} />
          </div>
          <div className="campo">
            <label htmlFor="cvv">CVV</label>
            <input className="entrada" id="cvv" inputMode="numeric" autoComplete="cc-csc" placeholder="•••" maxLength={4} type="password" value={cartao.cvv} onChange={(e) => mudar({ cvv: e.target.value })} />
          </div>
        </div>
        <div className="campo">
          <label htmlFor="parcelas">Parcelas</label>
          <select className="entrada" id="parcelas" value={cartao.parcelas} onChange={(e) => mudar({ parcelas: Number(e.target.value) })}>
            {Array.from({ length: cobranca.parcelasMaximas }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n}x de {moeda(cobranca.valor / n)}{n > 1 ? ' sem juros' : ''}</option>
            ))}
          </select>
        </div>
      </section>
      <Aviso>Pagamento seguro e criptografado, processado pela operadora do seu cartão.</Aviso>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}
      <div className="rodape-fixo">
        <Botao className="botao botao-primario" type="submit" carregando={pagando}>Pagar <span className="mono">{moeda(cobranca.valor)}</span></Botao>
        <Seguro />
      </div>
    </form>
  );
}

// ----------------------------------------------------- 2b. aguardando (Pix, boleto, cripto)
function Aguardando({ cobranca, pagamento: p, aoAtualizar, aoVoltar }: {
  cobranca: CobrancaPublica; pagamento: PagamentoJson; aoAtualizar: (atual: PagamentoJson) => void; aoVoltar: () => void;
}) {
  const instrucoes = p.instrucoes ?? '';
  const [restante, setRestante] = useState(() => Number(p.detalhes.expiraEmSegundos ?? 600));

  useEffect(() => {
    const expira = Date.now() + restante * 1000;
    const tick = setInterval(() => setRestante(Math.max(0, Math.round((expira - Date.now()) / 1000))), 1000);
    return () => clearInterval(tick);
    // O prazo é contado a partir de quando a tela abre.
  }, []);

  useEffect(() => {
    let ativo = true;
    const consulta = setInterval(async () => {
      try {
        const atual = await api<PagamentoJson>(`/publico/pagamentos/${p.id}`);
        if (ativo && atual.status !== 'pendente') aoAtualizar(atual);
      } catch { /* tenta de novo no próximo ciclo */ }
    }, INTERVALO_CONSULTA_MS);
    return () => {
      ativo = false;
      clearInterval(consulta);
    };
  }, [p.id, aoAtualizar]);

  const expiraEm = (
    <span className="chip chip-laranja" style={{ alignSelf: 'stretch', justifyContent: 'center', padding: 8 }}>
      <Icone nome="relogio" tamanho={14} /> Expira em <span>{String(Math.floor(restante / 60)).padStart(2, '0')}:{String(restante % 60).padStart(2, '0')}</span>
    </span>
  );
  const qrCode = (
    <div className="qr-caixa"><img src={`/api/publico/qrcode?texto=${encodeURIComponent(instrucoes)}`} alt="QR Code para pagamento" /></div>
  );
  const copiaCola = (rotulo: string) => (
    <>
      <span className="rotulo-secao">{rotulo}</span>
      <div className="copia-cola">
        <input className="entrada" readOnly value={instrucoes} aria-label={rotulo} />
        <button type="button" className="botao botao-primario botao-pequeno" onClick={() => copiar(instrucoes, 'Código copiado!')}><Icone nome="copiar" tamanho={16} /> Copiar</button>
      </div>
    </>
  );

  return (
    <div className="tela">
      <Topo cobranca={cobranca} aoVoltar={aoVoltar} />
      {p.metodo === 'boleto' && (
        <p className="muted" style={{ textAlign: 'center', marginTop: -12 }}>Vencimento em {new Date(`${p.detalhes.vencimento}T12:00`).toLocaleDateString('pt-BR')}</p>
      )}
      <section className="card pilha-16">
        {p.metodo === 'pix' && <>{expiraEm}{qrCode}{copiaCola('Pix copia e cola')}</>}
        {p.metodo === 'boleto' && (
          <>
            <div className="codigo-barras" aria-hidden="true"><Barras linha={instrucoes} /></div>
            <p className="linha-digitavel">{instrucoes}</p>
            <div className="grade-2">
              <button type="button" className="botao botao-secundario" onClick={() => copiar(instrucoes, 'Código copiado!')}>Copiar código</button>
              <button type="button" className="botao botao-secundario" onClick={() => window.print()}>Imprimir</button>
            </div>
          </>
        )}
        {p.metodo === 'cripto' && (
          <>
            {expiraEm}
            <div style={{ textAlign: 'center' }}>
              <p>Envie exatamente</p>
              <p className="mono" style={{ fontSize: 30 }}>{String(p.detalhes.quantidade).replace('.', ',')} {p.detalhes.criptomoeda}</p>
              <p className="muted">para a carteira abaixo:</p>
            </div>
            {qrCode}
            {copiaCola('Carteira destino')}
          </>
        )}
      </section>
      <Aviso>
        {p.metodo === 'boleto'
          ? 'A confirmação pode levar até 2 dias úteis após o pagamento.'
          : 'Assim que o pagamento for identificado, você verá a confirmação automaticamente.'}
      </Aviso>
      <p className="aguardando"><Icone nome="carregando" tamanho={18} classe="girando" /> Aguardando pagamento...</p>
    </div>
  );
}

/** Desenha barras de código de barras a partir dos dígitos (visual, não é um ITF real). */
function Barras({ linha }: { linha: string }) {
  return [...soDigitos(linha)].map((d, i) => (
    <i key={i} style={{ flex: `${1 + (Number(d) % 3)} 0 0`, marginRight: 1 + ((Number(d) + i) % 2) }} />
  ));
}

// ----------------------------------------------------- 3. retorno
function Aprovado({ cobranca, contatoVendedor, pagamento: p }: LinkPagamentoJson & { pagamento: PagamentoJson }) {
  const linhas: [string, string | number][] = [
    ['Identificação', `#${(p.transacaoExternaId ?? '').slice(0, 14).toUpperCase()}`],
    ['Data/Hora', p.confirmadoEm ? dataHora(p.confirmadoEm) : ''],
  ];
  if (p.metodo === 'cartao') linhas.push(['Cartão final', p.detalhes.cartaoFinal], ['Parcelas', `${p.detalhes.parcelas}x`]);
  if (p.metodo === 'cripto') {
    linhas.push(
      ['Criptomoeda', CRIPTOS[p.detalhes.criptomoeda] ?? p.detalhes.criptomoeda],
      ['Cotação', moeda(Number(p.detalhes.cotacao))],
      ['Quantidade', `${String(p.detalhes.quantidade).replace('.', ',')} ${p.detalhes.criptomoeda}`],
    );
  }

  return (
    <div className="tela com-rodape">
      <Topo cobranca={cobranca} />
      <section className="card pilha-16" style={{ textAlign: 'center' }}>
        <div className="selo-sucesso"><Icone nome="check" tamanho={40} /></div>
        <p>{p.metodo === 'pix' ? 'Pagamento PIX aprovado!' : 'Pagamento aprovado!'}</p>
        <div className="card compacto pilha" style={{ textAlign: 'left' }}>
          <b>Detalhes da transação</b>
          <div className="lista-valores">
            {linhas.map(([rotulo, valor]) => <div key={rotulo}><span>{rotulo}</span><span className="mono">{valor}</span></div>)}
          </div>
        </div>
      </section>
      <Aviso>A entrega dos produtos comprados é de responsabilidade do vendedor. Em caso de dúvidas entre em contato com ele.</Aviso>
      <div className="rodape-fixo sem-borda">
        {contatoVendedor && (
          <a className="botao botao-secundario" href={`mailto:${contatoVendedor}?subject=${encodeURIComponent(`Pagamento: ${cobranca.descricao}`)}`}>
            <Icone nome="mensagem" /> Conversar com o vendedor
          </a>
        )}
        <p className="seguro" style={{ color: 'var(--verde-escuro)', fontWeight: 600, fontSize: 15 }}><Icone nome="checkCirculo" tamanho={18} /> Pagamento aprovado!</p>
      </div>
    </div>
  );
}

function Recusado({ cobranca, pagamento, aoTentarDeNovo }: { cobranca: CobrancaPublica; pagamento: PagamentoJson; aoTentarDeNovo: () => void }) {
  return (
    <div className="tela com-rodape">
      <Topo cobranca={cobranca} />
      <section className="card pilha-16" style={{ textAlign: 'center' }}>
        <div className="selo-sucesso selo-erro"><Icone nome="xCirculo" tamanho={40} /></div>
        <p><b>Pagamento não aprovado</b></p>
        <p className="muted">{pagamento.motivoFalha ?? 'Tente outro método de pagamento.'}</p>
      </section>
      <div className="rodape-fixo sem-borda"><button className="botao botao-primario" onClick={aoTentarDeNovo}>Tentar novamente</button></div>
    </div>
  );
}

function Indisponivel({ cobranca }: { cobranca: CobrancaPublica }) {
  const paga = cobranca.status === 'paga';
  const [titulo, texto] = {
    paga: ['Cobrança já paga', 'Este link já foi utilizado. Obrigado!'],
    cancelada: ['Cobrança cancelada', 'O vendedor cancelou esta cobrança.'],
    expirada: ['Link expirado', 'Peça um novo link ao vendedor.'],
    pendente: ['', ''],
  }[cobranca.status];

  return (
    <div className="tela com-rodape">
      <Topo cobranca={cobranca} />
      <section className="card pilha-16" style={{ textAlign: 'center' }}>
        <div className={`selo-sucesso ${paga ? '' : 'selo-erro'}`}><Icone nome={paga ? 'check' : 'info'} tamanho={40} /></div>
        <h1 className="titulo-md">{titulo}</h1>
        <p className="muted">{texto}</p>
      </section>
    </div>
  );
}
