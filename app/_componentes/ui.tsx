'use client';

/** Componentes visuais compartilhados por todas as telas. */
import Link from 'next/link';
import { type ButtonHTMLAttributes, type CSSProperties, type InputHTMLAttributes, type ReactNode, useState } from 'react';
import type { StatusCobranca, StatusSaque } from '../_lib/tipos';
import { Icone, type NomeIcone } from './Icone';

export function Logo() {
  return (
    <div className="logo">
      <span className="logo-marca"><Icone nome="camadas" /></span>
      <span><b>Multi</b>Pag</span>
    </div>
  );
}

export function BarraTopo({ titulo, voltarPara, acao }: { titulo: string; voltarPara: string; acao?: ReactNode }) {
  return (
    <header className="barra-topo">
      <Link className="botao-icone" href={voltarPara} aria-label="Voltar"><Icone nome="voltar" /></Link>
      <h1>{titulo}</h1>
      {acao ?? <span className="botao-icone vazio" />}
    </header>
  );
}

export function Etapas({ atual, total, rotulo }: { atual: number; total: number; rotulo: string }) {
  return (
    <>
      <div className="etapas" style={{ '--total': total } as CSSProperties}>
        {Array.from({ length: total }, (_, i) => <span key={i} className={i < atual ? 'feita' : ''} />)}
      </div>
      <div className="etapas-rotulo"><span>Etapa {atual} de {total}</span><span>{rotulo}</span></div>
    </>
  );
}

export function Aviso({ tipo = 'neutro', icone = 'info', children }: { tipo?: 'neutro' | 'sucesso' | 'erro'; icone?: NomeIcone; children: ReactNode }) {
  return (
    <div className={`aviso aviso-${tipo}`}>
      <Icone nome={icone} tamanho={18} />
      <p>{children}</p>
    </div>
  );
}

export function Carregando() {
  return <div className="tela centro"><Icone nome="carregando" tamanho={28} classe="girando" /></div>;
}

const ROTULOS_STATUS: Record<StatusCobranca | StatusSaque, string> = {
  pendente: 'Pendente', paga: 'Paga', cancelada: 'Cancelada', expirada: 'Expirada',
  solicitado: 'Solicitado', processando: 'Processando', concluido: 'Concluído', falhou: 'Falhou',
};

export function ChipStatus({ status }: { status: StatusCobranca | StatusSaque }) {
  return <span className={`chip chip-${status}`}>{ROTULOS_STATUS[status]}</span>;
}

/** Botão que fica desabilitado e mostra "carregando" enquanto a operação roda (ver useCarregamento). */
export function Botao({ carregando = false, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { carregando?: boolean }) {
  return (
    <button {...props} disabled={carregando || props.disabled}>
      {carregando ? <Icone nome="carregando" classe="girando" /> : children}
    </button>
  );
}

/** Campo de senha com o botão de "olho" para mostrar/esconder. */
export function EntradaSenha(props: InputHTMLAttributes<HTMLInputElement>) {
  const [visivel, setVisivel] = useState(false);
  return (
    <div className="entrada-com-acao">
      <input className="entrada" {...props} type={visivel ? 'text' : 'password'} />
      <button type="button" className="acao" aria-label="Mostrar senha" onClick={() => setVisivel(!visivel)}>
        <Icone nome="olho" />
      </button>
    </div>
  );
}
