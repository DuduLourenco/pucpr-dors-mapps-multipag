// TELA 6 - Saque via Pix (Figma: saque) | Membro 3
// CRUD: CREATE (POST /api/saques) e READ (GET /api/saques). Saque não tem UPDATE/DELETE (auditoria).
import { api } from '../api.js';
import { aoSair, aviso, barraTopo, carregando, chipStatus, comCarregamento, cpfValido, dataCurta, esc, icone, moeda, toast } from '../ui.js';

const ATALHOS = [100, 500, 1000];

/** Descobre o tipo da chave Pix pelo formato. */
function tipoChave(chave) {
  const c = chave.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c)) return 'E-mail';
  if (cpfValido(c)) return 'CPF';
  if (/^\+?55?\s?\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/.test(c)) return 'Telefone';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c)) return 'Aleatória';
  return '';
}

export default {
  privada: true,
  async render(el) {
    el.innerHTML = carregando();
    const [business, saques] = await Promise.all([api('/business/me'), api('/saques')]);
    const saldo = business.saldoDisponivel;
    const estado = { centavos: 0, chave: business.email, erro: '' };
    const valor = () => estado.centavos / 100;

    el.innerHTML = `
      <form class="tela com-rodape" id="form" novalidate>
        ${barraTopo('Sacar', '#/painel')}
        <section class="card entre">
          <div><p class="muted">Saldo disponível</p><p class="mono" style="font-size:24px">${moeda(saldo)}</p></div>
          <span class="chip chip-laranja">Somente via Pix</span>
        </section>

        <section class="pilha">
          <label class="titulo-md" for="valor">Quanto você quer sacar?</label>
          <div class="valor-saque"><span>R$</span><input id="valor" inputmode="numeric" value="0,00" autocomplete="off" /></div>
          <div class="pilulas grade-4">
            ${ATALHOS.map((v) => `<button type="button" class="pilula contorno" data-valor="${v}" ${v > saldo ? 'disabled' : ''}>${moeda(v).replace(',00', '')}</button>`).join('')}
            <button type="button" class="pilula contorno" data-valor="${saldo}">Tudo</button>
          </div>
        </section>

        <div class="campo">
          <label for="chave">Chave Pix de destino</label>
          <div class="entrada-com-acao"><input class="entrada" id="chave" value="${esc(estado.chave)}" autocomplete="off" /><span class="acao" style="width:auto;right:10px"><span class="tag" id="tipo-chave"></span></span></div>
        </div>
        <div id="status-chave"></div>

        <section class="pilha">
          <h2 class="titulo-md">Saques recentes</h2>
          ${saques.length ? `<div class="card compacto pilha">${saques.slice(0, 5).map((s, i) => `
            ${i ? '<div class="divisor"></div>' : ''}
            <div class="entre">
              <div><p class="mono" style="font-size:17px">${moeda(s.valor)}</p>
                <p class="muted pequeno">Solicitado ${dataCurta(s.solicitadoEm)}${s.concluidoEm ? ` · Concluído ${dataCurta(s.concluidoEm)}` : ''}</p></div>
              ${chipStatus(s.status)}
            </div>`).join('')}</div>` : '<p class="vazio-lista">Você ainda não fez nenhum saque.</p>'}
          <p class="seguro">${icone('relogio', 16)} O valor cai na conta em instantes.</p>
        </section>
        <div id="erro"></div>

        <div class="rodape-fixo">
          <button class="botao botao-primario" type="submit">Confirmar saque</button>
        </div>
      </form>`;

    const $ = (s) => el.querySelector(s);
    const campoValor = $('#valor');

    function atualizarValor() {
      campoValor.value = (estado.centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      el.querySelectorAll('[data-valor]').forEach((b) => b.classList.toggle('ativa', Math.round(Number(b.dataset.valor) * 100) === estado.centavos));
    }
    function atualizarChave() {
      const tipo = tipoChave(estado.chave);
      $('#tipo-chave').textContent = tipo || '?';
      $('#status-chave').innerHTML = tipo
        ? aviso(`<b>Chave ${tipo.toLowerCase()} válida</b><br />O titular é confirmado pelo banco no momento da transferência.`, 'sucesso', 'checkCirculo')
        : estado.chave ? aviso('Formato de chave não reconhecido. Use e-mail, CPF, telefone ou chave aleatória.', 'erro') : '';
    }

    // Digitação estilo "caixa eletrônico": cada dígito entra pela direita (centavos).
    campoValor.oninput = () => {
      estado.centavos = Number(campoValor.value.replace(/\D/g, '').slice(0, 10)) || 0;
      atualizarValor();
    };
    el.querySelectorAll('[data-valor]').forEach((b) => (b.onclick = () => { estado.centavos = Math.round(Number(b.dataset.valor) * 100); atualizarValor(); }));
    $('#chave').oninput = (e) => { estado.chave = e.target.value; atualizarChave(); };

    $('#form').onsubmit = async (e) => {
      e.preventDefault();
      const erro = $('#erro');
      if (valor() <= 0) return (erro.innerHTML = aviso('Informe quanto você quer sacar.', 'erro'));
      if (valor() > saldo) return (erro.innerHTML = aviso('Valor maior que o saldo disponível.', 'erro'));
      if (!tipoChave(estado.chave)) return (erro.innerHTML = aviso('Informe uma chave Pix válida.', 'erro'));
      await comCarregamento(e.submitter, async () => {
        try {
          await api('/saques', { metodo: 'POST', corpo: { valor: valor(), chavePix: estado.chave.trim() } });
          toast('Saque solicitado! O valor cai em instantes.');
          await this.render(el);
          // Recarrega depois que o Pix de saída (simulado) for concluído.
          const t = setTimeout(() => location.hash === '#/sacar' && this.render(el), 7000);
          aoSair(() => clearTimeout(t));
        } catch (err) {
          erro.innerHTML = aviso(esc(err.message), 'erro');
        }
      });
    };

    atualizarValor();
    atualizarChave();
  },
};
