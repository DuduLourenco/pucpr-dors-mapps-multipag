'use client';

// TELA 2 - Cadastro do business em 3 etapas (Figma: cadastro-etapa-1/2/3) | Membro 1
// CRUD: CREATE de Business (POST /api/business)
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icone } from '../../_componentes/Icone';
import { Aviso, Botao, EntradaSenha, Etapas, Logo } from '../../_componentes/ui';
import { api, codigoDe, mensagemDe, sessao } from '../../_lib/api';
import { cnpjValido, cpfValido, dataParaIso, emailValido, mascaraCnpj, mascaraCpf, mascaraData } from '../../_lib/formato';
import { useCarregamento } from '../../_lib/hooks';
import type { TipoConta } from '../../_lib/tipos';

const ROTULOS = ['Tipo de conta', 'Identificação', 'Segurança'];
const TITULOS = [
  ['Selecione o tipo de conta', 'Escolha a opção que melhor se adequa ao perfil do seu negócio.'],
  ['Dados do responsável', 'Precisamos identificar a pessoa física responsável pela administração da conta.'],
  ['Crie sua senha', 'Escolha uma senha forte para garantir a segurança da sua conta digital.'],
];
/** Em qual etapa está o campo de cada erro vindo da API. */
const ETAPA_DO_ERRO: Record<string, number> = {
  CNPJ_INVALIDO: 1, CNPJ_JA_CADASTRADO: 1, CPF_INVALIDO: 2, CPF_JA_CADASTRADO: 2,
  EMAIL_INVALIDO: 2, EMAIL_JA_CADASTRADO: 2, MENOR_DE_IDADE: 2, DATA_INVALIDA: 2,
};
const FORCA_SENHA = ['', 'Senha fraca', 'Senha razoável', 'Senha forte', 'Senha muito forte'];

const DADOS_INICIAIS = {
  tipoConta: 'pessoa_fisica' as TipoConta,
  nomeEmpresa: '', cnpj: '', nomeFantasia: '', nomeResponsavel: '', cpf: '', dataNascimento: '', email: '', senha: '', confirmacao: '',
};
type Dados = typeof DADOS_INICIAIS;
type CampoTexto = Exclude<keyof Dados, 'tipoConta'>;
type Erros = Partial<Record<CampoTexto, string>>;

const MASCARAS: Partial<Record<CampoTexto, (v: string) => string>> = { cpf: mascaraCpf, cnpj: mascaraCnpj, dataNascimento: mascaraData };

interface OpcoesCampo {
  tipo?: string;
  placeholder?: string;
  mono?: boolean;
  opcional?: boolean;
  auto?: string;
}

function Campo({ id, rotulo, valor, erro, aoMudar, tipo = 'text', placeholder, mono, opcional, auto }: OpcoesCampo & {
  id: string; rotulo: string; valor: string; erro?: string; aoMudar: (valor: string) => void;
}) {
  return (
    <div className={`campo ${erro ? 'erro' : ''}`}>
      <label htmlFor={id}>{rotulo}{opcional && <span className="opcional">(Opcional)</span>}</label>
      <input className={`entrada ${mono ? 'mono' : ''}`} id={id} type={tipo} value={valor} placeholder={placeholder} autoComplete={auto} onChange={(e) => aoMudar(e.target.value)} />
      {erro && <span className="msg">{erro}</span>}
    </div>
  );
}

function forcaDaSenha(senha: string) {
  if (senha.length < 8) return senha ? 1 : 0;
  return [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((regra) => regra.test(senha)).length;
}

export default function Cadastro() {
  const router = useRouter();
  const [etapa, setEtapa] = useState(1);
  const [dados, setDados] = useState(DADOS_INICIAIS);
  const [erros, setErros] = useState<Erros>({});
  const [erroGeral, setErroGeral] = useState('');
  const [enviando, executar] = useCarregamento();

  const alterar = (campo: CampoTexto, valor: string) => setDados({ ...dados, [campo]: MASCARAS[campo]?.(valor) ?? valor });
  const campo = (id: CampoTexto, rotulo: string, opcoes: OpcoesCampo = {}) => (
    <Campo id={id} rotulo={rotulo} valor={dados[id]} erro={erros[id]} aoMudar={(valor) => alterar(id, valor)} {...opcoes} />
  );

  function validarEtapa() {
    const e: Erros = {};
    if (etapa === 1 && dados.tipoConta === 'empresa') {
      if (dados.nomeEmpresa.trim().length < 3) e.nomeEmpresa = 'Informe a razão social';
      if (!cnpjValido(dados.cnpj)) e.cnpj = 'CNPJ inválido';
    }
    if (etapa === 2) {
      if (dados.nomeResponsavel.trim().length < 3) e.nomeResponsavel = 'Informe o nome completo';
      if (!cpfValido(dados.cpf)) e.cpf = 'CPF inválido';
      if (!dataParaIso(dados.dataNascimento)) e.dataNascimento = 'Data inválida';
      if (!emailValido(dados.email)) e.email = 'E-mail inválido';
    }
    if (etapa === 3) {
      if (dados.senha.length < 8) e.senha = 'Mínimo de 8 caracteres';
      if (dados.senha !== dados.confirmacao) e.confirmacao = 'As senhas não coincidem';
    }
    return e;
  }

  async function avancar() {
    setErroGeral('');
    const encontrados = validarEtapa();
    setErros(encontrados);
    if (Object.keys(encontrados).length) return;
    if (etapa < 3) return setEtapa(etapa + 1);

    await executar(async () => {
      try {
        await api('/business', {
          metodo: 'POST',
          corpo: {
            tipoConta: dados.tipoConta,
            nomeEmpresa: dados.nomeEmpresa,
            cnpj: dados.cnpj,
            nomeFantasia: dados.nomeFantasia,
            nomeResponsavel: dados.nomeResponsavel,
            cpf: dados.cpf,
            dataNascimento: dataParaIso(dados.dataNascimento),
            email: dados.email,
            senha: dados.senha,
            confirmacaoSenha: dados.confirmacao,
          },
        });
        const { token } = await api<{ token: string }>('/auth/login', { metodo: 'POST', corpo: { email: dados.email, senha: dados.senha } });
        sessao.salvar(token);
        router.push('/painel');
      } catch (erro) {
        setErroGeral(mensagemDe(erro));
        setEtapa(ETAPA_DO_ERRO[codigoDe(erro)] ?? 3);
      }
    });
  }

  function voltar() {
    setEtapa(etapa - 1);
    setErros({});
    setErroGeral('');
  }

  const etapa1 = () => (
    <>
      <div className="segmentado" role="tablist">
        {(['pessoa_fisica', 'empresa'] as const).map((tipo) => (
          <button key={tipo} type="button" className={dados.tipoConta === tipo ? 'ativo' : ''} onClick={() => { setDados({ ...dados, tipoConta: tipo }); setErros({}); }}>
            {tipo === 'empresa' ? 'Empresa' : 'Pessoa física'}
          </button>
        ))}
      </div>
      {dados.tipoConta === 'pessoa_fisica' ? (
        <div className="card">
          <b>Cadastro simplificado</b>
          <ul className="check-lista">
            {['Nome completo', 'CPF', 'Data de nascimento', 'Criar senha'].map((texto) => <li key={texto}><Icone nome="check" tamanho={18} />{texto}</li>)}
          </ul>
        </div>
      ) : (
        <>
          {campo('nomeEmpresa', 'Razão Social / Nome da Empresa', { placeholder: 'Silva Tech Desenvolvimento de Software Ltda' })}
          {campo('cnpj', 'CNPJ', { mono: true, placeholder: '00.000.000/0000-00' })}
          {campo('nomeFantasia', 'Nome Fantasia', { placeholder: 'Ex: Silva Tech', opcional: true })}
        </>
      )}
    </>
  );

  const etapa2 = () => (
    <>
      {campo('nomeResponsavel', 'Nome completo', { auto: 'name' })}
      {campo('cpf', 'CPF do Responsável', { mono: true, placeholder: '000.000.000-00' })}
      {campo('dataNascimento', 'Data de nascimento', { mono: true, placeholder: 'DD/MM/AAAA' })}
      {campo('email', 'E-mail', { tipo: 'email', auto: 'email', placeholder: 'voce@empresa.com.br' })}
    </>
  );

  const etapa3 = () => {
    const forca = Math.min(forcaDaSenha(dados.senha), 4);
    return (
      <>
        <div className={`campo ${erros.senha ? 'erro' : ''}`}>
          <label htmlFor="senha">Senha</label>
          <EntradaSenha id="senha" autoComplete="new-password" placeholder="Mínimo de 8 caracteres" value={dados.senha} onChange={(e) => alterar('senha', e.target.value)} />
          <div className="forca" data-nivel={forca}><span /><span /><span /><span /></div>
          <span className="msg">{FORCA_SENHA[forca]}</span>
        </div>
        <div className={`campo ${erros.confirmacao ? 'erro' : ''}`}>
          <label htmlFor="confirmacao">Confirmar senha</label>
          <EntradaSenha id="confirmacao" autoComplete="new-password" value={dados.confirmacao} onChange={(e) => alterar('confirmacao', e.target.value)} />
          {erros.confirmacao && <span className="msg">{erros.confirmacao}</span>}
        </div>
      </>
    );
  };

  const [titulo, subtitulo] = TITULOS[etapa - 1];

  return (
    <form className="tela com-rodape" noValidate onSubmit={(e) => { e.preventDefault(); void avancar(); }}>
      <Logo />
      <Etapas atual={etapa} total={3} rotulo={ROTULOS[etapa - 1]} />
      <div><h1 className="titulo">{titulo}</h1><p className="subtitulo">{subtitulo}</p></div>
      {[etapa1, etapa2, etapa3][etapa - 1]()}
      {erroGeral && <Aviso tipo="erro">{erroGeral}</Aviso>}
      <div className="rodape-fixo sem-borda">
        {etapa === 1 ? (
          <button className="botao botao-primario" type="submit">Continuar</button>
        ) : (
          <div className="botoes">
            <button className="botao botao-secundario" type="button" onClick={voltar}>Voltar</button>
            <Botao className="botao botao-primario" type="submit" carregando={enviando}>{etapa === 3 ? 'Criar conta' : 'Continuar'}</Botao>
          </div>
        )}
        <p className="rodape-texto">Já tem conta? <Link className="link-sublinhado" href="/entrar">Entrar</Link></p>
      </div>
    </form>
  );
}
