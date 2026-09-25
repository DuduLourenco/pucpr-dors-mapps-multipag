// Painel do business (Figma: business-dashboard) | tela de apoio, compartilhada
import { api } from '../api.js';
import { carregando, dataCurta, esc, icone, ICONE_METODO, logo, moeda, NOMES_METODO } from '../ui.js';

export function itemMovimentacao(m, { comHora = false } = {}) {
  const entrada = m.valor > 0;
  const iconeMov = m.metodo
    ? `<span class="icone-redondo metodo-${m.metodo}">${icone(ICONE_METODO[m.metodo], 18)}</span>`
    : `<span class="icone-redondo mov-saida">${icone('saida', 18)}</span>`;
  const sub = m.tipo === 'saque' ? 'Pix' : NOMES_METODO[m.metodo] ?? 'Entrada';
  return `
    <div class="item-lista">
      ${comHora ? `<span class="icone-redondo ${entrada ? 'mov-entrada' : 'mov-saida'}">${icone(entrada ? 'entrada' : 'saida', 18)}</span>` : iconeMov}
      <div class="conteudo"><b>${esc(m.descricao)}</b><small>${comHora ? `${entrada ? 'Entrada' : 'Saque'} · ${sub}` : sub}</small></div>
      <div class="valor">
        <span class="mono ${comHora && entrada ? 'positivo' : ''}">${comHora ? (entrada ? '+ ' : '- ') : ''}${moeda(Math.abs(m.valor))}</span>
        <small>${comHora ? new Date(m.criadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : dataCurta(m.criadoEm)}</small>
      </div>
    </div>`;
}

export default {
  privada: true,
  async render(el) {
    el.innerHTML = carregando();
    const [business, extrato] = await Promise.all([api('/business/me'), api('/extrato?limite=4')]);
    const primeiroNome = business.nomeResponsavel.split(' ')[0];

    el.innerHTML = `
      <div class="tela com-rodape">
        <div class="entre">
          ${logo()}
          <a class="botao-icone redondo" href="#/conta" aria-label="Minha conta">${esc(primeiroNome[0])}</a>
        </div>
        <div>
          <p class="saudacao">Olá, ${esc(primeiroNome)}</p>
          <h1 class="titulo">Seu painel hoje</h1>
        </div>
        <section class="card">
          <div class="entre"><span class="rotulo-secao">Saldo disponível</span><span class="chip chip-online"><span class="ponto"></span>Online</span></div>
          <p class="saldo-valor">${moeda(business.saldoDisponivel)}</p>
          <button class="linha muted pequeno" id="atualizar" style="border:0;background:none;padding:0">${icone('atualizar', 16)} Atualizado agora</button>
        </section>
        <nav class="grade-3" aria-label="Atalhos">
          <a class="atalho" href="#/cobrancas"><span class="atalho-icone laranja">${icone('recibo')}</span>Cobranças</a>
          <a class="atalho" href="#/extrato"><span class="atalho-icone">${icone('lista')}</span>Extrato</a>
          <a class="atalho" href="#/sacar"><span class="atalho-icone">${icone('dinheiro')}</span>Sacar</a>
        </nav>
        <section class="pilha">
          <div class="entre"><h2 class="titulo-md">Últimas movimentações</h2><a class="link-texto pequeno" href="#/extrato">Ver tudo</a></div>
          ${extrato.movimentacoes.length
            ? extrato.movimentacoes.map((m) => itemMovimentacao(m)).join('')
            : '<p class="vazio-lista">Nenhuma movimentação este mês. Crie sua primeira cobrança!</p>'}
        </section>
        <div class="rodape-fixo sem-borda">
          <a class="botao botao-primario" href="#/cobrancas/nova">${icone('maisCirculo')} Nova cobrança</a>
        </div>
      </div>`;

    el.querySelector('#atualizar').onclick = () => this.render(el);
  },
};
