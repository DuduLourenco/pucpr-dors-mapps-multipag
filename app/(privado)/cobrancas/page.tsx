'use client';

// TELA 4 - Lista de cobranças | Membro 2
// CRUD: READ (GET /api/cobrancas) e DELETE = cancelamento (DELETE /api/cobrancas/:id)
import Link from 'next/link';
import { useState } from 'react';
import { Icone } from '../../_componentes/Icone';
import { copiar, toast } from '../../_componentes/Toast';
import { BarraTopo, Carregando, ChipStatus } from '../../_componentes/ui';
import { api, mensagemDe } from '../../_lib/api';
import { dataCurta, moeda, NOMES_METODO } from '../../_lib/formato';
import { useDados } from '../../_lib/hooks';
import type { CobrancaJson } from '../../_lib/tipos';

const FILTROS = [['', 'Todas'], ['pendente', 'Pendentes'], ['paga', 'Pagas'], ['cancelada', 'Canceladas']];

export default function Cobrancas() {
  const { dados: lista, recarregar } = useDados(() => api<CobrancaJson[]>('/cobrancas'));
  const [filtro, setFiltro] = useState('');

  if (!lista) return <Carregando />;
  const visiveis = filtro ? lista.filter((c) => c.status === filtro) : lista;

  async function cancelar(id: string) {
    if (!confirm('Cancelar esta cobrança? O link deixará de aceitar pagamentos.')) return;
    try {
      await api(`/cobrancas/${id}`, { metodo: 'DELETE' });
      await recarregar();
      toast('Cobrança cancelada.');
    } catch (erro) {
      toast(mensagemDe(erro), 'erro');
    }
  }

  return (
    <div className="tela com-rodape">
      <BarraTopo
        titulo="Cobranças"
        voltarPara="/painel"
        acao={<Link className="botao-icone" href="/cobrancas/nova" aria-label="Nova cobrança"><Icone nome="mais" /></Link>}
      />
      <div className="pilulas rolar">
        {FILTROS.map(([valor, rotulo]) => (
          <button key={valor} className={`pilula ${filtro === valor ? 'ativa' : ''}`} onClick={() => setFiltro(valor)}>{rotulo}</button>
        ))}
      </div>
      <section className="pilha">
        {visiveis.map((c) => (
          <article key={c.id} className="card compacto cobranca-card">
            <div className="entre">
              <div style={{ minWidth: 0 }}>
                <b>{c.linkAberto ? 'Link aberto' : c.clienteNome ?? c.clienteCpf}</b>
                <p className="muted pequeno">{c.descricao}</p>
              </div>
              <ChipStatus status={c.status} />
            </div>
            <div className="entre">
              <span className="mono" style={{ fontSize: 20 }}>{moeda(c.valor)}</span>
              <span className="muted pequeno" style={{ textAlign: 'right' }}>{c.metodosPagamento.map((m) => NOMES_METODO[m]).join(' · ')}</span>
            </div>
            <div className="entre muted pequeno">
              <span>
                Criada em {dataCurta(c.criadoEm)}
                {c.recorrencia.tipo !== 'unica' && <> · <Icone nome="repetir" tamanho={12} /> {c.recorrencia.tipo}</>}
              </span>
              {c.pagoEm && <span>Paga em {dataCurta(c.pagoEm)}</span>}
            </div>
            <div className="acoes">
              <button className="botao botao-secundario botao-pequeno" onClick={() => copiar(c.linkPagamento, 'Link copiado!')}>
                <Icone nome="copiar" tamanho={16} /> Copiar link
              </button>
              {c.status === 'pendente' && (
                <>
                  <Link className="botao botao-secundario botao-pequeno" href={`/cobrancas/${c.id}/editar`}><Icone nome="lapis" tamanho={16} /> Editar</Link>
                  <button className="botao botao-perigo botao-pequeno" onClick={() => cancelar(c.id)}>Cancelar</button>
                </>
              )}
            </div>
          </article>
        ))}
        {!visiveis.length && <p className="vazio-lista">Nenhuma cobrança por aqui.</p>}
      </section>
      <div className="rodape-fixo sem-borda">
        <Link className="botao botao-primario" href="/cobrancas/nova"><Icone nome="maisCirculo" /> Nova cobrança</Link>
      </div>
    </div>
  );
}
