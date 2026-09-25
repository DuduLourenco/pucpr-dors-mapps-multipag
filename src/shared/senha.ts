import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/** RNF01 - senhas nunca são guardadas em texto puro. */
export function gerarHashSenha(senha: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(senha, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function conferirSenha(senha: string, armazenado: string): boolean {
  const [salt, hash] = armazenado.split(':');
  if (!salt || !hash) return false;
  const calculado = scryptSync(senha, salt, 64);
  return timingSafeEqual(calculado, Buffer.from(hash, 'hex'));
}
