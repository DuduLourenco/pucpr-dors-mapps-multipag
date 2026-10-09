'use client';

// TELA 1 - Login do business (Figma: multipag-login) | Membro 1
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Aviso, Botao, EntradaSenha, Logo } from '../../_componentes/ui';
import { api, mensagemDe, sessao } from '../../_lib/api';
import { useCarregamento } from '../../_lib/hooks';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [aviso, setAviso] = useState<{ texto: string; tipo: 'neutro' | 'erro' } | null>(null);
  const [entrando, executar] = useCarregamento();

  useEffect(() => {
    if (sessao.token) router.replace('/painel');
  }, [router]);

  async function entrar() {
    try {
      const { token } = await api<{ token: string }>('/auth/login', { metodo: 'POST', corpo: { email, senha } });
      sessao.salvar(token);
      router.push('/painel');
    } catch (erro) {
      setAviso({ texto: mensagemDe(erro), tipo: 'erro' });
    }
  }

  return (
    <form className="tela com-rodape" noValidate onSubmit={(e) => { e.preventDefault(); void executar(entrar); }}>
      <div style={{ marginTop: 32 }}><Logo /></div>
      <div>
        <h1 className="titulo">Acesse sua carteira</h1>
        <p className="subtitulo">Gerencie suas vendas multicanais de forma unificada.</p>
      </div>
      <div className="campo">
        <label htmlFor="email">E-mail cadastrado</label>
        <input className="entrada" id="email" type="email" autoComplete="email" placeholder="seu-nome@empresa.com" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="campo">
        <label htmlFor="senha">Senha</label>
        <EntradaSenha id="senha" autoComplete="current-password" placeholder="Insira sua senha de acesso" required value={senha} onChange={(e) => setSenha(e.target.value)} />
        <div style={{ textAlign: 'right' }}>
          <button
            type="button"
            className="link-sublinhado"
            style={{ border: 0, background: 'none', padding: 0 }}
            onClick={() => setAviso({ texto: 'Recuperação de senha está fora do escopo deste trabalho.', tipo: 'neutro' })}
          >
            Esqueci minha senha
          </button>
        </div>
      </div>
      {aviso && <Aviso tipo={aviso.tipo}>{aviso.texto}</Aviso>}
      <Aviso>Conta de demonstração: <b>amanda@silvatech.com.br</b> / <b>multipag123</b></Aviso>
      <div className="rodape-fixo sem-borda">
        <Botao className="botao botao-primario" type="submit" carregando={entrando}>Entrar</Botao>
        <p className="rodape-texto">Não tem conta? <Link className="link-sublinhado" href="/cadastro">Criar conta</Link></p>
      </div>
    </form>
  );
}
