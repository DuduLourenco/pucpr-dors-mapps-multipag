'use client';

import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useState } from 'react';
import { Carregando } from '../_componentes/ui';
import { sessao } from '../_lib/api';

/** Telas do business: só abrem com sessão ativa; sem token, volta para o login. */
export default function LayoutPrivado({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [autenticado, setAutenticado] = useState(false);

  useEffect(() => {
    if (sessao.token) setAutenticado(true);
    else router.replace('/entrar');
  }, [router]);

  return autenticado ? children : <Carregando />;
}
