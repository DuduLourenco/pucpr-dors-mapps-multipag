'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Carregando } from './_componentes/ui';
import { sessao } from './_lib/api';

/** Entrada do site: leva ao painel (se já logado) ou ao login. */
export default function Inicio() {
  const router = useRouter();

  useEffect(() => {
    // Links enviados antes da migração usavam hash (/#/pagar/<token>) e continuam valendo.
    const rotaAntiga = window.location.hash.match(/^#(\/.+)/)?.[1];
    router.replace(rotaAntiga ?? (sessao.token ? '/painel' : '/entrar'));
  }, [router]);

  return <Carregando />;
}
