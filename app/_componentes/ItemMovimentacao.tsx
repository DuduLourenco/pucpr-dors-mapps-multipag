import { dataCurta, hora, moeda, NOMES_METODO } from '../_lib/formato';
import type { MovimentacaoJson } from '../_lib/tipos';
import { Icone, ICONE_METODO } from './Icone';

/** Linha de movimentação usada no painel (resumida) e no extrato (com hora e sinal). */
export function ItemMovimentacao({ m, comHora = false }: { m: MovimentacaoJson; comHora?: boolean }) {
  const entrada = m.valor > 0;
  const sub = m.tipo === 'saque' ? 'Pix' : m.metodo ? NOMES_METODO[m.metodo] : 'Entrada';

  let icone;
  if (comHora) {
    icone = <span className={`icone-redondo ${entrada ? 'mov-entrada' : 'mov-saida'}`}><Icone nome={entrada ? 'entrada' : 'saida'} tamanho={18} /></span>;
  } else if (m.metodo) {
    icone = <span className={`icone-redondo metodo-${m.metodo}`}><Icone nome={ICONE_METODO[m.metodo]} tamanho={18} /></span>;
  } else {
    icone = <span className="icone-redondo mov-saida"><Icone nome="saida" tamanho={18} /></span>;
  }

  return (
    <div className="item-lista">
      {icone}
      <div className="conteudo">
        <b>{m.descricao}</b>
        <small>{comHora ? `${entrada ? 'Entrada' : 'Saque'} · ${sub}` : sub}</small>
      </div>
      <div className="valor">
        <span className={`mono ${comHora && entrada ? 'positivo' : ''}`}>{comHora ? (entrada ? '+ ' : '- ') : ''}{moeda(Math.abs(m.valor))}</span>
        <small>{comHora ? hora(m.criadoEm) : dataCurta(m.criadoEm)}</small>
      </div>
    </div>
  );
}
