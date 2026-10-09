'use client';

// TELA 6 - Saque via Pix (Figma: saque) | Membro 3
// CRUD: CREATE (POST /api/saques) e READ (GET /api/saques). Saque não tem UPDATE/DELETE (auditoria).
import { Fragment, useEffect, useRef, useState } from 'react';
import { Icone } from '../../_componentes/Icone';
import { toast } from '../../_componentes/Toast';
import { Aviso, BarraTopo, Botao, Carregando, ChipStatus } from '../../_componentes/ui';
import { api, mensagemDe } from '../../_lib/api';
import { cpfValido, dataCurta, emailValido, moeda, soDigitos } from '../../_lib/formato';
import { useCarregamento, useDados } from '../../_lib/hooks';
import type { BusinessJson, SaqueJson } from '../../_lib/tipos';

const ATALHOS = [100, 500, 1000];
/** Tempo para o Pix de saída (simulado) ser concluído no servidor. */
const ESPERA_CONCLUSAO_MS = 7000;

/** Descobre o tipo da chave Pix pelo formato. */
function tipoChave(chave: string) {
  const c = chave.trim();
  if (emailValido(c)) return 'E-mail';
  if (cpfValido(c)) return 'CPF';
  if (/^\+?55?\s?\(?\d{2}\)?\s?9?\d{4}-?\d{4}$/.test(c)) return 'Telefone';
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(c)) return 'Aleatória';
  return '';
}

export default function Sacar() {
  const { dados, recarregar } = useDados(() => Promise.all([api<BusinessJson>('/business/me'), api<SaqueJson[]>('/saques')]));
  const [saquesFeitos, setSaquesFeitos] = useState(0);
  const recarregarDepois = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(recarregarDepois.current), []);

  if (!dados) return <Carregando />;
  const [business, saques] = dados;

  async function aoSacar() {
    await recarregar();
    // Trocar a key recomeça o formulário já com o saldo novo.
    setSaquesFeitos((n) => n + 1);
    clearTimeout(recarregarDepois.current);
    recarregarDepois.current = setTimeout(recarregar, ESPERA_CONCLUSAO_MS);
  }

  return <FormSaque key={saquesFeitos} business={business} saques={saques} aoSacar={aoSacar} />;
}

function FormSaque({ business, saques, aoSacar }: { business: BusinessJson; saques: SaqueJson[]; aoSacar: () => Promise<void> }) {
  const saldo = business.saldoDisponivel;
  const [centavos, setCentavos] = useState(0);
  const [chave, setChave] = useState(business.email);
  const [erro, setErro] = useState('');
  const [sacando, executar] = useCarregamento();
  const valor = centavos / 100;
  const tipo = tipoChave(chave);

  async function confirmar() {
    if (valor <= 0) return setErro('Informe quanto você quer sacar.');
    if (valor > saldo) return setErro('Valor maior que o saldo disponível.');
    if (!tipo) return setErro('Informe uma chave Pix válida.');
    await executar(async () => {
      try {
        await api('/saques', { metodo: 'POST', corpo: { valor, chavePix: chave.trim() } });
        toast('Saque solicitado! O valor cai em instantes.');
        await aoSacar();
      } catch (falha) {
        setErro(mensagemDe(falha));
      }
    });
  }

  const atalho = (quantia: number, rotulo: string) => (
    <button
      key={rotulo}
      type="button"
      className={`pilula contorno ${Math.round(quantia * 100) === centavos ? 'ativa' : ''}`}
      disabled={quantia > saldo}
      onClick={() => setCentavos(Math.round(quantia * 100))}
    >
      {rotulo}
    </button>
  );

  return (
    <form className="tela com-rodape" noValidate onSubmit={(e) => { e.preventDefault(); void confirmar(); }}>
      <BarraTopo titulo="Sacar" voltarPara="/painel" />
      <section className="card entre">
        <div><p className="muted">Saldo disponível</p><p className="mono" style={{ fontSize: 24 }}>{moeda(saldo)}</p></div>
        <span className="chip chip-laranja">Somente via Pix</span>
      </section>

      <section className="pilha">
        <label className="titulo-md" htmlFor="valor">Quanto você quer sacar?</label>
        <div className="valor-saque">
          <span>R$</span>
          {/* Digitação estilo "caixa eletrônico": cada dígito entra pela direita (centavos). */}
          <input
            id="valor"
            inputMode="numeric"
            autoComplete="off"
            value={valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            onChange={(e) => setCentavos(Number(soDigitos(e.target.value).slice(0, 10)) || 0)}
          />
        </div>
        <div className="pilulas grade-4">
          {ATALHOS.map((quantia) => atalho(quantia, moeda(quantia).replace(',00', '')))}
          {atalho(saldo, 'Tudo')}
        </div>
      </section>

      <div className="campo">
        <label htmlFor="chave">Chave Pix de destino</label>
        <div className="entrada-com-acao">
          <input className="entrada" id="chave" autoComplete="off" value={chave} onChange={(e) => setChave(e.target.value)} />
          <span className="acao" style={{ width: 'auto', right: 10 }}><span className="tag">{tipo || '?'}</span></span>
        </div>
      </div>
      {tipo ? (
        <Aviso tipo="sucesso" icone="checkCirculo"><b>Chave {tipo.toLowerCase()} válida</b><br />O titular é confirmado pelo banco no momento da transferência.</Aviso>
      ) : chave && (
        <Aviso tipo="erro">Formato de chave não reconhecido. Use e-mail, CPF, telefone ou chave aleatória.</Aviso>
      )}

      <section className="pilha">
        <h2 className="titulo-md">Saques recentes</h2>
        {saques.length ? (
          <div className="card compacto pilha">
            {saques.slice(0, 5).map((s, i) => (
              <Fragment key={s.id}>
                {i > 0 && <div className="divisor" />}
                <div className="entre">
                  <div>
                    <p className="mono" style={{ fontSize: 17 }}>{moeda(s.valor)}</p>
                    <p className="muted pequeno">Solicitado {dataCurta(s.solicitadoEm)}{s.concluidoEm ? ` · Concluído ${dataCurta(s.concluidoEm)}` : ''}</p>
                  </div>
                  <ChipStatus status={s.status} />
                </div>
              </Fragment>
            ))}
          </div>
        ) : (
          <p className="vazio-lista">Você ainda não fez nenhum saque.</p>
        )}
        <p className="seguro"><Icone nome="relogio" tamanho={16} /> O valor cai na conta em instantes.</p>
      </section>
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <div className="rodape-fixo">
        <Botao className="botao botao-primario" type="submit" carregando={sacando}>Confirmar saque</Botao>
      </div>
    </form>
  );
}
