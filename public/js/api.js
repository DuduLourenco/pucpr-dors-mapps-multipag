const CHAVE_TOKEN = 'multipag.token';

/** Token de login guardado no navegador (localStorage pode falhar em aba anônima). */
export const sessao = {
  get token() {
    try { return localStorage.getItem(CHAVE_TOKEN); } catch { return null; }
  },
  salvar(token) {
    try { localStorage.setItem(CHAVE_TOKEN, token); } catch { /* segue sem persistir */ }
  },
  limpar() {
    try { localStorage.removeItem(CHAVE_TOKEN); } catch { /* nada */ }
  },
};

export class ErroApi extends Error {
  constructor(mensagem, codigo, status) {
    super(mensagem);
    this.codigo = codigo;
    this.status = status;
  }
}

/** Chama a API do MultiPag. Lança ErroApi com a mensagem vinda do servidor. */
export async function api(caminho, { metodo = 'GET', corpo, resposta = 'json' } = {}) {
  const token = sessao.token;
  const resp = await fetch(`/api${caminho}`, {
    method: metodo,
    headers: {
      ...(corpo !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: corpo !== undefined ? JSON.stringify(corpo) : undefined,
  });

  if (resp.status === 401 && token) {
    sessao.limpar();
    location.hash = '#/entrar';
  }
  if (!resp.ok) {
    const erro = await resp.json().catch(() => ({}));
    throw new ErroApi(erro.mensagem ?? 'Não foi possível completar a operação.', erro.codigo, resp.status);
  }
  if (resp.status === 204) return null;
  return resposta === 'blob' ? resp.blob() : resp.json();
}
