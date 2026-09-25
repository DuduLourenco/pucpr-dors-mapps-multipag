// Extrato (Figma: extrato) | tela de apoio. Exporta via Template Method ExportadorExtrato (CSV/TXT)
import { api } from '../api.js';
import { aoSair, carregando, esc, icone, moeda, toast } from '../ui.js';
import { itemMovimentacao } from './painel.js';

function ultimosMeses(qtd = 12) {
  const hoje = new Date();
  return Array.from({ length: qtd }, (_, i) => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
    return {
      valor: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      rotulo: d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(' de ', ' '),
    };
  });
}

function rotuloDia(iso) {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date(Date.now() - 86400000);
  const curto = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '').replace(' de ', ' ');
  if (d.toDateString() === hoje.toDateString()) return `Hoje · ${curto}`;
  if (d.toDateString() === ontem.toDateString()) return `Ontem · ${curto}`;
  return curto;
}

export default {
  privada: true,
  async render(el) {
    const estado = { mes: ultimosMeses(1)[0].valor, tipo: '' };

    async function desenhar() {
      el.innerHTML = carregando();
      const q = new URLSearchParams({ mes: estado.mes, ...(estado.tipo ? { tipo: estado.tipo } : {}) });
      const dados = await api(`/extrato?${q}`);

      const grupos = new Map();
      for (const m of dados.movimentacoes) {
        const chave = rotuloDia(m.criadoEm);
        grupos.set(chave, [...(grupos.get(chave) ?? []), m]);
      }
      const nomeMes = ultimosMeses().find((m) => m.valor === estado.mes)?.rotulo.split(' ')[0] ?? '';

      el.innerHTML = `
        <div class="tela">
          <header class="barra-topo">
            <a class="botao-icone" href="#/painel" aria-label="Voltar">${icone('voltar')}</a>
            <h1>Extrato</h1>
            <div class="menu">
              <button class="botao-icone" id="abrir-menu" aria-label="Exportar" aria-expanded="false">${icone('filtros')}</button>
              <div class="menu-itens oculto" id="menu">
                <button data-formato="csv">${icone('baixar', 18)} Exportar planilha (CSV)</button>
                <button data-formato="txt">${icone('baixar', 18)} Exportar comprovante (TXT)</button>
              </div>
            </div>
          </header>

          <section class="card">
            <label class="linha" style="gap:6px">
              <select class="seletor-mes" id="mes" aria-label="Mês">
                ${ultimosMeses().map((m) => `<option value="${m.valor}" ${m.valor === estado.mes ? 'selected' : ''}>${m.rotulo}</option>`).join('')}
              </select>${icone('seta', 18)}
            </label>
            <div class="resumo-mes">
              <div><span class="muted pequeno">Entradas</span><span class="mono positivo">+ ${moeda(dados.resumo.entradas)}</span></div>
              <div class="sep"></div>
              <div><span class="muted pequeno">Saques</span><span class="mono">- ${moeda(dados.resumo.saques)}</span></div>
            </div>
            <div class="divisor"></div>
            <div class="entre" style="margin-top:10px"><span class="muted pequeno">Saldo disponível</span><span class="mono">${moeda(dados.saldoDisponivel)}</span></div>
          </section>

          <div class="pilulas">
            ${[['', 'Todas'], ['entrada_pagamento', 'Entradas'], ['saque', 'Saques']]
              .map(([v, r]) => `<button class="pilula ${estado.tipo === v ? 'ativa' : ''}" data-tipo="${v}">${r}</button>`).join('')}
          </div>

          <section class="pilha">
            ${[...grupos].map(([dia, movs]) => `<h2 class="grupo-data">${esc(dia)}</h2>${movs.map((m) => itemMovimentacao(m, { comHora: true })).join('')}`).join('')}
            <p class="vazio-lista">${dados.movimentacoes.length ? `Fim das movimentações de ${esc(nomeMes)}` : 'Nenhuma movimentação neste período.'}</p>
          </section>
        </div>`;

      el.querySelector('#mes').onchange = (e) => { estado.mes = e.target.value; desenhar(); };
      el.querySelectorAll('[data-tipo]').forEach((b) => (b.onclick = () => { estado.tipo = b.dataset.tipo; desenhar(); }));

      const menu = el.querySelector('#menu');
      const abrir = el.querySelector('#abrir-menu');
      abrir.onclick = (e) => {
        e.stopPropagation();
        menu.classList.toggle('oculto');
        abrir.setAttribute('aria-expanded', String(!menu.classList.contains('oculto')));
      };
      const fechar = () => menu.classList.add('oculto');
      document.addEventListener('click', fechar);
      aoSair(() => document.removeEventListener('click', fechar));

      el.querySelectorAll('[data-formato]').forEach((b) => (b.onclick = async () => {
        try {
          const blob = await api(`/extrato/exportar?formato=${b.dataset.formato}&mes=${estado.mes}`, { resposta: 'blob' });
          const url = URL.createObjectURL(blob);
          Object.assign(document.createElement('a'), { href: url, download: `extrato-${estado.mes}.${b.dataset.formato}` }).click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (erro) {
          toast(erro.message, 'erro');
        }
      }));
    }

    await desenhar();
  },
};
