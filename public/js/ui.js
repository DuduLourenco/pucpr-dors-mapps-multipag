/** Componentes e utilitários visuais compartilhados por todas as telas. */

// ------------------------------------------------------------------ ícones
const ICONES = {
  camadas: '<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
  voltar: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
  olho: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  recibo: '<path d="M5 2v20l2.3-1.5L9.7 22l2.3-1.5 2.3 1.5 2.4-1.5L19 22V2l-2.3 1.5L14.3 2 12 3.5 9.7 2 7.3 3.5Z"/><path d="M14.5 8.5h-3a1.5 1.5 0 0 0 0 3h1a1.5 1.5 0 0 1 0 3h-3"/><path d="M12 7v1.5M12 14.5V16"/>',
  lista: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  dinheiro: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
  maisCirculo: '<circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/>',
  mais: '<path d="M5 12h14M12 5v14"/>',
  menos: '<path d="M5 12h14"/>',
  raio: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  qr: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
  cartao: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  codigoBarras: '<path d="M3 5v14M7 5v14M10 5v14M14 5v14M17 5v14M21 5v14"/>',
  carteira: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  bitcoin: '<path d="M11.8 19.1c4.9.9 6.1-6 1.2-6.9m-1.2 6.9-5.9-1m5.9 1-.35 2m1.56-8.9c4.9.9 6.1-6 1.2-6.9m-1.2 6.9-3.94-.7m5.14-6.2L8.3 4.3m5.9 1 .35-2M7.5 20.4l3.1-17.7"/>',
  entrada: '<path d="M17 7 7 17M17 17H7V7"/>',
  saida: '<path d="M7 7h10v10M7 17 17 7"/>',
  filtros: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  seta: '<path d="m6 9 6 6 6-6"/>',
  lixeira: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkCirculo: '<circle cx="12" cy="12" r="10"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  copiar: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  relogio: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  atualizar: '<path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M3 21v-5h5"/>',
  lapis: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  repetir: '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  cadeado: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  carregando: '<path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>',
  xCirculo: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/>',
  escudo: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  mensagem: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  baixar: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  sair: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  compartilhar: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98"/>',
  calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
};

export function icone(nome, tamanho = 20, classe = '') {
  return `<svg class="icone ${classe}" width="${tamanho}" height="${tamanho}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nome] ?? ''}</svg>`;
}

// ------------------------------------------------------------- formatação
const formatoMoeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** "R$ 4.280,50" (com espaço normal, para caber no estilo monoespaçado). */
export const moeda = (valor) => formatoMoeda.format(valor ?? 0).replace(/\s/g, ' ');

export const dataCurta = (iso) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '').replace(' de ', ' ');
export const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
export const dataHora = (iso) => `${new Date(iso).toLocaleDateString('pt-BR')} ${hora(iso)}`;

/** Escapa texto vindo da API antes de colocar no HTML. */
export function esc(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export const NOMES_METODO = { pix: 'Pix', cartao: 'Cartão', boleto: 'Boleto', cripto: 'Cripto' };
export const ICONE_METODO = { pix: 'qr', cartao: 'cartao', boleto: 'codigoBarras', cripto: 'bitcoin' };

export function chipStatus(status) {
  const rotulos = {
    pendente: 'Pendente', paga: 'Paga', cancelada: 'Cancelada', expirada: 'Expirada',
    solicitado: 'Solicitado', processando: 'Processando', concluido: 'Concluído', falhou: 'Falhou',
  };
  return `<span class="chip chip-${status}">${rotulos[status] ?? status}</span>`;
}

// ------------------------------------------------------------- máscaras
export const soDigitos = (v) => String(v ?? '').replace(/\D/g, '');

export function mascaraCpf(v) {
  return soDigitos(v).slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function mascaraCnpj(v) {
  const c = String(v ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 14);
  return c.replace(/^(.{2})(.)/, '$1.$2').replace(/^(.{2}\..{3})(.)/, '$1.$2').replace(/^(.{2}\..{3}\..{3})(.)/, '$1/$2').replace(/^(.{2}\..{3}\..{3}\/.{4})(.)/, '$1-$2');
}

export function mascaraData(v) {
  return soDigitos(v).slice(0, 8).replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})(\d)/, '$1/$2');
}

/** "14/10/1991" -> "1991-10-14" */
export const dataParaIso = (v) => {
  const [d, m, a] = String(v).split('/');
  return a?.length === 4 ? `${a}-${m}-${d}` : '';
};

/** Mesma regra do back (domain/Cpf.ts), para dar feedback antes de enviar. */
export function cpfValido(v) {
  const d = soDigitos(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (n) => {
    let s = 0;
    for (let i = 0; i < n; i++) s += Number(d[i]) * (n + 1 - i);
    const r = (s * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

/** Aceita CNPJ numérico e alfanumérico (mesma regra de domain/Cnpj.ts). */
export function cnpjValido(v) {
  const c = String(v ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (!/^[0-9A-Z]{12}\d{2}$/.test(c) || /^(\d)\1{13}$/.test(c)) return false;
  const dv = (base) => {
    const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const r = [...base].reduce((s, ch, i) => s + (ch.charCodeAt(0) - 48) * pesos[i], 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = dv(c.slice(0, 12));
  return c.endsWith(`${d1}${dv(c.slice(0, 12) + d1)}`);
}

// ------------------------------------------------------------- blocos de tela
export function logo() {
  return `<div class="logo"><span class="logo-marca">${icone('camadas', 20)}</span><span><b>Multi</b>Pag</span></div>`;
}

export function barraTopo(titulo, voltarPara, acaoDireita = '') {
  return `
    <header class="barra-topo">
      <a class="botao-icone" href="${voltarPara}" aria-label="Voltar">${icone('voltar')}</a>
      <h1>${esc(titulo)}</h1>
      ${acaoDireita || '<span class="botao-icone vazio"></span>'}
    </header>`;
}

export function etapas(atual, total, rotulo) {
  const barras = Array.from({ length: total }, (_, i) => `<span class="${i < atual ? 'feita' : ''}"></span>`).join('');
  return `
    <div class="etapas" style="--total:${total}">${barras}</div>
    <div class="etapas-rotulo"><span>Etapa ${atual} de ${total}</span><span>${esc(rotulo)}</span></div>`;
}

export function aviso(texto, tipo = 'neutro', nomeIcone = 'info') {
  return `<div class="aviso aviso-${tipo}">${icone(nomeIcone, 18)}<p>${texto}</p></div>`;
}

export function carregando() {
  return `<div class="tela centro">${icone('carregando', 28, 'girando')}</div>`;
}

// ------------------------------------------------------------- toast e ciclo de vida
let timerToast;
export function toast(mensagem, tipo = 'ok') {
  const el = document.getElementById('toast');
  el.textContent = mensagem;
  el.className = `toast-${tipo}`;
  el.hidden = false;
  clearTimeout(timerToast);
  timerToast = setTimeout(() => (el.hidden = true), 3500);
}

export async function copiar(texto, rotulo = 'Copiado!') {
  try {
    await navigator.clipboard.writeText(texto);
    toast(rotulo);
  } catch {
    prompt('Copie o texto abaixo:', texto);
  }
}

let limpezas = [];
/** Telas registram aqui timers/polling que precisam parar ao trocar de tela. */
export function aoSair(fn) {
  limpezas.push(fn);
}
export function limparTela() {
  limpezas.forEach((fn) => fn());
  limpezas = [];
}

/** Desabilita o botão e mostra "carregando" enquanto a promessa roda. */
export async function comCarregamento(botao, fn) {
  botao ??= document.querySelector('#app [type=submit]');
  if (!botao) return fn();
  const original = botao.innerHTML;
  botao.disabled = true;
  botao.innerHTML = icone('carregando', 20, 'girando');
  try {
    return await fn();
  } finally {
    botao.disabled = false;
    botao.innerHTML = original;
  }
}
