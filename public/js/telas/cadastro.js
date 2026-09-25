// TELA 2 - Cadastro do business em 3 etapas (Figma: cadastro-etapa-1/2/3) | Membro 1
// CRUD: CREATE de Business (POST /api/business)
import { api, sessao } from '../api.js';
import {
  aviso, cnpjValido, comCarregamento, cpfValido, dataParaIso, esc, etapas, icone, logo,
  mascaraCnpj, mascaraCpf, mascaraData,
} from '../ui.js';

const ROTULOS = ['Tipo de conta', 'Identificação', 'Segurança'];
/** Em qual etapa está o campo de cada erro vindo da API. */
const ETAPA_DO_ERRO = {
  CNPJ_INVALIDO: 1, CNPJ_JA_CADASTRADO: 1, CPF_INVALIDO: 2, CPF_JA_CADASTRADO: 2,
  EMAIL_INVALIDO: 2, EMAIL_JA_CADASTRADO: 2, MENOR_DE_IDADE: 2, DATA_INVALIDA: 2,
};

export default {
  privada: false,
  async render(el) {
    const estado = {
      etapa: 1, tipoConta: 'pessoa_fisica', nomeEmpresa: '', cnpj: '', nomeFantasia: '',
      nomeResponsavel: '', cpf: '', dataNascimento: '', email: '', senha: '', confirmacao: '', erros: {}, erroGeral: '',
    };

    const campo = (id, rotulo, valor, { tipo = 'text', placeholder = '', mono = false, opcional = false, auto = '' } = {}) => `
      <div class="campo ${estado.erros[id] ? 'erro' : ''}">
        <label for="${id}">${rotulo}${opcional ? '<span class="opcional">(Opcional)</span>' : ''}</label>
        <input class="entrada ${mono ? 'mono' : ''}" id="${id}" type="${tipo}" value="${esc(valor)}" placeholder="${placeholder}" ${auto ? `autocomplete="${auto}"` : ''} />
        ${estado.erros[id] ? `<span class="msg">${esc(estado.erros[id])}</span>` : ''}
      </div>`;

    const etapa1 = () => `
      <div class="segmentado" role="tablist">
        <button type="button" data-tipo="pessoa_fisica" class="${estado.tipoConta === 'pessoa_fisica' ? 'ativo' : ''}">Pessoa física</button>
        <button type="button" data-tipo="empresa" class="${estado.tipoConta === 'empresa' ? 'ativo' : ''}">Empresa</button>
      </div>
      ${estado.tipoConta === 'pessoa_fisica'
        ? `<div class="card"><b>Cadastro simplificado</b>
            <ul class="check-lista">${['Nome completo', 'CPF', 'Data de nascimento', 'Criar senha'].map((t) => `<li>${icone('check', 18)}${t}</li>`).join('')}</ul></div>`
        : `${campo('nomeEmpresa', 'Razão Social / Nome da Empresa', estado.nomeEmpresa, { placeholder: 'Silva Tech Desenvolvimento de Software Ltda' })}
           ${campo('cnpj', 'CNPJ', estado.cnpj, { mono: true, placeholder: '00.000.000/0000-00' })}
           ${campo('nomeFantasia', 'Nome Fantasia', estado.nomeFantasia, { placeholder: 'Ex: Silva Tech', opcional: true })}`}`;

    const etapa2 = () => `
      ${campo('nomeResponsavel', 'Nome completo', estado.nomeResponsavel, { auto: 'name' })}
      ${campo('cpf', 'CPF do Responsável', estado.cpf, { mono: true, placeholder: '000.000.000-00' })}
      ${campo('dataNascimento', 'Data de nascimento', estado.dataNascimento, { mono: true, placeholder: 'DD/MM/AAAA' })}
      ${campo('email', 'E-mail', estado.email, { tipo: 'email', auto: 'email', placeholder: 'voce@empresa.com.br' })}`;

    const etapa3 = () => `
      <div class="campo ${estado.erros.senha ? 'erro' : ''}">
        <label for="senha">Senha</label>
        <div class="entrada-com-acao">
          <input class="entrada" id="senha" type="password" autocomplete="new-password" placeholder="Mínimo de 8 caracteres" value="${esc(estado.senha)}" />
          <button type="button" class="acao" data-ver="senha" aria-label="Mostrar senha">${icone('olho')}</button>
        </div>
        <div class="forca" id="forca"><span></span><span></span><span></span><span></span></div>
        <span class="msg" id="forca-texto"></span>
      </div>
      <div class="campo ${estado.erros.confirmacao ? 'erro' : ''}">
        <label for="confirmacao">Confirmar senha</label>
        <div class="entrada-com-acao">
          <input class="entrada" id="confirmacao" type="password" autocomplete="new-password" value="${esc(estado.confirmacao)}" />
          <button type="button" class="acao" data-ver="confirmacao" aria-label="Mostrar senha">${icone('olho')}</button>
        </div>
        ${estado.erros.confirmacao ? `<span class="msg">${esc(estado.erros.confirmacao)}</span>` : ''}
      </div>`;

    const TITULOS = [
      ['Selecione o tipo de conta', 'Escolha a opção que melhor se adequa ao perfil do seu negócio.'],
      ['Dados do responsável', 'Precisamos identificar a pessoa física responsável pela administração da conta.'],
      ['Crie sua senha', 'Escolha uma senha forte para garantir a segurança da sua conta digital.'],
    ];

    function desenhar() {
      const [titulo, sub] = TITULOS[estado.etapa - 1];
      el.innerHTML = `
        <form class="tela com-rodape" id="form" novalidate>
          ${logo()}
          ${etapas(estado.etapa, 3, ROTULOS[estado.etapa - 1])}
          <div><h1 class="titulo">${titulo}</h1><p class="subtitulo">${sub}</p></div>
          ${[etapa1, etapa2, etapa3][estado.etapa - 1]()}
          ${estado.erroGeral ? aviso(esc(estado.erroGeral), 'erro') : ''}
          <div class="rodape-fixo sem-borda">
            ${estado.etapa === 1
              ? '<button class="botao botao-primario" type="submit">Continuar</button>'
              : `<div class="botoes"><button class="botao botao-secundario" type="button" id="voltar">Voltar</button>
                 <button class="botao botao-primario" type="submit">${estado.etapa === 3 ? 'Criar conta' : 'Continuar'}</button></div>`}
            <p class="rodape-texto">Já tem conta? <a class="link-sublinhado" href="#/entrar">Entrar</a></p>
          </div>
        </form>`;
      ligarEventos();
    }

    function ligarEventos() {
      const $ = (s) => el.querySelector(s);
      el.querySelectorAll('[data-tipo]').forEach((b) => (b.onclick = () => { estado.tipoConta = b.dataset.tipo; estado.erros = {}; desenhar(); }));
      el.querySelectorAll('input.entrada').forEach((input) => {
        input.oninput = () => {
          const mascaras = { cpf: mascaraCpf, cnpj: mascaraCnpj, dataNascimento: mascaraData };
          if (mascaras[input.id]) input.value = mascaras[input.id](input.value);
          estado[input.id] = input.value;
          if (input.id === 'senha') atualizarForca();
        };
      });
      el.querySelectorAll('[data-ver]').forEach((b) => (b.onclick = () => {
        const i = $(`#${b.dataset.ver}`);
        i.type = i.type === 'password' ? 'text' : 'password';
      }));
      $('#voltar')?.addEventListener('click', () => { estado.etapa--; estado.erros = {}; estado.erroGeral = ''; desenhar(); });
      $('#form').onsubmit = (e) => { e.preventDefault(); avancar(e.submitter); };
      if (estado.etapa === 3) atualizarForca();
    }

    function atualizarForca() {
      const s = estado.senha;
      const nivel = s.length < 8 ? (s ? 1 : 0) : [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(s)).length;
      el.querySelector('#forca').dataset.nivel = String(Math.min(nivel, 4));
      el.querySelector('#forca-texto').textContent = ['', 'Senha fraca', 'Senha razoável', 'Senha forte', 'Senha muito forte'][Math.min(nivel, 4)];
    }

    function validarEtapa() {
      const e = {};
      if (estado.etapa === 1 && estado.tipoConta === 'empresa') {
        if (estado.nomeEmpresa.trim().length < 3) e.nomeEmpresa = 'Informe a razão social';
        if (!cnpjValido(estado.cnpj)) e.cnpj = 'CNPJ inválido';
      }
      if (estado.etapa === 2) {
        if (estado.nomeResponsavel.trim().length < 3) e.nomeResponsavel = 'Informe o nome completo';
        if (!cpfValido(estado.cpf)) e.cpf = 'CPF inválido';
        if (!dataParaIso(estado.dataNascimento)) e.dataNascimento = 'Data inválida';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(estado.email)) e.email = 'E-mail inválido';
      }
      if (estado.etapa === 3) {
        if (estado.senha.length < 8) e.senha = 'Mínimo de 8 caracteres';
        if (estado.senha !== estado.confirmacao) e.confirmacao = 'As senhas não coincidem';
      }
      estado.erros = e;
      return Object.keys(e).length === 0;
    }

    async function avancar(botao) {
      estado.erroGeral = '';
      if (!validarEtapa()) return desenhar();
      if (estado.etapa < 3) {
        estado.etapa++;
        return desenhar();
      }
      await comCarregamento(botao, async () => {
        try {
          await api('/business', {
            metodo: 'POST',
            corpo: {
              tipoConta: estado.tipoConta,
              nomeEmpresa: estado.nomeEmpresa,
              cnpj: estado.cnpj,
              nomeFantasia: estado.nomeFantasia,
              nomeResponsavel: estado.nomeResponsavel,
              cpf: estado.cpf,
              dataNascimento: dataParaIso(estado.dataNascimento),
              email: estado.email,
              senha: estado.senha,
              confirmacaoSenha: estado.confirmacao,
            },
          });
          const { token } = await api('/auth/login', { metodo: 'POST', corpo: { email: estado.email, senha: estado.senha } });
          sessao.salvar(token);
          location.hash = '#/painel';
        } catch (erro) {
          estado.erroGeral = erro.message;
          estado.etapa = ETAPA_DO_ERRO[erro.codigo] ?? 3;
          desenhar();
        }
      });
    }

    desenhar();
  },
};
