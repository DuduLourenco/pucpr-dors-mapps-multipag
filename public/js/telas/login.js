// TELA 1 - Login do business (Figma: multipag-login) | Membro 1
import { api, sessao } from '../api.js';
import { aviso, comCarregamento, esc, icone, logo } from '../ui.js';

export default {
  privada: false,
  async render(el) {
    if (sessao.token) {
      location.hash = '#/painel';
      return;
    }
    el.innerHTML = `
      <form class="tela com-rodape" id="form-login" novalidate>
        <div style="margin-top:32px">${logo()}</div>
        <div>
          <h1 class="titulo">Acesse sua carteira</h1>
          <p class="subtitulo">Gerencie suas vendas multicanais de forma unificada.</p>
        </div>
        <div class="campo">
          <label for="email">E-mail cadastrado</label>
          <input class="entrada" id="email" type="email" autocomplete="email" placeholder="seu-nome@empresa.com" required />
        </div>
        <div class="campo">
          <label for="senha">Senha</label>
          <div class="entrada-com-acao">
            <input class="entrada" id="senha" type="password" autocomplete="current-password" placeholder="Insira sua senha de acesso" required />
            <button type="button" class="acao" id="ver-senha" aria-label="Mostrar senha">${icone('olho')}</button>
          </div>
          <div style="text-align:right"><button type="button" class="link-sublinhado" id="esqueci" style="border:0;background:none;padding:0">Esqueci minha senha</button></div>
        </div>
        <div id="erro"></div>
        ${aviso('Conta de demonstração: <b>amanda@silvatech.com.br</b> / <b>multipag123</b>')}
        <div class="rodape-fixo sem-borda">
          <button class="botao botao-primario" type="submit">Entrar</button>
          <p class="rodape-texto">Não tem conta? <a class="link-sublinhado" href="#/cadastro">Criar conta</a></p>
        </div>
      </form>`;

    const senha = el.querySelector('#senha');
    el.querySelector('#ver-senha').onclick = () => (senha.type = senha.type === 'password' ? 'text' : 'password');
    el.querySelector('#esqueci').onclick = () => {
      el.querySelector('#erro').innerHTML = aviso('Recuperação de senha está fora do escopo deste trabalho.');
    };

    el.querySelector('#form-login').onsubmit = async (e) => {
      e.preventDefault();
      const botao = e.submitter ?? el.querySelector('[type=submit]');
      await comCarregamento(botao, async () => {
        try {
          const { token } = await api('/auth/login', {
            metodo: 'POST',
            corpo: { email: el.querySelector('#email').value, senha: senha.value },
          });
          sessao.salvar(token);
          location.hash = '#/painel';
        } catch (erro) {
          el.querySelector('#erro').innerHTML = aviso(esc(erro.message), 'erro', 'info');
        }
      });
    };
  },
};
