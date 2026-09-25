// TELA 2 (continuação) - Minha conta | Membro 1
// CRUD: READ, UPDATE e DELETE de Business (GET/PUT/DELETE /api/business/me)
import { api, sessao } from '../api.js';
import { aviso, barraTopo, carregando, comCarregamento, esc, icone, toast } from '../ui.js';

export default {
  privada: true,
  async render(el) {
    el.innerHTML = carregando();
    const b = await api('/business/me');
    const empresa = b.tipoConta === 'empresa';

    el.innerHTML = `
      <div class="tela">
        ${barraTopo('Minha conta', '#/painel')}
        <div class="card compacto lista-valores">
          <div><span>Tipo de conta</span><b>${empresa ? 'Empresa' : 'Pessoa física'}</b></div>
          ${empresa ? `<div><span>CNPJ</span><span class="mono">${esc(b.cnpj)}</span></div>` : ''}
          <div><span>CPF do responsável</span><span class="mono">${esc(b.cpf)}</span></div>
          <div><span>Cliente desde</span><b>${new Date(b.criadoEm).toLocaleDateString('pt-BR')}</b></div>
        </div>

        <form class="pilha-16" id="perfil" novalidate>
          <h2 class="titulo-md">Dados da conta</h2>
          ${empresa ? `
            <div class="campo"><label for="nomeEmpresa">Razão social</label><input class="entrada" id="nomeEmpresa" value="${esc(b.nomeEmpresa)}" /></div>
            <div class="campo"><label for="nomeFantasia">Nome fantasia<span class="opcional">(Opcional)</span></label><input class="entrada" id="nomeFantasia" value="${esc(b.nomeFantasia ?? '')}" /></div>` : ''}
          <div class="campo"><label for="nomeResponsavel">Nome completo do responsável</label><input class="entrada" id="nomeResponsavel" value="${esc(b.nomeResponsavel)}" /></div>
          <div class="campo"><label for="email">E-mail</label><input class="entrada" id="email" type="email" value="${esc(b.email)}" /></div>
          <div id="erro-perfil"></div>
          <button class="botao botao-primario" type="submit">Salvar alterações</button>
        </form>

        <form class="pilha-16" id="senha" novalidate>
          <h2 class="titulo-md">Alterar senha</h2>
          <div class="campo"><label for="senhaAtual">Senha atual</label><input class="entrada" id="senhaAtual" type="password" autocomplete="current-password" /></div>
          <div class="campo"><label for="novaSenha">Nova senha</label><input class="entrada" id="novaSenha" type="password" autocomplete="new-password" placeholder="Mínimo de 8 caracteres" /></div>
          <div class="campo"><label for="confirmacaoSenha">Confirmar nova senha</label><input class="entrada" id="confirmacaoSenha" type="password" autocomplete="new-password" /></div>
          <div id="erro-senha"></div>
          <button class="botao botao-secundario" type="submit">Alterar senha</button>
        </form>

        <div class="pilha">
          <button class="botao botao-secundario" id="sair">${icone('sair')} Sair da conta</button>
          <button class="botao botao-perigo" id="excluir">${icone('lixeira')} Excluir conta</button>
          <div id="erro-excluir"></div>
        </div>
      </div>`;

    const valor = (id) => el.querySelector(`#${id}`)?.value;

    el.querySelector('#perfil').onsubmit = async (e) => {
      e.preventDefault();
      await comCarregamento(e.submitter, async () => {
        try {
          await api('/business/me', {
            metodo: 'PUT',
            corpo: { nomeEmpresa: valor('nomeEmpresa'), nomeFantasia: valor('nomeFantasia'), nomeResponsavel: valor('nomeResponsavel'), email: valor('email') },
          });
          el.querySelector('#erro-perfil').innerHTML = '';
          toast('Dados atualizados.');
        } catch (erro) {
          el.querySelector('#erro-perfil').innerHTML = aviso(esc(erro.message), 'erro');
        }
      });
    };

    el.querySelector('#senha').onsubmit = async (e) => {
      e.preventDefault();
      await comCarregamento(e.submitter, async () => {
        try {
          await api('/business/me', {
            metodo: 'PUT',
            corpo: { senhaAtual: valor('senhaAtual'), novaSenha: valor('novaSenha'), confirmacaoSenha: valor('confirmacaoSenha') },
          });
          e.target.reset();
          el.querySelector('#erro-senha').innerHTML = '';
          toast('Senha alterada.');
        } catch (erro) {
          el.querySelector('#erro-senha').innerHTML = aviso(esc(erro.message), 'erro');
        }
      });
    };

    el.querySelector('#sair').onclick = () => {
      sessao.limpar();
      location.hash = '#/entrar';
    };

    el.querySelector('#excluir').onclick = async (e) => {
      if (!confirm('Excluir sua conta apaga todas as cobranças e o histórico. Continuar?')) return;
      await comCarregamento(e.currentTarget, async () => {
        try {
          await api('/business/me', { metodo: 'DELETE' });
          sessao.limpar();
          location.hash = '#/entrar';
          toast('Conta excluída.');
        } catch (erro) {
          el.querySelector('#erro-excluir').innerHTML = aviso(esc(erro.message), 'erro');
        }
      });
    };
  },
};
