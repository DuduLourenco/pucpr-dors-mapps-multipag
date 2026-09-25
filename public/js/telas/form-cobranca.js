// TELA 3 - Nova / editar cobrança em 5 etapas (Figma: criar-cobranca-etapa-1..5) | Membro 2
// CRUD: CREATE (POST /api/cobrancas) e UPDATE (PUT /api/cobrancas/:id)
import { api } from '../api.js';
import {
  aviso, carregando, comCarregamento, copiar, cpfValido, esc, etapas, icone, logo, mascaraCpf, moeda,
} from '../ui.js';

const ROTULOS = ['Produtos', 'Métodos de Pagamento', 'Recorrência', 'Pagador', 'Revisão'];
const FREQUENCIAS = { semanal: 'Semanal', mensal: 'Mensal', anual: 'Anual' };
const CRIPTOS = { BTC: 'Bitcoin (BTC)', ETH: 'Ethereum (ETH)', USDT: 'Tether (USDT)' };
const METODOS = {
  pix: { nome: 'Pix', desc: 'Recebimento instantâneo', icone: 'raio' },
  cartao: { nome: 'Cartão de crédito', desc: 'Bandeiras Visa, Master, Elo e Amex', icone: 'cartao' },
  boleto: { nome: 'Boleto bancário', desc: 'Compensação em até 2 dias úteis', icone: 'codigoBarras' },
  cripto: { nome: 'Criptomoedas', desc: 'Bitcoin, Ethereum e stablecoins', icone: 'carteira' },
};
/** Em qual etapa corrigir cada erro devolvido pela API. */
const ETAPA_DO_ERRO = {
  ITENS_INVALIDOS: 1, VALOR_INVALIDO: 1, CAMPO_INVALIDO: 1, METODOS_INVALIDOS: 2, PARCELAS_INVALIDAS: 2,
  CRIPTO_INVALIDA: 2, RECORRENCIA_INVALIDA: 3, DATA_INVALIDA: 3, CPF_INVALIDO: 4, EMAIL_INVALIDO: 4,
};

/** "1.200,50" | "1200.5" | "350" -> 1200.5 */
function paraNumero(texto) {
  const t = String(texto ?? '').trim();
  const n = t.includes(',') ? Number(t.replace(/\./g, '').replace(',', '.')) : Number(t);
  return Number.isFinite(n) ? n : 0;
}
const paraTexto = (n) => (n ? n.toFixed(2).replace('.', ',') : '');

function estadoInicial() {
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
    repeticoes: 12,
    linkAberto: false,
    clienteNome: '',
    clienteCpf: '',
    clienteEmail: '',
    erro: '',
    errosCampos: {},
  };
}

function estadoDaCobranca(c) {
  const e = estadoInicial();
  return {
    ...e,
    itens: c.itens.map((i) => ({ descricao: i.descricao, quantidade: i.quantidade, valorUnitario: paraTexto(i.valorUnitario) })),
    metodos: Object.fromEntries(Object.keys(METODOS).map((m) => [m, c.metodosPagamento.includes(m)])),
    parcelasMaximas: c.parcelasMaximas,
    criptomoedas: c.criptomoedas.length ? c.criptomoedas : ['BTC'],
    recorrente: c.recorrencia.tipo !== 'unica',
    frequencia: c.recorrencia.tipo !== 'unica' ? c.recorrencia.tipo : 'mensal',
    inicio: c.recorrencia.inicio ?? e.inicio,
    semTermino: c.recorrencia.tipo !== 'unica' && !c.recorrencia.repeticoes,
    repeticoes: c.recorrencia.repeticoes ?? 12,
    linkAberto: c.linkAberto,
    clienteNome: c.clienteNome ?? '',
    clienteCpf: c.clienteCpf ?? '',
    clienteEmail: c.clienteEmail ?? '',
  };
}

export default {
  privada: true,
  async render(el, { id }) {
    el.innerHTML = carregando();
    const estado = id ? estadoDaCobranca(await api(`/cobrancas/${id}`)) : estadoInicial();
    const total = () => estado.itens.reduce((s, i) => s + i.quantidade * paraNumero(i.valorUnitario), 0);
    const metodosAtivos = () => Object.keys(METODOS).filter((m) => estado.metodos[m]);

    function textoRecorrencia() {
      if (!estado.recorrente) return 'Cobrança única';
      const dia = Number(estado.inicio.slice(8, 10));
      const quando = { semanal: 'toda semana', mensal: `todo dia ${dia}`, anual: `todo ano em ${estado.inicio.slice(8, 10)}/${estado.inicio.slice(5, 7)}` }[estado.frequencia];
      const unidade = { semanal: 'semanas', mensal: 'meses', anual: 'anos' }[estado.frequencia];
      return `${FREQUENCIAS[estado.frequencia]}, ${quando}${estado.semTermino ? ', até cancelar' : `, por ${estado.repeticoes} ${unidade}`}`;
    }

    // ---------------------------------------------------------------- etapas
    const etapa1 = () => `
      <div class="pilha">
        ${estado.itens.map((item, i) => `
          <div class="card compacto item-cobranca pilha">
            <div class="entre">
              <input class="nome" data-item="${i}" data-campo="descricao" value="${esc(item.descricao)}" placeholder="Nome do produto ou serviço" aria-label="Descrição do item ${i + 1}" />
              <button type="button" class="botao-icone" style="width:36px;height:36px;border:0" data-remover="${i}" aria-label="Remover item" ${estado.itens.length === 1 ? 'disabled' : ''}>${icone('lixeira', 18)}</button>
            </div>
            <div class="entre">
              <div class="passo-qtd">
                <button type="button" data-qtd="${i}" data-delta="-1" aria-label="Diminuir">${icone('menos', 14)}</button>
                <span>${item.quantidade}</span>
                <button type="button" data-qtd="${i}" data-delta="1" aria-label="Aumentar">${icone('mais', 14)}</button>
              </div>
              <label class="preco"><span class="muted pequeno">R$</span>
                <input inputmode="decimal" data-item="${i}" data-campo="valorUnitario" value="${esc(item.valorUnitario)}" placeholder="0,00" aria-label="Valor unitário do item ${i + 1}" />
              </label>
            </div>
          </div>`).join('')}
        <button type="button" class="botao-tracejado" id="add-item">${icone('mais', 18)} Adicionar item</button>
      </div>
      <div class="card compacto entre"><span class="muted">Total</span><span class="mono" style="font-size:22px" id="total">${moeda(total())}</span></div>`;

    const etapa2 = () => `
      <div class="pilha">
        ${Object.entries(METODOS).map(([m, info]) => `
          <div class="card compacto metodo-card ${estado.metodos[m] ? (m === 'cartao' || m === 'cripto' ? 'destacado' : '') : 'desligado'}">
            <label class="cabeca">
              <span class="icone-quadrado">${icone(info.icone)}</span>
              <div><b>${info.nome}</b><small>${info.desc}</small></div>
              <span class="chave"><input type="checkbox" data-metodo="${m}" ${estado.metodos[m] ? 'checked' : ''} /><span></span></span>
            </label>
            ${m === 'cartao' && estado.metodos.cartao ? `
              <div class="divisor"></div>
              <div class="campo"><label for="parcelas">Parcelamento máximo</label>
                <select class="entrada" id="parcelas">${Array.from({ length: 12 }, (_, n) => `<option value="${n + 1}" ${estado.parcelasMaximas === n + 1 ? 'selected' : ''}>${n === 0 ? 'À vista (1x)' : `Até ${n + 1}x sem juros`}</option>`).join('')}</select>
              </div>` : ''}
            ${m === 'cripto' && estado.metodos.cripto ? `
              <div class="divisor"></div>
              ${Object.entries(CRIPTOS).map(([c, nome]) => `<label class="caixa"><input type="checkbox" data-cripto="${c}" ${estado.criptomoedas.includes(c) ? 'checked' : ''} />${nome}</label>`).join('')}` : ''}
          </div>`).join('')}
      </div>
      ${aviso('O cliente verá apenas os métodos habilitados aqui.', 'sucesso')}`;

    const etapa3 = () => `
      <div class="segmentado">
        <button type="button" data-recorrente="nao" class="${!estado.recorrente ? 'ativo' : ''}">Cobrança única</button>
        <button type="button" data-recorrente="sim" class="${estado.recorrente ? 'ativo' : ''}">Recorrente</button>
      </div>
      ${!estado.recorrente ? aviso('Essa cobrança será enviada uma única vez ao cliente.') : `
        <div class="campo"><span class="rotulo">Frequência</span>
          <div class="pilulas">${Object.entries(FREQUENCIAS).map(([f, r]) => `<button type="button" class="pilula laranja ${estado.frequencia === f ? 'ativa' : ''}" data-freq="${f}">${r}</button>`).join('')}</div>
        </div>
        <div class="campo"><label for="inicio">Primeira cobrança em</label><input class="entrada mono" type="date" id="inicio" value="${estado.inicio}" /></div>
        <div class="campo"><span class="rotulo">Término</span>
          <label class="radio"><input type="radio" name="termino" value="repetir" ${!estado.semTermino ? 'checked' : ''} /> Repetir por
            <input class="qtd-repeticoes" id="repeticoes" inputmode="numeric" value="${estado.repeticoes}" aria-label="Quantidade de repetições" /> vezes</label>
          <label class="radio"><input type="radio" name="termino" value="sem" ${estado.semTermino ? 'checked' : ''} /> Sem data de término, até cancelar</label>
        </div>
        <div class="card compacto muted pequeno" id="resumo-rec">O cliente receberá uma nova cobrança de <b class="mono" style="color:var(--texto)">${moeda(total())}</b>: ${esc(textoRecorrencia().toLowerCase())}.</div>`}`;

    const erroCampo = (c) => (estado.errosCampos[c] ? `<span class="msg">${esc(estado.errosCampos[c])}</span>` : '');
    const etapa4 = () => `
      <div class="segmentado">
        <button type="button" data-aberto="nao" class="${!estado.linkAberto ? 'ativo' : ''}">Identificar agora</button>
        <button type="button" data-aberto="sim" class="${estado.linkAberto ? 'ativo' : ''}">Deixar em aberto</button>
      </div>
      ${estado.linkAberto ? aviso('O link poderá ser enviado a qualquer pessoa. Quem acessar vai informar o próprio CPF para pagar.', 'neutro', 'link') : `
        <div class="campo"><label for="clienteNome">Nome do cliente</label><input class="entrada" id="clienteNome" value="${esc(estado.clienteNome)}" placeholder="Guilherme Silva Santos" /></div>
        <div class="campo ${estado.errosCampos.clienteCpf ? 'erro' : ''}"><label for="clienteCpf">CPF do cliente <span class="tag">OBRIGATÓRIO</span></label>
          <input class="entrada mono" id="clienteCpf" inputmode="numeric" value="${esc(estado.clienteCpf)}" placeholder="000.000.000-00" />${erroCampo('clienteCpf')}</div>
        <div class="campo ${estado.errosCampos.clienteEmail ? 'erro' : ''}"><label for="clienteEmail">E-mail do cliente<span class="opcional">(Opcional)</span></label>
          <input class="entrada" id="clienteEmail" type="email" value="${esc(estado.clienteEmail)}" placeholder="nome@email.com" />
          ${erroCampo('clienteEmail') || '<span class="msg">Para enviar o link automaticamente</span>'}</div>`}`;

    const cartaoRevisao = (titulo, etapa, conteudo) => `
      <div class="card compacto pilha">
        <div class="card-titulo">${titulo}<button type="button" class="linha muted pequeno" style="border:0;background:none;gap:4px" data-ir="${etapa}">${icone('lapis', 14)} Editar</button></div>
        ${conteudo}
      </div>`;
    const etapa5 = () => `
      ${cartaoRevisao('Itens', 1, `<div class="lista-valores">
        ${estado.itens.map((i) => `<div><span>${esc(i.descricao)} <b>${i.quantidade}x</b></span><span class="mono">${moeda(i.quantidade * paraNumero(i.valorUnitario))}</span></div>`).join('')}
        <div class="divisor"></div><div><b>Total</b><span class="mono">${moeda(total())}</span></div></div>`)}
      ${cartaoRevisao('Pagamento', 2, `<div class="pilulas">${metodosAtivos().map((m) => `<span class="chip chip-cinza" style="padding:8px 14px;font-size:14px">${
        m === 'cartao' ? `Cartão ${estado.parcelasMaximas > 1 ? `até ${estado.parcelasMaximas}x` : 'à vista'}` : m === 'cripto' ? `Cripto (${estado.criptomoedas.join(', ')})` : METODOS[m].nome.split(' ')[0]}</span>`).join('')}</div>`)}
      ${cartaoRevisao('Recorrência', 3, `<p>${esc(textoRecorrencia())}</p>`)}
      ${cartaoRevisao('Pagador', 4, estado.linkAberto ? '<p>Link aberto: qualquer pessoa pode pagar informando o CPF</p>'
        : `<div><b>${esc(estado.clienteNome || 'Cliente')}</b><p class="muted mono pequeno" style="font-weight:500">CPF: ${esc(estado.clienteCpf)}</p>${estado.clienteEmail ? `<p class="muted pequeno">${esc(estado.clienteEmail)}</p>` : ''}</div>`)}
      <div class="card" style="background:var(--superficie-2)"><span class="rotulo-secao">Valor total</span><p class="mono" style="font-size:32px;margin-top:6px">${moeda(total())}</p></div>`;

    const TITULOS = [
      ['O que está sendo cobrado?', 'Adicione os produtos ou serviços da cobrança.'],
      ['Como o cliente pode pagar?', 'Escolha os métodos de pagamento aceitos para esta cobrança.'],
      ['Essa cobrança se repete?', 'Defina se a cobrança será única ou recorrente.'],
      ['Quem vai pagar essa cobrança?', 'Identifique o cliente ou gere um link aberto.'],
      [id ? 'Revise as alterações' : 'Revise antes de gerar', 'Confira os detalhes da sua cobrança'],
    ];

    // ---------------------------------------------------------------- desenho
    function desenhar() {
      const [titulo, sub] = TITULOS[estado.etapa - 1];
      el.innerHTML = `
        <form class="tela com-rodape" id="form" novalidate>
          <div class="entre">${logo()}<a class="muted pequeno" href="#/cobrancas">Cancelar</a></div>
          ${etapas(estado.etapa, 5, ROTULOS[estado.etapa - 1])}
          <div><h1 class="titulo">${titulo}</h1><p class="subtitulo">${sub}</p></div>
          ${[etapa1, etapa2, etapa3, etapa4, etapa5][estado.etapa - 1]()}
          ${estado.erro ? aviso(esc(estado.erro), 'erro') : ''}
          <div class="rodape-fixo">
            ${estado.etapa === 1
              ? '<button class="botao botao-primario" type="submit">Continuar</button>'
              : `<div class="botoes"><button class="botao botao-secundario" type="button" id="voltar">Voltar</button>
                 <button class="botao botao-primario" type="submit">${estado.etapa === 5 ? (id ? 'Salvar' : 'Gerar cobrança') : 'Continuar'}</button></div>`}
          </div>
        </form>`;
      ligarEventos();
    }

    function ligarEventos() {
      const $ = (s) => el.querySelector(s);
      const todos = (s, fn) => el.querySelectorAll(s).forEach(fn);

      // Etapa 1: edita sem redesenhar para não perder o foco do campo
      todos('[data-item]', (input) => (input.oninput = () => {
        estado.itens[input.dataset.item][input.dataset.campo] = input.value;
        $('#total').textContent = moeda(total());
      }));
      todos('[data-qtd]', (b) => (b.onclick = () => {
        const item = estado.itens[b.dataset.qtd];
        item.quantidade = Math.max(1, Math.min(999, item.quantidade + Number(b.dataset.delta)));
        desenhar();
      }));
      todos('[data-remover]', (b) => (b.onclick = () => { estado.itens.splice(Number(b.dataset.remover), 1); desenhar(); }));
      $('#add-item')?.addEventListener('click', () => { estado.itens.push({ descricao: '', quantidade: 1, valorUnitario: '' }); desenhar(); });

      // Etapa 2
      todos('[data-metodo]', (c) => (c.onchange = () => { estado.metodos[c.dataset.metodo] = c.checked; desenhar(); }));
      $('#parcelas')?.addEventListener('change', (e) => (estado.parcelasMaximas = Number(e.target.value)));
      todos('[data-cripto]', (c) => (c.onchange = () => {
        estado.criptomoedas = c.checked ? [...estado.criptomoedas, c.dataset.cripto] : estado.criptomoedas.filter((x) => x !== c.dataset.cripto);
      }));

      // Etapa 3
      todos('[data-recorrente]', (b) => (b.onclick = () => { estado.recorrente = b.dataset.recorrente === 'sim'; desenhar(); }));
      todos('[data-freq]', (b) => (b.onclick = () => { estado.frequencia = b.dataset.freq; desenhar(); }));
      $('#inicio')?.addEventListener('change', (e) => { estado.inicio = e.target.value; desenhar(); });
      $('#repeticoes')?.addEventListener('change', (e) => { estado.repeticoes = Number(e.target.value) || 12; desenhar(); });
      todos('[name=termino]', (r) => (r.onchange = () => { estado.semTermino = r.value === 'sem'; desenhar(); }));

      // Etapa 4
      todos('[data-aberto]', (b) => (b.onclick = () => { estado.linkAberto = b.dataset.aberto === 'sim'; estado.errosCampos = {}; desenhar(); }));
      ['clienteNome', 'clienteCpf', 'clienteEmail'].forEach((campo) => $(`#${campo}`)?.addEventListener('input', (e) => {
        if (campo === 'clienteCpf') e.target.value = mascaraCpf(e.target.value);
        estado[campo] = e.target.value;
      }));

      // Etapa 5 e navegação
      todos('[data-ir]', (b) => (b.onclick = () => { estado.etapa = Number(b.dataset.ir); estado.erro = ''; desenhar(); }));
      $('#voltar')?.addEventListener('click', () => { estado.etapa--; estado.erro = ''; desenhar(); });
      $('#form').onsubmit = (e) => { e.preventDefault(); avancar(e.submitter); };
    }

    function validarEtapa() {
      estado.erro = '';
      estado.errosCampos = {};
      if (estado.etapa === 1) {
        if (estado.itens.some((i) => !i.descricao.trim())) estado.erro = 'Dê um nome para cada item.';
        else if (estado.itens.some((i) => paraNumero(i.valorUnitario) <= 0)) estado.erro = 'Informe o valor de cada item.';
      }
      if (estado.etapa === 2) {
        if (!metodosAtivos().length) estado.erro = 'Habilite ao menos um método de pagamento.';
        else if (estado.metodos.cripto && !estado.criptomoedas.length) estado.erro = 'Escolha ao menos uma criptomoeda.';
      }
      if (estado.etapa === 3 && estado.recorrente && !estado.inicio) estado.erro = 'Informe a data da primeira cobrança.';
      if (estado.etapa === 4 && !estado.linkAberto) {
        if (!cpfValido(estado.clienteCpf)) estado.errosCampos.clienteCpf = 'CPF inválido';
        if (estado.clienteEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(estado.clienteEmail)) estado.errosCampos.clienteEmail = 'E-mail inválido';
      }
      return !estado.erro && !Object.keys(estado.errosCampos).length;
    }

    async function avancar(botao) {
      if (!validarEtapa()) return desenhar();
      if (estado.etapa < 5) {
        estado.etapa++;
        return desenhar();
      }
      const corpo = {
        itens: estado.itens.map((i) => ({ descricao: i.descricao, quantidade: i.quantidade, valorUnitario: paraNumero(i.valorUnitario) })),
        metodosPagamento: metodosAtivos(),
        parcelasMaximas: estado.parcelasMaximas,
        criptomoedas: estado.criptomoedas,
        recorrencia: estado.recorrente
          ? { tipo: estado.frequencia, inicio: estado.inicio, repeticoes: estado.semTermino ? null : estado.repeticoes }
          : { tipo: 'unica' },
        linkAberto: estado.linkAberto,
        clienteNome: estado.clienteNome,
        clienteCpf: estado.clienteCpf,
        clienteEmail: estado.clienteEmail,
      };
      await comCarregamento(botao, async () => {
        try {
          const cobranca = await api(id ? `/cobrancas/${id}` : '/cobrancas', { metodo: id ? 'PUT' : 'POST', corpo });
          sucesso(cobranca);
        } catch (erro) {
          estado.erro = erro.message;
          estado.etapa = ETAPA_DO_ERRO[erro.codigo] ?? 5;
          desenhar();
        }
      });
    }

    function sucesso(c) {
      const texto = `Olá${c.clienteNome ? `, ${c.clienteNome.split(' ')[0]}` : ''}! Segue o link de pagamento de ${moeda(c.valor)}: ${c.linkPagamento}`;
      el.innerHTML = `
        <div class="tela com-rodape">
          ${logo()}
          <div class="card pilha-16" style="text-align:center;margin-top:24px">
            <div class="selo-sucesso">${icone('check', 40)}</div>
            <div><h1 class="titulo">${id ? 'Cobrança atualizada!' : 'Cobrança criada!'}</h1>
            <p class="subtitulo">Compartilhe o link com ${c.linkAberto ? 'quem vai pagar' : esc(c.clienteNome ?? 'o cliente')}.</p></div>
            <p class="valor-grande">${moeda(c.valor)}</p>
            <div class="copia-cola"><input class="entrada" readonly value="${esc(c.linkPagamento)}" aria-label="Link de pagamento" />
              <button class="botao botao-primario botao-pequeno" id="copiar">${icone('copiar', 16)} Copiar</button></div>
          </div>
          <div class="rodape-fixo sem-borda">
            <a class="botao botao-primario" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(texto)}">${icone('compartilhar')} Enviar pelo WhatsApp</a>
            <div class="botoes"><a class="botao botao-secundario" href="#/cobrancas">Ver cobranças</a><a class="botao botao-secundario" href="#/painel">Painel</a></div>
          </div>
        </div>`;
      el.querySelector('#copiar').onclick = () => copiar(c.linkPagamento, 'Link copiado!');
    }

    desenhar();
  },
};
