'use client';

// TELA 2 (continuação) - Minha conta | Membro 1
// CRUD: READ, UPDATE e DELETE de Business (GET/PUT/DELETE /api/business/me)
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icone } from '../../_componentes/Icone';
import { toast } from '../../_componentes/Toast';
import { Aviso, BarraTopo, Botao, Carregando } from '../../_componentes/ui';
import { api, mensagemDe, sessao } from '../../_lib/api';
import { useCarregamento, useDados } from '../../_lib/hooks';
import type { BusinessJson } from '../../_lib/tipos';

const SENHAS_VAZIAS = { senhaAtual: '', novaSenha: '', confirmacaoSenha: '' };

export default function Conta() {
  const { dados: business } = useDados(() => api<BusinessJson>('/business/me'));
  return business ? <MinhaConta business={business} /> : <Carregando />;
}

function MinhaConta({ business }: { business: BusinessJson }) {
  const router = useRouter();
  const empresa = business.tipoConta === 'empresa';
  const [perfil, setPerfil] = useState({
    nomeEmpresa: business.nomeEmpresa,
    nomeFantasia: business.nomeFantasia ?? '',
    nomeResponsavel: business.nomeResponsavel,
    email: business.email,
  });
  const [senhas, setSenhas] = useState(SENHAS_VAZIAS);
  const [erros, setErros] = useState({ perfil: '', senha: '', excluir: '' });
  const [salvandoPerfil, executarPerfil] = useCarregamento();
  const [salvandoSenha, executarSenha] = useCarregamento();
  const [excluindo, executarExclusao] = useCarregamento();

  const campoPerfil = (id: keyof typeof perfil, rotulo: string, extras: { tipo?: string; opcional?: boolean } = {}) => (
    <div className="campo">
      <label htmlFor={id}>{rotulo}{extras.opcional && <span className="opcional">(Opcional)</span>}</label>
      <input className="entrada" id={id} type={extras.tipo} value={perfil[id]} onChange={(e) => setPerfil({ ...perfil, [id]: e.target.value })} />
    </div>
  );
  const campoSenha = (id: keyof typeof senhas, rotulo: string, auto: string, placeholder?: string) => (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <input className="entrada" id={id} type="password" autoComplete={auto} placeholder={placeholder} value={senhas[id]} onChange={(e) => setSenhas({ ...senhas, [id]: e.target.value })} />
    </div>
  );

  async function salvarPerfil() {
    try {
      // Conta de pessoa física não tem razão social nem nome fantasia para editar.
      const corpo = empresa ? perfil : { nomeResponsavel: perfil.nomeResponsavel, email: perfil.email };
      await api('/business/me', { metodo: 'PUT', corpo });
      setErros({ ...erros, perfil: '' });
      toast('Dados atualizados.');
    } catch (erro) {
      setErros({ ...erros, perfil: mensagemDe(erro) });
    }
  }

  async function alterarSenha() {
    try {
      await api('/business/me', { metodo: 'PUT', corpo: senhas });
      setSenhas(SENHAS_VAZIAS);
      setErros({ ...erros, senha: '' });
      toast('Senha alterada.');
    } catch (erro) {
      setErros({ ...erros, senha: mensagemDe(erro) });
    }
  }

  function sair() {
    sessao.limpar();
    router.push('/entrar');
  }

  async function excluir() {
    if (!confirm('Excluir sua conta apaga todas as cobranças e o histórico. Continuar?')) return;
    await executarExclusao(async () => {
      try {
        await api('/business/me', { metodo: 'DELETE' });
        sair();
        toast('Conta excluída.');
      } catch (erro) {
        setErros({ ...erros, excluir: mensagemDe(erro) });
      }
    });
  }

  return (
    <div className="tela">
      <BarraTopo titulo="Minha conta" voltarPara="/painel" />
      <div className="card compacto lista-valores">
        <div><span>Tipo de conta</span><b>{empresa ? 'Empresa' : 'Pessoa física'}</b></div>
        {empresa && <div><span>CNPJ</span><span className="mono">{business.cnpj}</span></div>}
        <div><span>CPF do responsável</span><span className="mono">{business.cpf}</span></div>
        <div><span>Cliente desde</span><b>{new Date(business.criadoEm).toLocaleDateString('pt-BR')}</b></div>
      </div>

      <form className="pilha-16" noValidate onSubmit={(e) => { e.preventDefault(); void executarPerfil(salvarPerfil); }}>
        <h2 className="titulo-md">Dados da conta</h2>
        {empresa && campoPerfil('nomeEmpresa', 'Razão social')}
        {empresa && campoPerfil('nomeFantasia', 'Nome fantasia', { opcional: true })}
        {campoPerfil('nomeResponsavel', 'Nome completo do responsável')}
        {campoPerfil('email', 'E-mail', { tipo: 'email' })}
        {erros.perfil && <Aviso tipo="erro">{erros.perfil}</Aviso>}
        <Botao className="botao botao-primario" type="submit" carregando={salvandoPerfil}>Salvar alterações</Botao>
      </form>

      <form className="pilha-16" noValidate onSubmit={(e) => { e.preventDefault(); void executarSenha(alterarSenha); }}>
        <h2 className="titulo-md">Alterar senha</h2>
        {campoSenha('senhaAtual', 'Senha atual', 'current-password')}
        {campoSenha('novaSenha', 'Nova senha', 'new-password', 'Mínimo de 8 caracteres')}
        {campoSenha('confirmacaoSenha', 'Confirmar nova senha', 'new-password')}
        {erros.senha && <Aviso tipo="erro">{erros.senha}</Aviso>}
        <Botao className="botao botao-secundario" type="submit" carregando={salvandoSenha}>Alterar senha</Botao>
      </form>

      <div className="pilha">
        <button className="botao botao-secundario" onClick={sair}><Icone nome="sair" /> Sair da conta</button>
        <Botao className="botao botao-perigo" carregando={excluindo} onClick={excluir}><Icone nome="lixeira" /> Excluir conta</Botao>
        {erros.excluir && <Aviso tipo="erro">{erros.excluir}</Aviso>}
      </div>
    </div>
  );
}
