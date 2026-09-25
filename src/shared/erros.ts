/**
 * Erro de regra de negócio. Carrega um código estável (usado pelo front)
 * e o status HTTP que o middleware de erros deve devolver.
 */
export class ErroDeNegocio extends Error {
  readonly codigo: string;
  readonly status: number;

  constructor(codigo: string, mensagem: string, status = 422) {
    super(mensagem);
    this.name = 'ErroDeNegocio';
    this.codigo = codigo;
    this.status = status;
  }
}

export class ErroNaoEncontrado extends ErroDeNegocio {
  constructor(recurso: string) {
    super('NAO_ENCONTRADO', `${recurso} não encontrado(a).`, 404);
  }
}

export class ErroNaoAutorizado extends ErroDeNegocio {
  constructor(mensagem = 'Sessão inválida ou expirada. Faça login novamente.') {
    super('NAO_AUTORIZADO', mensagem, 401);
  }
}
