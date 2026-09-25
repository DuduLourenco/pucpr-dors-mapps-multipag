import { sessao } from './api.js';
import cadastro from './telas/cadastro.js';
import cobrancas from './telas/cobrancas.js';
import conta from './telas/conta.js';
import extrato from './telas/extrato.js';
import formCobranca from './telas/form-cobranca.js';
import login from './telas/login.js';
import pagamento from './telas/pagamento.js';
import painel from './telas/painel.js';
import saque from './telas/saque.js';
import { limparTela, toast } from './ui.js';

/**
 * Roteador por hash (#/rota). Cada tela é um módulo com
 * { privada, render(container, params) }.
 */
const ROTAS = [
  ['/entrar', login],                    // Tela 1 - Membro 1
  ['/cadastro', cadastro],               // Tela 2 - Membro 1
  ['/conta', conta],                     // Tela 2 (perfil) - Membro 1
  ['/cobrancas/nova', formCobranca],     // Tela 3 - Membro 2
  ['/cobrancas/:id/editar', formCobranca],
  ['/cobrancas', cobrancas],             // Tela 4 - Membro 2
  ['/pagar/:token', pagamento],          // Tela 5 - Membro 3
  ['/sacar', saque],                     // Tela 6 - Membro 3
  ['/painel', painel],                   // apoio
  ['/extrato', extrato],                 // apoio
].map(([padrao, tela]) => ({
  tela,
  regex: new RegExp(`^${padrao.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`),
}));

const container = document.getElementById('app');

async function navegar() {
  limparTela();

  const caminho = location.hash.replace(/^#/, '') || (sessao.token ? '/painel' : '/entrar');
  const rota = ROTAS.find((r) => r.regex.test(caminho));
  if (!rota) {
    location.hash = sessao.token ? '#/painel' : '#/entrar';
    return;
  }
  if (rota.tela.privada && !sessao.token) {
    location.hash = '#/entrar';
    return;
  }
  const params = caminho.match(rota.regex).groups ?? {};
  window.scrollTo(0, 0);
  try {
    await rota.tela.render(container, params);
  } catch (erro) {
    console.error(erro);
    toast(erro.message ?? 'Algo deu errado.', 'erro');
  }
}

window.addEventListener('hashchange', navegar);
navegar();
