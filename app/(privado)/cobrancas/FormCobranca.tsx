'use client';

// TELA 3 - Nova / editar cobrança em 5 etapas (Figma: criar-cobranca-etapa-1..5) | Membro 2
// CRUD: CREATE (POST /api/cobrancas) e UPDATE (PUT /api/cobrancas/:id)
import Link from 'next/link';
import { type ReactNode, useState } from 'react';
import { Icone, type NomeIcone } from '../../_componentes/Icone';
import { copiar } from '../../_componentes/Toast';
import { Aviso, Botao, Etapas, Logo } from '../../_componentes/ui';
import { api, codigoDe, mensagemDe } from '../../_lib/api';
import { cpfValido, emailValido, mascaraCpf, moeda, soDigitos } from '../../_lib/formato';
import { useCarregamento } from '../../_lib/hooks';
import type { CobrancaJson, Criptomoeda, MetodoPagamento } from '../../_lib/tipos';

type Frequencia = 'semanal' | 'mensal' | 'anual';

const ROTULOS = ['Produtos', 'Métodos de Pagamento', 'Recorrência', 'Pagador', 'Revisão'];
const FREQUENCIAS: Record<Frequencia, string> = { semanal: 'Semanal', mensal: 'Mensal', anual: 'Anual' };
const CRIPTOS: Record<Criptomoeda, string> = { BTC: 'Bitcoin (BTC)', ETH: 'Ethereum (ETH)', USDT: 'Tether (USDT)' };
const METODOS: Record<MetodoPagamento, { nome: string; desc: string; icone: NomeIcone }> = {
  pix: { nome: 'Pix', desc: 'Recebimento instantâneo', icone: 'raio' },
  cartao: { nome: 'Cartão de crédito', desc: 'Bandeiras Visa, Master, Elo e Amex', icone: 'cartao' },
  boleto: { nome: 'Boleto bancário', desc: 'Compensação em até 2 dias úteis', icone: 'codigoBarras' },
  cripto: { nome: 'Criptomoedas', desc: 'Bitcoin, Ethereum e stablecoins', icone: 'carteira' },
};
const LISTA_METODOS = Object.keys(METODOS) as MetodoPagamento[];
const LISTA_CRIPTOS = Object.keys(CRIPTOS) as Criptomoeda[];
/** Em qual etapa corrigir cada erro devolvido pela API. */
const ETAPA_DO_ERRO: Record<string, number> = {
  ITENS_INVALIDOS: 1, VALOR_INVALIDO: 1, CAMPO_INVALIDO: 1, METODOS_INVALIDOS: 2, PARCELAS_INVALIDAS: 2,
  CRIPTO_INVALIDA: 2, RECORRENCIA_INVALIDA: 3, DATA_INVALIDA: 3, CPF_INVALIDO: 4, EMAIL_INVALIDO: 4,
};

interface Item {
  descricao: string;
  quantidade: number;
  /** Texto como digitado ("1.200,50"); vira número só na hora de somar e enviar. */
  valorUnitario: string;
}

interface Estado {
  etapa: number;
  itens: Item[];
  metodos: Record<MetodoPagamento, boolean>;
  parcelasMaximas: number;
  criptomoedas: Criptomoeda[];
  recorrente: boolean;
  frequencia: Frequencia;
  inicio: string;
  semTermino: boolean;
  repeticoes: string;
  linkAberto: boolean;
  clienteNome: string;
  clienteCpf: string;
  clienteEmail: string;
  erro: string;
  errosCampos: { clienteCpf?: string; clienteEmail?: string };
}

/** "1.200,50" | "1200.5" | "350" -> 1200.5 */
function paraNumero(texto: string) {
  const t = texto.trim();
  const n = t.includes(',') ? Number(t.replace(/\./g, '').replace(',', '.')) : Number(t);
  return Number.isFinite(n) ? n : 0;
}
const paraTexto = (n: number) => (n ? n.toFixed(2).replace('.', ',') : '');

function estadoInicial(): Estado {
  const proximoMes = new Date();
  proximoMes.setMonth(proximoMes.getMonth() + 1, 5);
  return {
    etapa: 1,
    itens: [{ descricao: '', quantidade: 1, valorUnitario: '' }],
    metodos: { pix: true, cartao: true, boleto: false, cripto: false },
    parcelasMaximas: 6,
    criptomoedas: ['BTC'],
    recorrente: false,
    frequencia: 'mensal',
    inicio: proximoMes.toISOString().slice(0, 10),
    semTermino: false,
    repeticoes: '12',
    linkAberto: false,
    clienteNome: '',
    clienteCpf: '',
    clienteEmail: '',
    erro: '',
    errosCampos: {},
  };
}

function estadoDaCobranca(c: CobrancaJson): Estado {
  const e = estadoInicial();
  const recorrente = c.recorrencia.tipo !== 'unica';
  return {
    ...e,
    itens: c.itens.map((i) => ({ descricao: i.descricao, quantidade: i.quantidade, valorUnitario: paraTexto(i.valorUnitario) })),
    metodos: Object.fromEntries(LISTA_METODOS.map((m) => [m, c.metodosPagamento.includes(m)])) as Estado['metodos'],
    parcelasMaximas: c.parcelasMaximas,
    criptomoedas: c.criptomoedas.length ? c.criptomoedas : ['BTC'],
    recorrente,
    frequencia: c.recorrencia.tipo !== 'unica' ? c.recorrencia.tipo : 'mensal',
    inicio: c.recorrencia.inicio ?? e.inicio,
    semTermino: recorrente && !c.recorrencia.repeticoes,
    repeticoes: String(c.recorrencia.repeticoes ?? 12),
    linkAberto: c.linkAberto,
    clienteNome: c.clienteNome ?? '',
    clienteCpf: c.clienteCpf ?? '',
    clienteEmail: c.clienteEmail ?? '',
  };
}

/** Sem `cobranca` cria uma nova; com `cobranca` edita a existente. */
export function FormCobranca({ cobranca }: { cobranca?: CobrancaJson }) {
  const id = cobranca?.id;
  const [estado, setEstado] = useState(() => (cobranca ? estadoDaCobranca(cobranca) : estadoInicial()));
  const [salva, setSalva] = useState<CobrancaJson | null>(null);
  const [salvando, executar] = useCarregamento();

  const mudar = (parcial: Partial<Estado>) => setEstado((atual) => ({ ...atual, ...parcial }));
  const mudarItem = (indice: number, parcial: Partial<Item>) =>
    mudar({ itens: estado.itens.map((item, i) => (i === indice ? { ...item, ...parcial } : item)) });

  const total = estado.itens.reduce((soma, i) => soma + i.quantidade * paraNumero(i.valorUnitario), 0);
  const metodosAtivos = LISTA_METODOS.filter((m) => estado.metodos[m]);
  const repeticoes = Number(estado.repeticoes) || 12;

  function textoRecorrencia() {
    if (!estado.recorrente) return 'Cobrança única';
    const dia = Number(estado.inicio.slice(8, 10));
    const quando = { semanal: 'toda semana', mensal: `todo dia ${dia}`, anual: `todo ano em ${estado.inicio.slice(8, 10)}/${estado.inicio.slice(5, 7)}` }[estado.frequencia];
    const unidade = { semanal: 'semanas', mensal: 'meses', anual: 'anos' }[estado.frequencia];
    return `${FREQUENCIAS[estado.frequencia]}, ${quando}${estado.semTermino ? ', até cancelar' : `, por ${repeticoes} ${unidade}`}`;
  }

  // ---------------------------------------------------------------- etapas
  const etapa1 = () => (
    <>
      <div className="pilha">
        {estado.itens.map((item, i) => (
          <div key={i} className="card compacto item-cobranca pilha">
            <div className="entre">
              <input className="nome" value={item.descricao} placeholder="Nome do produto ou serviço" aria-label={`Descrição do item ${i + 1}`} onChange={(e) => mudarItem(i, { descricao: e.target.value })} />
              <button
                type="button"
                className="botao-icone"
                style={{ width: 36, height: 36, border: 0 }}
                aria-label="Remover item"
                disabled={estado.itens.length === 1}
                onClick={() => mudar({ itens: estado.itens.filter((_, n) => n !== i) })}
              >
                <Icone nome="lixeira" tamanho={18} />
              </button>
            </div>
            <div className="entre">
              <div className="passo-qtd">
                <button type="button" aria-label="Diminuir" onClick={() => mudarItem(i, { quantidade: Math.max(1, item.quantidade - 1) })}><Icone nome="menos" tamanho={14} /></button>
                <span>{item.quantidade}</span>
                <button type="button" aria-label="Aumentar" onClick={() => mudarItem(i, { quantidade: Math.min(999, item.quantidade + 1) })}><Icone nome="mais" tamanho={14} /></button>
              </div>
              <label className="preco">
                <span className="muted pequeno">R$</span>
                <input inputMode="decimal" value={item.valorUnitario} placeholder="0,00" aria-label={`Valor unitário do item ${i + 1}`} onChange={(e) => mudarItem(i, { valorUnitario: e.target.value })} />
              </label>
            </div>
          </div>
        ))}
        <button type="button" className="botao-tracejado" onClick={() => mudar({ itens: [...estado.itens, { descricao: '', quantidade: 1, valorUnitario: '' }] })}>
          <Icone nome="mais" tamanho={18} /> Adicionar item
        </button>
      </div>
      <div className="card compacto entre"><span className="muted">Total</span><span className="mono" style={{ fontSize: 22 }}>{moeda(total)}</span></div>
    </>
  );

  const etapa2 = () => (
    <>
      <div className="pilha">
        {LISTA_METODOS.map((m) => {
          const ativo = estado.metodos[m];
          const comOpcoes = m === 'cartao' || m === 'cripto';
          return (
            <div key={m} className={`card compacto metodo-card ${ativo ? (comOpcoes ? 'destacado' : '') : 'desligado'}`}>
              <label className="cabeca">
                <span className="icone-quadrado"><Icone nome={METODOS[m].icone} /></span>
                <div><b>{METODOS[m].nome}</b><small>{METODOS[m].desc}</small></div>
                <span className="chave">
                  <input type="checkbox" checked={ativo} onChange={(e) => mudar({ metodos: { ...estado.metodos, [m]: e.target.checked } })} />
                  <span />
                </span>
              </label>
              {m === 'cartao' && ativo && (
                <>
                  <div className="divisor" />
                  <div className="campo">
                    <label htmlFor="parcelas">Parcelamento máximo</label>
                    <select className="entrada" id="parcelas" value={estado.parcelasMaximas} onChange={(e) => mudar({ parcelasMaximas: Number(e.target.value) })}>
                      {Array.from({ length: 12 }, (_, n) => <option key={n} value={n + 1}>{n === 0 ? 'À vista (1x)' : `Até ${n + 1}x sem juros`}</option>)}
                    </select>
                  </div>
                </>
              )}
              {m === 'cripto' && ativo && (
                <>
                  <div className="divisor" />
                  {LISTA_CRIPTOS.map((c) => (
                    <label key={c} className="caixa">
                      <input
                        type="checkbox"
                        checked={estado.criptomoedas.includes(c)}
                        onChange={(e) => mudar({ criptomoedas: e.target.checked ? [...estado.criptomoedas, c] : estado.criptomoedas.filter((x) => x !== c) })}
                      />
                      {CRIPTOS[c]}
                    </label>
                  ))}
                </>
              )}
            </div>
          );
        })}
      </div>
      <Aviso tipo="sucesso">O cliente verá apenas os métodos habilitados aqui.</Aviso>
    </>
  );

  const etapa3 = () => (
    <>
      <div className="segmentado">
        <button type="button" className={!estado.recorrente ? 'ativo' : ''} onClick={() => mudar({ recorrente: false })}>Cobrança única</button>
        <button type="button" className={estado.recorrente ? 'ativo' : ''} onClick={() => mudar({ recorrente: true })}>Recorrente</button>
      </div>
      {!estado.recorrente ? (
        <Aviso>Essa cobrança será enviada uma única vez ao cliente.</Aviso>
      ) : (
        <>
          <div className="campo">
            <span className="rotulo">Frequência</span>
            <div className="pilulas">
              {(Object.keys(FREQUENCIAS) as Frequencia[]).map((f) => (
                <button key={f} type="button" className={`pilula laranja ${estado.frequencia === f ? 'ativa' : ''}`} onClick={() => mudar({ frequencia: f })}>{FREQUENCIAS[f]}</button>
              ))}
            </div>
          </div>
          <div className="campo">
            <label htmlFor="inicio">Primeira cobrança em</label>
            <input className="entrada mono" type="date" id="inicio" value={estado.inicio} onChange={(e) => mudar({ inicio: e.target.value })} />
          </div>
          <div className="campo">
            <span className="rotulo">Término</span>
            <label className="radio">
              <input type="radio" name="termino" checked={!estado.semTermino} onChange={() => mudar({ semTermino: false })} /> Repetir por
              <input className="qtd-repeticoes" inputMode="numeric" value={estado.repeticoes} aria-label="Quantidade de repetições" onChange={(e) => mudar({ repeticoes: soDigitos(e.target.value).slice(0, 3) })} /> vezes
            </label>
            <label className="radio">
              <input type="radio" name="termino" checked={estado.semTermino} onChange={() => mudar({ semTermino: true })} /> Sem data de término, até cancelar
            </label>
          </div>
          <div className="card compacto muted pequeno">
            O cliente receberá uma nova cobrança de <b className="mono" style={{ color: 'var(--texto)' }}>{moeda(total)}</b>: {textoRecorrencia().toLowerCase()}.
          </div>
        </>
      )}
    </>
  );

  const etapa4 = () => (
    <>
      <div className="segmentado">
        <button type="button" className={!estado.linkAberto ? 'ativo' : ''} onClick={() => mudar({ linkAberto: false, errosCampos: {} })}>Identificar agora</button>
        <button type="button" className={estado.linkAberto ? 'ativo' : ''} onClick={() => mudar({ linkAberto: true, errosCampos: {} })}>Deixar em aberto</button>
      </div>
      {estado.linkAberto ? (
        <Aviso icone="link">O link poderá ser enviado a qualquer pessoa. Quem acessar vai informar o próprio CPF para pagar.</Aviso>
      ) : (
        <>
          <div className="campo">
            <label htmlFor="clienteNome">Nome do cliente</label>
            <input className="entrada" id="clienteNome" value={estado.clienteNome} placeholder="Guilherme Silva Santos" onChange={(e) => mudar({ clienteNome: e.target.value })} />
          </div>
          <div className={`campo ${estado.errosCampos.clienteCpf ? 'erro' : ''}`}>
            <label htmlFor="clienteCpf">CPF do cliente <span className="tag">OBRIGATÓRIO</span></label>
            <input className="entrada mono" id="clienteCpf" inputMode="numeric" value={estado.clienteCpf} placeholder="000.000.000-00" onChange={(e) => mudar({ clienteCpf: mascaraCpf(e.target.value) })} />
            {estado.errosCampos.clienteCpf && <span className="msg">{estado.errosCampos.clienteCpf}</span>}
          </div>
          <div className={`campo ${estado.errosCampos.clienteEmail ? 'erro' : ''}`}>
            <label htmlFor="clienteEmail">E-mail do cliente<span className="opcional">(Opcional)</span></label>
            <input className="entrada" id="clienteEmail" type="email" value={estado.clienteEmail} placeholder="nome@email.com" onChange={(e) => mudar({ clienteEmail: e.target.value })} />
            <span className="msg">{estado.errosCampos.clienteEmail ?? 'Para enviar o link automaticamente'}</span>
          </div>
        </>
      )}
    </>
  );

  const cartaoRevisao = (titulo: string, etapa: number, conteudo: ReactNode) => (
    <div className="card compacto pilha">
      <div className="card-titulo">
        {titulo}
        <button type="button" className="linha muted pequeno" style={{ border: 0, background: 'none', gap: 4 }} onClick={() => mudar({ etapa, erro: '' })}>
          <Icone nome="lapis" tamanho={14} /> Editar
        </button>
      </div>
      {conteudo}
    </div>
  );
  const rotuloMetodo = (m: MetodoPagamento) => {
    if (m === 'cartao') return `Cartão ${estado.parcelasMaximas > 1 ? `até ${estado.parcelasMaximas}x` : 'à vista'}`;
    if (m === 'cripto') return `Cripto (${estado.criptomoedas.join(', ')})`;
    return METODOS[m].nome.split(' ')[0];
  };
  const etapa5 = () => (
    <>
      {cartaoRevisao('Itens', 1, (
        <div className="lista-valores">
          {estado.itens.map((i, n) => (
            <div key={n}><span>{i.descricao} <b>{i.quantidade}x</b></span><span className="mono">{moeda(i.quantidade * paraNumero(i.valorUnitario))}</span></div>
          ))}
          <div className="divisor" />
          <div><b>Total</b><span className="mono">{moeda(total)}</span></div>
        </div>
      ))}
      {cartaoRevisao('Pagamento', 2, (
        <div className="pilulas">
          {metodosAtivos.map((m) => <span key={m} className="chip chip-cinza" style={{ padding: '8px 14px', fontSize: 14 }}>{rotuloMetodo(m)}</span>)}
        </div>
      ))}
      {cartaoRevisao('Recorrência', 3, <p>{textoRecorrencia()}</p>)}
      {cartaoRevisao('Pagador', 4, estado.linkAberto ? (
        <p>Link aberto: qualquer pessoa pode pagar informando o CPF</p>
      ) : (
        <div>
          <b>{estado.clienteNome || 'Cliente'}</b>
          <p className="muted mono pequeno" style={{ fontWeight: 500 }}>CPF: {estado.clienteCpf}</p>
          {estado.clienteEmail && <p className="muted pequeno">{estado.clienteEmail}</p>}
        </div>
      ))}
      <div className="card" style={{ background: 'var(--superficie-2)' }}>
        <span className="rotulo-secao">Valor total</span>
        <p className="mono" style={{ fontSize: 32, marginTop: 6 }}>{moeda(total)}</p>
      </div>
    </>
  );

  const TITULOS = [
    ['O que está sendo cobrado?', 'Adicione os produtos ou serviços da cobrança.'],
    ['Como o cliente pode pagar?', 'Escolha os métodos de pagamento aceitos para esta cobrança.'],
    ['Essa cobrança se repete?', 'Defina se a cobrança será única ou recorrente.'],
    ['Quem vai pagar essa cobrança?', 'Identifique o cliente ou gere um link aberto.'],
    [id ? 'Revise as alterações' : 'Revise antes de gerar', 'Confira os detalhes da sua cobrança'],
  ];

  // ---------------------------------------------------------------- validação e envio
  function validarEtapa() {
    let erro = '';
    const errosCampos: Estado['errosCampos'] = {};
    if (estado.etapa === 1) {
      if (estado.itens.some((i) => !i.descricao.trim())) erro = 'Dê um nome para cada item.';
      else if (estado.itens.some((i) => paraNumero(i.valorUnitario) <= 0)) erro = 'Informe o valor de cada item.';
    }
    if (estado.etapa === 2) {
      if (!metodosAtivos.length) erro = 'Habilite ao menos um método de pagamento.';
      else if (estado.metodos.cripto && !estado.criptomoedas.length) erro = 'Escolha ao menos uma criptomoeda.';
    }
    if (estado.etapa === 3 && estado.recorrente && !estado.inicio) erro = 'Informe a data da primeira cobrança.';
    if (estado.etapa === 4 && !estado.linkAberto) {
      if (!cpfValido(estado.clienteCpf)) errosCampos.clienteCpf = 'CPF inválido';
      if (estado.clienteEmail && !emailValido(estado.clienteEmail)) errosCampos.clienteEmail = 'E-mail inválido';
    }
    return { erro, errosCampos };
  }

  async function avancar() {
    const { erro, errosCampos } = validarEtapa();
    if (erro || Object.keys(errosCampos).length) return mudar({ erro, errosCampos });
    if (estado.etapa < 5) return mudar({ etapa: estado.etapa + 1, erro: '', errosCampos: {} });

    const corpo = {
      itens: estado.itens.map((i) => ({ descricao: i.descricao, quantidade: i.quantidade, valorUnitario: paraNumero(i.valorUnitario) })),
      metodosPagamento: metodosAtivos,
      parcelasMaximas: estado.parcelasMaximas,
      criptomoedas: estado.criptomoedas,
      recorrencia: estado.recorrente
        ? { tipo: estado.frequencia, inicio: estado.inicio, repeticoes: estado.semTermino ? null : repeticoes }
        : { tipo: 'unica' },
      linkAberto: estado.linkAberto,
      clienteNome: estado.clienteNome,
      clienteCpf: estado.clienteCpf,
      clienteEmail: estado.clienteEmail,
    };
    await executar(async () => {
      try {
        setSalva(await api<CobrancaJson>(id ? `/cobrancas/${id}` : '/cobrancas', { metodo: id ? 'PUT' : 'POST', corpo }));
      } catch (falha) {
        mudar({ erro: mensagemDe(falha), etapa: ETAPA_DO_ERRO[codigoDe(falha)] ?? 5 });
      }
    });
  }

  if (salva) return <CobrancaSalva cobranca={salva} editada={Boolean(id)} />;

  const [titulo, subtitulo] = TITULOS[estado.etapa - 1];
  return (
    <form className="tela com-rodape" noValidate onSubmit={(e) => { e.preventDefault(); void avancar(); }}>
      <div className="entre"><Logo /><Link className="muted pequeno" href="/cobrancas">Cancelar</Link></div>
      <Etapas atual={estado.etapa} total={5} rotulo={ROTULOS[estado.etapa - 1]} />
      <div><h1 className="titulo">{titulo}</h1><p className="subtitulo">{subtitulo}</p></div>
      {[etapa1, etapa2, etapa3, etapa4, etapa5][estado.etapa - 1]()}
      {estado.erro && <Aviso tipo="erro">{estado.erro}</Aviso>}
      <div className="rodape-fixo">
        {estado.etapa === 1 ? (
          <button className="botao botao-primario" type="submit">Continuar</button>
        ) : (
          <div className="botoes">
            <button className="botao botao-secundario" type="button" onClick={() => mudar({ etapa: estado.etapa - 1, erro: '' })}>Voltar</button>
            <Botao className="botao botao-primario" type="submit" carregando={salvando}>{estado.etapa === 5 ? (id ? 'Salvar' : 'Gerar cobrança') : 'Continuar'}</Botao>
          </div>
        )}
      </div>
    </form>
  );
}

function CobrancaSalva({ cobranca: c, editada }: { cobranca: CobrancaJson; editada: boolean }) {
  const mensagem = `Olá${c.clienteNome ? `, ${c.clienteNome.split(' ')[0]}` : ''}! Segue o link de pagamento de ${moeda(c.valor)}: ${c.linkPagamento}`;
  return (
    <div className="tela com-rodape">
      <Logo />
      <div className="card pilha-16" style={{ textAlign: 'center', marginTop: 24 }}>
        <div className="selo-sucesso"><Icone nome="check" tamanho={40} /></div>
        <div>
          <h1 className="titulo">{editada ? 'Cobrança atualizada!' : 'Cobrança criada!'}</h1>
          <p className="subtitulo">Compartilhe o link com {c.linkAberto ? 'quem vai pagar' : c.clienteNome ?? 'o cliente'}.</p>
        </div>
        <p className="valor-grande">{moeda(c.valor)}</p>
        <div className="copia-cola">
          <input className="entrada" readOnly value={c.linkPagamento} aria-label="Link de pagamento" />
          <button className="botao botao-primario botao-pequeno" onClick={() => copiar(c.linkPagamento, 'Link copiado!')}><Icone nome="copiar" tamanho={16} /> Copiar</button>
        </div>
      </div>
      <div className="rodape-fixo sem-borda">
        <a className="botao botao-primario" target="_blank" rel="noopener" href={`https://wa.me/?text=${encodeURIComponent(mensagem)}`}><Icone nome="compartilhar" /> Enviar pelo WhatsApp</a>
        <div className="botoes">
          <Link className="botao botao-secundario" href="/cobrancas">Ver cobranças</Link>
          <Link className="botao botao-secundario" href="/painel">Painel</Link>
        </div>
      </div>
    </div>
  );
}
