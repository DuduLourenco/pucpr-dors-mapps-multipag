'use client';

import { useParams } from 'next/navigation';
import { Carregando } from '../../../../_componentes/ui';
import { api } from '../../../../_lib/api';
import { useDados } from '../../../../_lib/hooks';
import type { CobrancaJson } from '../../../../_lib/tipos';
import { FormCobranca } from '../../FormCobranca';

export default function EditarCobranca() {
  const { id } = useParams<{ id: string }>();
  const { dados: cobranca } = useDados(() => api<CobrancaJson>(`/cobrancas/${id}`), [id]);
  return cobranca ? <FormCobranca cobranca={cobranca} /> : <Carregando />;
}
