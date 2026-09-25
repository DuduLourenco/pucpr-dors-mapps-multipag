import { createHmac, timingSafeEqual } from 'node:crypto';
import { AppConfigSingleton } from '../config/AppConfigSingleton';
import type { Business } from '../domain/Business';
import { BusinessRepositorio } from '../repositorios/BusinessRepositorio';
import { ErroDeNegocio, ErroNaoAutorizado } from '../shared/erros';

/**
 * Login do business (RF02). O token é assinado com HMAC (mesma ideia de um
 * JWT), então não precisa de tabela de sessão no banco.
 */
export class AuthService {
  private readonly businesses = new BusinessRepositorio();
  private readonly config = AppConfigSingleton.instancia();

  async login(email: unknown, senha: unknown): Promise<{ token: string; expiraEm: Date; business: Business }> {
    const business = await this.businesses.buscarPorEmail(String(email ?? '').trim().toLowerCase());
    // Mesma mensagem para e-mail inexistente e senha errada (não revela quem tem conta).
    if (!business || !business.verificarSenha(String(senha ?? ''))) {
      throw new ErroDeNegocio('CREDENCIAIS_INVALIDAS', 'E-mail ou senha incorretos.', 401);
    }
    const expiraEm = new Date(Date.now() + this.config.horasValidadeSessao * 60 * 60 * 1000);
    const corpo = Buffer.from(JSON.stringify({ sub: business.id, exp: expiraEm.getTime() })).toString('base64url');
    return { token: `${corpo}.${this.assinar(corpo)}`, expiraEm, business };
  }

  /** Devolve o id do business dono do token ou lança 401. */
  verificar(token: string | undefined): string {
    const [corpo, assinatura] = (token ?? '').split('.');
    if (!corpo || !assinatura) throw new ErroNaoAutorizado();

    const esperada = Buffer.from(this.assinar(corpo));
    const recebida = Buffer.from(assinatura);
    if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) throw new ErroNaoAutorizado();

    const { sub, exp } = JSON.parse(Buffer.from(corpo, 'base64url').toString());
    if (typeof sub !== 'string' || Date.now() > exp) throw new ErroNaoAutorizado();
    return sub;
  }

  private assinar(corpo: string): string {
    return createHmac('sha256', this.config.segredoToken).update(corpo).digest('base64url');
  }
}
