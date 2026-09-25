// TELA 4 - Lista de cobranças | Membro 2
// CRUD: READ (GET /api/cobrancas) e DELETE = cancelamento (DELETE /api/cobrancas/:id)
import { api } from '../api.js';
import { barraTopo, carregando, chipStatus, copiar, dataCurta, esc, icone, moeda, NOMES_METODO, toast } from '../ui.js';

const FILTROS = [['', 'Todas'], ['pendente', 'Pendentes'], ['paga', 'Pagas'], ['cancelada', 'Canceladas']];

export default {
  privada: true,
  async render(el) {
    el.innerHTML = carregando();
    let lista = await api('/cobrancas');
    let filtro = '';

    function desenhar() {
      const visiveis = filtro ? lista.filter((c) => c.status === filtro) : lista;
      el.innerHTML = `
        <div class="tela com-rodape">
          ${barraTopo('Cobranças', '#/painel', `<a class="botao-icone" href="#/cobrancas/nova" aria-label="Nova cobrança">${icone('mais')}</a>`)}
          <div class="pilulas rolar">
            ${FILTROS.map(([v, r]) => `<button class="pilula ${filtro === v ? 'ativa' : ''}" data-filtro="${v}">${r}</button>`).join('')}
          </div>
          <section class="pilha">
            ${visiveis.map((c) => `
              <article class="card compacto cobranca-card">
                <div class="entre">
                  <div style="min-width:0">
                    <b>${c.linkAberto ? 'Link aberto' : esc(c.clienteNome ?? c.clienteCpf)}</b>
                    <p class="muted pequeno">${esc(c.descricao)}</p>
                  </div>
                  ${chipStatus(c.status)}
                </div>
                <div class="entre">
                  <span class="mono" style="font-size:20px">${moeda(c.valor)}</span>
                  <span class="muted pequeno" style="text-align:right">${c.metodosPagamento.map((m) => NOMES_METODO[m]).join(' · ')}</span>
                </div>
                <div class="entre muted pequeno">
                  <span>Criada em ${dataCurta(c.criadoEm)}${c.recorrencia.tipo !== 'unica' ? ` · ${icone('repetir', 12)} ${c.recorrencia.tipo}` : ''}</span>
                  ${c.pagoEm ? `<span>Paga em ${dataCurta(c.pagoEm)}</span>` : ''}
                </div>
                <div class="acoes">
                  <button class="botao botao-secundario botao-pequeno" data-copiar="${esc(c.linkPagamento)}">${icone('copiar', 16)} Copiar link</button>
                  ${c.status === 'pendente' ? `
                    <a class="botao botao-secundario botao-pequeno" href="#/cobrancas/${c.id}/editar">${icone('lapis', 16)} Editar</a>
                    <button class="botao botao-perigo botao-pequeno" data-cancelar="${c.id}">Cancelar</button>` : ''}
                </div>
              </article>`).join('') || '<p class="vazio-lista">Nenhuma cobrança por aqui.</p>'}
          </section>
          <div class="rodape-fixo sem-borda">
            <a class="botao botao-primario" href="#/cobrancas/nova">${icone('maisCirculo')} Nova cobrança</a>
          </div>
        </div>`;

      el.querySelectorAll('[data-filtro]').forEach((b) => (b.onclick = () => { filtro = b.dataset.filtro; desenhar(); }));
      el.querySelectorAll('[data-copiar]').forEach((b) => (b.onclick = () => copiar(b.dataset.copiar, 'Link copiado!')));
      el.querySelectorAll('[data-cancelar]').forEach((b) => (b.onclick = async () => {
        if (!confirm('Cancelar esta cobrança? O link deixará de aceitar pagamentos.')) return;
        try {
          await api(`/cobrancas/${b.dataset.cancelar}`, { metodo: 'DELETE' });
          lista = await api('/cobrancas');
          toast('Cobrança cancelada.');
          desenhar();
        } catch (erro) {
          toast(erro.message, 'erro');
        }
      }));
    }

    desenhar();
  },
};
