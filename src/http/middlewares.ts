import type { NextFunction, Request, Response } from 'express';
import type { Contexto } from '../crud/CrudServiceTemplateMethod';
import { AuthService } from '../services/AuthService';
import { ErroDeNegocio } from '../shared/erros';

const auth = new AuthService();

/** Lê o "Authorization: Bearer <token>" e guarda o business logado em res.locals. */
export function autenticar(req: Request, res: Response, next: NextFunction): void {
  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '');
  res.locals.businessId = auth.verificar(token);
  next();
}

export function contexto(res: Response): Contexto {
  return { businessId: res.locals.businessId };
}

/** Converte qualquer erro em JSON { codigo, mensagem } com o status certo. */
export function tratarErros(erro: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (erro instanceof ErroDeNegocio) {
    res.status(erro.status).json({ codigo: erro.codigo, mensagem: erro.message });
    return;
  }
  if (erro instanceof SyntaxError) {
    res.status(400).json({ codigo: 'JSON_INVALIDO', mensagem: 'Corpo da requisição não é um JSON válido.' });
    return;
  }
  // Violação de UNIQUE no Postgres (ex.: dois cadastros simultâneos com o mesmo e-mail)
  if ((erro as { code?: string })?.code === '23505') {
    res.status(409).json({ codigo: 'DUPLICADO', mensagem: 'Registro já existente.' });
    return;
  }
  console.error(erro);
  res.status(500).json({ codigo: 'ERRO_INTERNO', mensagem: 'Erro inesperado. Tente novamente.' });
}
