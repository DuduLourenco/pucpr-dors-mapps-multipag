'use client';

// Painel do business (Figma: business-dashboard) | tela de apoio, compartilhada
import Link from 'next/link';
import { Icone } from '../../_componentes/Icone';
import { ItemMovimentacao } from '../../_componentes/ItemMovimentacao';
import { Carregando, Logo } from '../../_componentes/ui';
import { api } from '../../_lib/api';
import { moeda } from '../../_lib/formato';
import { useDados } from '../../_lib/hooks';
import type { BusinessJson, ExtratoJson } from '../../_lib/tipos';

export default function Painel() {
  const { dados, recarregar } = useDados(() => Promise.all([api<BusinessJson>('/business/me'), api<ExtratoJson>('/extrato?limite=4')]));

  if (!dados) return <Carregando />;
  const [business, extrato] = dados;
  const primeiroNome = business.nomeResponsavel.split(' ')[0];

  return (
    <div className="tela com-rodape">
      <div className="entre">
        <Logo />
        <Link className="botao-icone redondo" href="/conta" aria-label="Minha conta">{primeiroNome[0]}</Link>
      </div>
      <div>
        <p className="saudacao">Olá, {primeiroNome}</p>
        <h1 className="titulo">Seu painel hoje</h1>
      </div>
      <section className="card">
        <div className="entre"><span className="rotulo-secao">Saldo disponível</span><span className="chip chip-online"><span className="ponto" />Online</span></div>
        <p className="saldo-valor">{moeda(business.saldoDisponivel)}</p>
        <button className="linha muted pequeno" style={{ border: 0, background: 'none', padding: 0 }} onClick={recarregar}>
          <Icone nome="atualizar" tamanho={16} /> Atualizado agora
        </button>
      </section>
      <nav className="grade-3" aria-label="Atalhos">
        <Link className="atalho" href="/cobrancas"><span className="atalho-icone laranja"><Icone nome="recibo" /></span>Cobranças</Link>
        <Link className="atalho" href="/extrato"><span className="atalho-icone"><Icone nome="lista" /></span>Extrato</Link>
        <Link className="atalho" href="/sacar"><span className="atalho-icone"><Icone nome="dinheiro" /></span>Sacar</Link>
      </nav>
      <section className="pilha">
        <div className="entre"><h2 className="titulo-md">Últimas movimentações</h2><Link className="link-texto pequeno" href="/extrato">Ver tudo</Link></div>
        {extrato.movimentacoes.length
          ? extrato.movimentacoes.map((m) => <ItemMovimentacao key={m.id} m={m} />)
          : <p className="vazio-lista">Nenhuma movimentação este mês. Crie sua primeira cobrança!</p>}
      </section>
      <div className="rodape-fixo sem-borda">
        <Link className="botao botao-primario" href="/cobrancas/nova"><Icone nome="maisCirculo" /> Nova cobrança</Link>
      </div>
    </div>
  );
}
