import { type DependencyList, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from '../_componentes/Toast';
import { mensagemDe } from './api';

/**
 * Busca os dados de uma tela ao abrir (e de novo quando `deps` muda).
 * Enquanto não chegam, `dados` é null e a tela mostra <Carregando />.
 */
export function useDados<T>(buscar: () => Promise<T>, deps: DependencyList = []) {
  const [dados, setDados] = useState<T | null>(null);
  const pedido = useRef(0);

  const recarregar = useCallback(async () => {
    const meu = ++pedido.current;
    try {
      const resultado = await buscar();
      // Só vale a resposta do pedido mais recente (ex.: filtro trocado duas vezes seguidas).
      if (meu === pedido.current) setDados(resultado);
    } catch (erro) {
      if (meu === pedido.current) toast(mensagemDe(erro), 'erro');
    }
  }, deps);

  useEffect(() => {
    void recarregar();
    return () => {
      pedido.current++;
    };
  }, [recarregar]);

  return { dados, recarregar };
}

/** Controla o "carregando" de um botão enquanto a operação assíncrona roda. */
export function useCarregamento() {
  const [carregando, setCarregando] = useState(false);

  async function executar(operacao: () => Promise<void>) {
    setCarregando(true);
    try {
      await operacao();
    } finally {
      setCarregando(false);
    }
  }

  return [carregando, executar] as const;
}
