// TELA 5 - Pagamento pelo cliente final (Figma: cobranca-recebida-cliente, pagamento-*, pagamento-retorno-*) | Membro 3
// CRUD: CREATE de Pagamento (POST /api/publico/cobrancas/:token/pagamentos) + READ do status (polling)
import { api } from '../api.js';
import {
  aoSair, aviso, carregando, comCarregamento, copiar, cpfValido, dataHora, esc, icone, mascaraCpf, moeda,
} from '../ui.js';

const INTERVALO_CONSULTA_MS = 2000;
const CRIPTOS = { BTC: 'Bitcoin', ETH: 'Ethereum', USDT: 'Tether' };

export default {
  privada: false,
  async render(el, { token }) {
    el.innerHTML = carregando();
    let dados;
    try {
      dados = await api(`/publico/cobrancas/${encodeURIComponent(token)}`);
    } catch (erro) {
      el.innerHTML = `<div class="tela centro pilha-16" style="text-align:center">${icone('xCirculo', 48)}<h1 class="titulo">Link inválido</h1><p class="subtitulo">${esc(erro.message)}</p></div>`;
      return;
    }
    const { cobranca, contatoVendedor } = dados;
    const estado = {
      metodo: cobranca.metodosPagamento[0],
      criptomoeda: cobranca.criptomoedas[0],
      cpf: '',
      parcelas: 1,
      erro: '',
    };

    const topo = (voltar = true) => `
      <header class="topo-simples">${voltar ? `<a href="#" id="voltar" aria-label="Voltar">${icone('voltar', 22)}</a>` : ''}<span>${esc(cobranca.business)}</span></header>
      <div style="text-align:center"><p class="valor-grande">${moeda(cobranca.valor)}</p><p class="muted">${esc(cobranca.descricao)}</p></div>`;

    // ----------------------------------------------------- 1. escolher o método
    function telaEscolha() {
      if (cobranca.status !== 'pendente') return telaIndisponivel();
      const detalhesMetodo = {
        pix: 'Aprovação imediata',
        cartao: cobranca.parcelasMaximas > 1 ? `Em até ${cobranca.parcelasMaximas}x` : 'À vista',
        boleto: 'Vence em 3 dias',
        cripto: cobranca.criptomoedas.join(', '),
      };
      const nomes = { pix: 'Pix', cartao: 'Cartão de crédito', boleto: 'Boleto', cripto: 'Criptomoedas' };
      const icones = { pix: 'raio', cartao: 'cartao', boleto: 'codigoBarras', cripto: 'bitcoin' };
      const recorrencia = { semanal: 'Cobrança semanal', mensal: 'Cobrança mensal', anual: 'Cobrança anual' }[cobranca.recorrencia.tipo];

      el.innerHTML = `
        <form class="tela com-rodape" id="form" novalidate>
          <header class="entre">
            <div><b style="font-size:17px">${esc(cobranca.business)}</b><p class="muted pequeno">Powered by <b style="color:var(--texto)">Multi</b>Pag</p></div>
          </header>
          <section class="card pilha">
            <div class="entre"><span class="rotulo-secao">Detalhes da cobrança</span><span class="chip chip-pendente">PENDENTE</span></div>
            <div class="lista-valores">
              ${cobranca.itens.map((i) => `<div><span>${esc(i.descricao)} <b>${i.quantidade}x</b></span><span class="mono">${moeda(i.subtotal)}</span></div>`).join('')}
            </div>
            <div class="divisor"></div>
            <div class="entre"><b>Total</b><span class="mono" style="font-size:24px">${moeda(cobranca.valor)}</span></div>
            ${recorrencia ? `<span class="chip chip-cinza" style="align-self:flex-start">${icone('repetir', 14)} ${recorrencia}${cobranca.recorrencia.repeticoes ? ` · ${cobranca.recorrencia.repeticoes}x` : ''}</span>` : ''}
            ${cobranca.clienteNome ? `<p class="muted pequeno">Para: <b>${esc(cobranca.clienteNome)}</b> (${esc(cobranca.clienteCpf)})</p>` : ''}
          </section>

          <section class="pilha">
            <h2 class="titulo-md" style="font-size:16px">Escolha como pagar</h2>
            <div class="grade-2">
              ${cobranca.metodosPagamento.map((m) => `
                <button type="button" class="escolha-metodo ${estado.metodo === m ? 'ativa' : ''}" data-metodo="${m}" aria-pressed="${estado.metodo === m}">
                  ${icone(icones[m], 22)}<b>${nomes[m]}</b><small>${detalhesMetodo[m]}</small>
                </button>`).join('')}
            </div>
            ${estado.metodo === 'cripto' && cobranca.criptomoedas.length > 1 ? `
              <div class="pilulas">${cobranca.criptomoedas.map((c) => `<button type="button" class="pilula contorno ${estado.criptomoeda === c ? 'ativa' : ''}" data-cripto="${c}">${CRIPTOS[c]} (${c})</button>`).join('')}</div>` : ''}
          </section>

          <div class="campo ${estado.erro === 'cpf' ? 'erro' : ''}">
            <label for="cpf">CPF para o recibo</label>
            <input class="entrada mono" id="cpf" inputmode="numeric" placeholder="000.000.000-00" value="${esc(estado.cpf)}" />
            <span class="msg">${estado.erro === 'cpf' ? 'CPF inválido' : 'Necessário para confirmar o pagamento'}</span>
          </div>
          ${estado.erro && estado.erro !== 'cpf' ? aviso(esc(estado.erro), 'erro') : ''}

          <div class="rodape-fixo">
            <button class="botao botao-primario" type="submit">${estado.metodo === 'cartao' ? 'Continuar' : `Pagar <span class="mono">${moeda(cobranca.valor)}</span>`}</button>
            <p class="seguro">${icone('cadeado', 14)} Ambiente seguro certificado por MultiPag</p>
          </div>
        </form>`;

      el.querySelectorAll('[data-metodo]').forEach((b) => (b.onclick = () => { estado.metodo = b.dataset.metodo; estado.erro = ''; telaEscolha(); }));
      el.querySelectorAll('[data-cripto]').forEach((b) => (b.onclick = () => { estado.criptomoeda = b.dataset.cripto; telaEscolha(); }));
      el.querySelector('#cpf').oninput = (e) => { e.target.value = mascaraCpf(e.target.value); estado.cpf = e.target.value; };
      el.querySelector('#form').onsubmit = (e) => {
        e.preventDefault();
        if (!cpfValido(estado.cpf)) { estado.erro = 'cpf'; return telaEscolha(); }
        estado.erro = '';
        if (estado.metodo === 'cartao') return telaCartao();
        pagar(e.submitter, { criptomoeda: estado.criptomoeda });
      };
    }

    // ----------------------------------------------------- 2a. formulário de cartão
    function telaCartao() {
      const parcelas = Array.from({ length: cobranca.parcelasMaximas }, (_, i) => i + 1);
      el.innerHTML = `
        <form class="tela com-rodape" id="form" novalidate>
          ${topo()}
          <section class="card pilha-16">
            <div class="campo"><label for="numero">Número do cartão</label><input class="entrada" id="numero" inputmode="numeric" autocomplete="cc-number" placeholder="0000 0000 0000 0000" /></div>
            <div class="campo"><label for="nome">Nome impresso no cartão</label><input class="entrada" id="nome" autocomplete="cc-name" style="text-transform:uppercase" /></div>
            <div class="grade-2">
              <div class="campo"><label for="validade">Validade</label><input class="entrada" id="validade" inputmode="numeric" autocomplete="cc-exp" placeholder="MM/AA" /></div>
              <div class="campo"><label for="cvv">CVV</label><input class="entrada" id="cvv" inputmode="numeric" autocomplete="cc-csc" placeholder="•••" maxlength="4" type="password" /></div>
            </div>
            <div class="campo"><label for="parcelas">Parcelas</label>
              <select class="entrada" id="parcelas">${parcelas.map((n) => `<option value="${n}">${n}x de ${moeda(cobranca.valor / n)}${n > 1 ? ' sem juros' : ''}</option>`).join('')}</select></div>
          </section>
          ${aviso('Pagamento seguro e criptografado, processado pela operadora do seu cartão.')}
          <div id="erro"></div>
          <div class="rodape-fixo">
            <button class="botao botao-primario" type="submit">Pagar <span class="mono">${moeda(cobranca.valor)}</span></button>
            <p class="seguro">${icone('cadeado', 14)} Ambiente seguro certificado por MultiPag</p>
          </div>
        </form>`;
      const $ = (s) => el.querySelector(s);
      $('#voltar').onclick = (e) => { e.preventDefault(); telaEscolha(); };
      $('#numero').oninput = (e) => (e.target.value = e.target.value.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 '));
      $('#validade').oninput = (e) => (e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4).replace(/(\d{2})(\d)/, '$1/$2'));
      $('#form').onsubmit = (e) => {
        e.preventDefault();
        pagar(e.submitter, {
          numeroCartao: $('#numero').value,
          nomeImpresso: $('#nome').value.toUpperCase(),
          validade: $('#validade').value,
          cvv: $('#cvv').value,
          parcelas: Number($('#parcelas').value),
        }, $('#erro'));
      };
    }

    async function pagar(botao, extras, alvoErro) {
      await comCarregamento(botao, async () => {
        try {
          const pagamento = await api(`/publico/cobrancas/${encodeURIComponent(token)}/pagamentos`, {
            metodo: 'POST',
            corpo: { metodo: estado.metodo, cpfPagador: estado.cpf, ...extras },
          });
          tratarPagamento(pagamento);
        } catch (erro) {
          if (alvoErro) alvoErro.innerHTML = aviso(esc(erro.message), 'erro');
          else { estado.erro = erro.message; telaEscolha(); }
        }
      });
    }

    function tratarPagamento(p) {
      if (p.status === 'confirmado') return telaAprovado(p);
      if (p.status === 'falhou') return telaRecusado(p);
      telaAguardando(p);
    }

    // ----------------------------------------------------- 2b. aguardando (Pix, boleto, cripto)
    function telaAguardando(p) {
      const expira = Date.now() + (p.detalhes.expiraEmSegundos ?? 600) * 1000;
      const qr = (texto) => `<div class="qr-caixa"><img src="/api/publico/qrcode?texto=${encodeURIComponent(texto)}" alt="QR Code para pagamento" /></div>`;
      const corpo = {
        pix: `
          <span class="chip chip-laranja" style="align-self:stretch;justify-content:center;padding:8px">${icone('relogio', 14)} Expira em <span id="cronometro">10:00</span></span>
          ${qr(p.instrucoes)}
          <span class="rotulo-secao">Pix copia e cola</span>
          <div class="copia-cola"><input class="entrada" readonly value="${esc(p.instrucoes)}" aria-label="Pix copia e cola" /><button type="button" class="botao botao-primario botao-pequeno" data-copiar>${icone('copiar', 16)} Copiar</button></div>`,
        boleto: `
          <div class="codigo-barras" aria-hidden="true">${barras(p.instrucoes)}</div>
          <p class="linha-digitavel">${esc(p.instrucoes)}</p>
          <div class="grade-2"><button type="button" class="botao botao-secundario" data-copiar>Copiar código</button><button type="button" class="botao botao-secundario" id="imprimir">Imprimir</button></div>`,
        cripto: `
          <span class="chip chip-laranja" style="align-self:stretch;justify-content:center;padding:8px">${icone('relogio', 14)} Expira em <span id="cronometro">10:00</span></span>
          <div style="text-align:center"><p>Envie exatamente</p><p class="mono" style="font-size:30px">${esc(String(p.detalhes.quantidade).replace('.', ','))} ${esc(p.detalhes.criptomoeda)}</p><p class="muted">para a carteira abaixo:</p></div>
          ${qr(p.instrucoes)}
          <span class="rotulo-secao">Carteira destino</span>
          <div class="copia-cola"><input class="entrada" readonly value="${esc(p.instrucoes)}" aria-label="Carteira destino" /><button type="button" class="botao botao-primario botao-pequeno" data-copiar>${icone('copiar', 16)} Copiar</button></div>`,
      }[p.metodo];

      el.innerHTML = `
        <div class="tela">
          ${topo()}
          ${p.metodo === 'boleto' ? `<p class="muted" style="text-align:center;margin-top:-12px">Vencimento em ${new Date(`${p.detalhes.vencimento}T12:00`).toLocaleDateString('pt-BR')}</p>` : ''}
          <section class="card pilha-16">${corpo}</section>
          ${aviso(p.metodo === 'boleto' ? 'A confirmação pode levar até 2 dias úteis após o pagamento.' : 'Assim que o pagamento for identificado, você verá a confirmação automaticamente.')}
          <p class="aguardando">${icone('carregando', 18, 'girando')} Aguardando pagamento...</p>
        </div>`;

      el.querySelector('#voltar').onclick = (e) => { e.preventDefault(); pararTimers(); telaEscolha(); };
      el.querySelector('[data-copiar]').onclick = () => copiar(p.instrucoes, 'Código copiado!');
      el.querySelector('#imprimir')?.addEventListener('click', () => window.print());

      const cronometro = el.querySelector('#cronometro');
      const tick = setInterval(() => {
        if (!cronometro) return;
        const restante = Math.max(0, Math.round((expira - Date.now()) / 1000));
        cronometro.textContent = `${String(Math.floor(restante / 60)).padStart(2, '0')}:${String(restante % 60).padStart(2, '0')}`;
      }, 1000);

      // O gateway avisa o servidor por webhook; aqui só consultamos até o status mudar.
      const consulta = setInterval(async () => {
        try {
          const atual = await api(`/publico/pagamentos/${p.id}`);
          if (atual.status !== 'pendente') {
            pararTimers();
            tratarPagamento(atual);
          }
        } catch { /* tenta de novo no próximo ciclo */ }
      }, INTERVALO_CONSULTA_MS);

      function pararTimers() {
        clearInterval(tick);
        clearInterval(consulta);
      }
      aoSair(pararTimers);
    }

    // ----------------------------------------------------- 3. retorno
    function telaAprovado(p) {
      cobranca.status = 'paga';
      const linhas = [['Identificação', `#${p.transacaoExternaId.slice(0, 14).toUpperCase()}`], ['Data/Hora', dataHora(p.confirmadoEm)]];
      if (p.metodo === 'cartao') linhas.push(['Cartão final', p.detalhes.cartaoFinal], ['Parcelas', `${p.detalhes.parcelas}x`]);
      if (p.metodo === 'cripto') {
        linhas.push(['Criptomoeda', CRIPTOS[p.detalhes.criptomoeda] ?? p.detalhes.criptomoeda], ['Cotação', moeda(p.detalhes.cotacao)], ['Quantidade', `${String(p.detalhes.quantidade).replace('.', ',')} ${p.detalhes.criptomoeda}`]);
      }
      el.innerHTML = `
        <div class="tela com-rodape">
          ${topo(false)}
          <section class="card pilha-16" style="text-align:center">
            <div class="selo-sucesso">${icone('check', 40)}</div>
            <p>${p.metodo === 'pix' ? 'Pagamento PIX aprovado!' : 'Pagamento aprovado!'}</p>
            <div class="card compacto pilha" style="text-align:left">
              <b>Detalhes da transação</b>
              <div class="lista-valores">${linhas.map(([r, v]) => `<div><span>${r}</span><span class="mono">${esc(v)}</span></div>`).join('')}</div>
            </div>
          </section>
          ${aviso('A entrega dos produtos comprados é de responsabilidade do vendedor. Em caso de dúvidas entre em contato com ele.')}
          <div class="rodape-fixo sem-borda">
            ${contatoVendedor ? `<a class="botao botao-secundario" href="mailto:${esc(contatoVendedor)}?subject=${encodeURIComponent(`Pagamento: ${cobranca.descricao}`)}">${icone('mensagem')} Conversar com o vendedor</a>` : ''}
            <p class="seguro" style="color:var(--verde-escuro);font-weight:600;font-size:15px">${icone('checkCirculo', 18)} Pagamento aprovado!</p>
          </div>
        </div>`;
    }

    function telaRecusado(p) {
      el.innerHTML = `
        <div class="tela com-rodape">
          ${topo(false)}
          <section class="card pilha-16" style="text-align:center">
            <div class="selo-sucesso selo-erro">${icone('xCirculo', 40)}</div>
            <p><b>Pagamento não aprovado</b></p>
            <p class="muted">${esc(p.motivoFalha ?? 'Tente outro método de pagamento.')}</p>
          </section>
          <div class="rodape-fixo sem-borda"><button class="botao botao-primario" id="tentar">Tentar novamente</button></div>
        </div>`;
      el.querySelector('#tentar').onclick = () => telaEscolha();
    }

    function telaIndisponivel() {
      const textos = {
        paga: ['Cobrança já paga', 'Este link já foi utilizado. Obrigado!'],
        cancelada: ['Cobrança cancelada', 'O vendedor cancelou esta cobrança.'],
        expirada: ['Link expirado', 'Peça um novo link ao vendedor.'],
      }[cobranca.status];
      el.innerHTML = `
        <div class="tela com-rodape">
          ${topo(false)}
          <section class="card pilha-16" style="text-align:center">
            <div class="selo-sucesso ${cobranca.status === 'paga' ? '' : 'selo-erro'}">${icone(cobranca.status === 'paga' ? 'check' : 'info', 40)}</div>
            <h1 class="titulo-md">${textos[0]}</h1><p class="muted">${textos[1]}</p>
          </section>
        </div>`;
    }

    telaEscolha();
  },
};

/** Desenha barras de código de barras a partir dos dígitos (visual, não é um ITF real). */
function barras(linha) {
  return [...String(linha).replace(/\D/g, '')]
    .map((d, i) => `<i style="flex:${1 + (Number(d) % 3)} 0 0;margin-right:${1 + ((Number(d) + i) % 2)}px"></i>`)
    .join('');
}
