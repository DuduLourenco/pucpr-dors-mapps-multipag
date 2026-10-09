const CHAVE_TOKEN = 'multipag.token';

/** Token de login guardado no navegador (localStorage pode falhar em aba anônima). */
export const sessao = {
  get token(): string | null {
    try { return localStorage.getItem(CHAVE_TOKEN); } catch { return null; }
  },
  salvar(token: string) {
    try { localStorage.setItem(CHAVE_TOKEN, token); } catch { /* segue sem persistir */ }
  },
  limpar() {
    try { localStorage.removeItem(CHAVE_TOKEN); } catch { /* nada */ }
  },
};

export class ErroApi extends Error {
  readonly codigo?: string;
  readonly status: number;

  constructor(mensagem: string, codigo: string | undefined, status: number) {
    super(mensagem);
    this.codigo = codigo;
    this.status = status;
  }
}

export const mensagemDe = (erro: unknown) => (erro instanceof Error ? erro.message : 'Algo deu errado.');
export const codigoDe = (erro: unknown) => (erro instanceof ErroApi ? erro.codigo ?? '' : '');

interface OpcoesApi {
  metodo?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  corpo?: unknown;
  resposta?: 'json' | 'blob';
}

/** Chama a API do MultiPag. Lança ErroApi com a mensagem vinda do servidor. */
export async function api<T = unknown>(caminho: string, { metodo = 'GET', corpo, resposta = 'json' }: OpcoesApi = {}): Promise<T> {
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
    window.location.assign('/entrar');
  }
  if (!resp.ok) {
    const erro = await resp.json().catch(() => ({}));
    throw new ErroApi(erro.mensagem ?? 'Não foi possível completar a operação.', erro.codigo, resp.status);
  }
  if (resp.status === 204) return null as T;
  return (resposta === 'blob' ? resp.blob() : resp.json()) as Promise<T>;
}
