'use client';

import { useSyncExternalStore } from 'react';

type TipoToast = 'ok' | 'erro';

let atual: { mensagem: string; tipo: TipoToast } | null = null;
let timer: ReturnType<typeof setTimeout>;
const ouvintes = new Set<() => void>();

function definir(valor: typeof atual) {
  atual = valor;
  ouvintes.forEach((avisar) => avisar());
}

function assinar(avisar: () => void) {
  ouvintes.add(avisar);
  return () => {
    ouvintes.delete(avisar);
  };
}

/** Mensagem rápida no rodapé. Pode ser chamada de qualquer lugar do front (telas, hooks...). */
export function toast(mensagem: string, tipo: TipoToast = 'ok') {
  definir({ mensagem, tipo });
  clearTimeout(timer);
  timer = setTimeout(() => definir(null), 3500);
}

export async function copiar(texto: string, rotulo = 'Copiado!') {
  try {
    await navigator.clipboard.writeText(texto);
    toast(rotulo);
  } catch {
    prompt('Copie o texto abaixo:', texto);
  }
}

/** Fica no layout raiz e mostra o que for enviado por toast(). */
export function Toast() {
  const visivel = useSyncExternalStore(assinar, () => atual, () => null);
  return (
    <div id="toast" role="status" className={visivel ? `toast-${visivel.tipo}` : undefined} hidden={!visivel}>
      {visivel?.mensagem}
    </div>
  );
}
