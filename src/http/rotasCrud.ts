import { Router } from 'express';
import type { CrudServiceTemplateMethod } from '../crud/CrudServiceTemplateMethod';
import type { Entidade } from '../domain/Entidade';
import { contexto } from './middlewares';

/**
 * Gera as 5 rotas REST de qualquer CrudServiceTemplateMethod. Cobranças e saques usam
 * esta mesma função: mais um ganho direto de ter uma base comum.
 */
export function rotasCrud<T extends Entidade>(service: CrudServiceTemplateMethod<T, any, any>): Router {
  const rotas = Router();
  rotas.get('/', async (_req, res) => {
    res.json(await service.listar(contexto(res)));
  });
  rotas.get('/:id', async (req, res) => {
    res.json(await service.buscar(req.params.id, contexto(res)));
  });
  rotas.post('/', async (req, res) => {
    res.status(201).json(await service.criar(req.body, contexto(res)));
  });
  rotas.put('/:id', async (req, res) => {
    res.json(await service.atualizar(req.params.id, req.body, contexto(res)));
  });
  rotas.delete('/:id', async (req, res) => {
    await service.remover(req.params.id, contexto(res));
    res.status(204).end();
  });
  return rotas;
}
