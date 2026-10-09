'use client';

// Extrato (Figma: extrato) | tela de apoio. Exporta via Template Method ExportadorExtrato (CSV/TXT)
import Link from 'next/link';
import { Fragment, useEffect, useState } from 'react';
import { Icone } from '../../_componentes/Icone';
import { ItemMovimentacao } from '../../_componentes/ItemMovimentacao';
import { toast } from '../../_componentes/Toast';
import { Carregando } from '../../_componentes/ui';
import { api, mensagemDe } from '../../_lib/api';
import { moeda } from '../../_lib/formato';
import { useDados } from '../../_lib/hooks';
import type { ExtratoJson, MovimentacaoJson } from '../../_lib/tipos';

const TIPOS = [['', 'Todas'], ['entrada_pagamento', 'Entradas'], ['saque', 'Saques']];

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

function rotuloDia(iso: string) {
  const d = new Date(iso);
  const hoje = new Date();
  const ontem = new Date(Date.now() - 86400000);
  const curto = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '').replace(' de ', ' ');
  if (d.toDateString() === hoje.toDateString()) return `Hoje · ${curto}`;
  if (d.toDateString() === ontem.toDateString()) return `Ontem · ${curto}`;
  return curto;
}

export default function Extrato() {
  const meses = ultimosMeses();
  const [mes, setMes] = useState(meses[0].valor);
  const [tipo, setTipo] = useState('');
  const [menuAberto, setMenuAberto] = useState(false);
  const { dados } = useDados(() => api<ExtratoJson>(`/extrato?${new URLSearchParams({ mes, ...(tipo ? { tipo } : {}) })}`), [mes, tipo]);

  // Clicar em qualquer lugar fora do menu de exportação fecha o menu.
  useEffect(() => {
    if (!menuAberto) return;
    const fechar = () => setMenuAberto(false);
    document.addEventListener('click', fechar);
    return () => document.removeEventListener('click', fechar);
  }, [menuAberto]);

  if (!dados) return <Carregando />;

  const grupos = new Map<string, MovimentacaoJson[]>();
  for (const m of dados.movimentacoes) {
    const dia = rotuloDia(m.criadoEm);
    grupos.set(dia, [...(grupos.get(dia) ?? []), m]);
  }
  const nomeMes = meses.find((m) => m.valor === mes)?.rotulo.split(' ')[0] ?? '';

  async function exportar(formato: string) {
    try {
      const blob = await api<Blob>(`/extrato/exportar?formato=${formato}&mes=${mes}`, { resposta: 'blob' });
      const url = URL.createObjectURL(blob);
      Object.assign(document.createElement('a'), { href: url, download: `extrato-${mes}.${formato}` }).click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (erro) {
      toast(mensagemDe(erro), 'erro');
    }
  }

  return (
    <div className="tela">
      <header className="barra-topo">
        <Link className="botao-icone" href="/painel" aria-label="Voltar"><Icone nome="voltar" /></Link>
        <h1>Extrato</h1>
        <div className="menu">
          <button className="botao-icone" aria-label="Exportar" aria-expanded={menuAberto} onClick={() => setMenuAberto(!menuAberto)}><Icone nome="filtros" /></button>
          {menuAberto && (
            <div className="menu-itens">
              <button onClick={() => exportar('csv')}><Icone nome="baixar" tamanho={18} /> Exportar planilha (CSV)</button>
              <button onClick={() => exportar('txt')}><Icone nome="baixar" tamanho={18} /> Exportar comprovante (TXT)</button>
            </div>
          )}
        </div>
      </header>

      <section className="card">
        <label className="linha" style={{ gap: 6 }}>
          <select className="seletor-mes" aria-label="Mês" value={mes} onChange={(e) => setMes(e.target.value)}>
            {meses.map((m) => <option key={m.valor} value={m.valor}>{m.rotulo}</option>)}
          </select>
          <Icone nome="seta" tamanho={18} />
        </label>
        <div className="resumo-mes">
          <div><span className="muted pequeno">Entradas</span><span className="mono positivo">+ {moeda(dados.resumo.entradas)}</span></div>
          <div className="sep" />
          <div><span className="muted pequeno">Saques</span><span className="mono">- {moeda(dados.resumo.saques)}</span></div>
        </div>
        <div className="divisor" />
        <div className="entre" style={{ marginTop: 10 }}><span className="muted pequeno">Saldo disponível</span><span className="mono">{moeda(dados.saldoDisponivel)}</span></div>
      </section>

      <div className="pilulas">
        {TIPOS.map(([valor, rotulo]) => (
          <button key={valor} className={`pilula ${tipo === valor ? 'ativa' : ''}`} onClick={() => setTipo(valor)}>{rotulo}</button>
        ))}
      </div>

      <section className="pilha">
        {[...grupos].map(([dia, movimentacoes]) => (
          <Fragment key={dia}>
            <h2 className="grupo-data">{dia}</h2>
            {movimentacoes.map((m) => <ItemMovimentacao key={m.id} m={m} comHora />)}
          </Fragment>
        ))}
        <p className="vazio-lista">{dados.movimentacoes.length ? `Fim das movimentações de ${nomeMes}` : 'Nenhuma movimentação neste período.'}</p>
      </section>
    </div>
  );
}
