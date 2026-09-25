# MultiPag: padrões de projeto para reuso de software

Plataforma de cobrança multicanal: o lojista (**business**) cria uma cobrança, envia o link e o cliente paga com **Pix, cartão, boleto ou cripto**. O valor cai no saldo do lojista, que pode acompanhar o extrato e sacar via Pix.

Este repositório é a entrega de código do trabalho de Padrões de Projeto (**Opção 01**):

| Exigência do trabalho | Onde está |
|---|---|
| Principais classes (ao menos 10) com atributos e métodos | [Seção 3](#3-principais-classes), em `src/domain`, `src/repositorios` e `src/crud` |
| **Singleton**, 2 exemplos | `AppConfigSingleton` e `DatabaseSingleton` ([seção 4.1](#41-singleton-2-exemplos)) |
| **Template Method**, 3 exemplos | `ProcessadorPagamentoTemplateMethod`, `CrudServiceTemplateMethod` e `ExportadorExtratoTemplateMethod` ([seção 4.2](#42-template-method-3-exemplos)) |
| **Novo padrão: Adapter**, 3 exemplos | `PixGatewayAdapter`, `CartaoGatewayAdapter` e `CriptoGatewayAdapter` ([seção 4.3](#43-adapter-novo-padrão-3-exemplos)) |
| 6 telas com CRUD (3 membros × 2 telas) | [Seção 5](#5-telas-e-divisão-da-equipe), baseadas nas telas do Figma em `docs/telas` |

**Stack:** Node.js 22 + TypeScript + Express 5 no back-end, PostgreSQL 16 no banco e HTML/CSS/JavaScript puro (sem framework) no front-end.

---

## 1. Como rodar

Pré-requisitos: **Node.js 22+** e **Docker**.

```bash
docker compose up -d        # sobe o PostgreSQL na porta 5433
npm install
npm run dev                 # http://localhost:3333
```

Na primeira execução o servidor cria as tabelas (`db/database.sql` + `db/002_ajustes_figma.sql`) e popula dados de exemplo.

- **Login de demonstração:** `amanda@silvatech.com.br` / `multipag123`
- **Cartão aprovado:** `4242 4242 4242 4242`, qualquer validade futura e qualquer CVV
- **Cartão recusado:** qualquer número terminado em `0000`
- **Pix, boleto e cripto:** o pagamento fica em "Aguardando pagamento…" e é confirmado sozinho após ~6 s, quando o gateway simulado chama o webhook (ajustável com `SANDBOX_LIQUIDACAO_MS`)

Outros comandos:

```bash
npm test             # testes dos padrões (não precisam de banco)
npm run typecheck    # verificação de tipos
```

As variáveis de ambiente estão em [`.env.example`](.env.example).

---

## 2. Estrutura de pastas

```
src/
├── config/AppConfigSingleton.ts   SINGLETON 1: configuração
├── infra/DatabaseSingleton.ts     SINGLETON 2: pool de conexões e transações
├── domain/                        entidades e value objects (Business, Cobranca, Cpf...)
├── repositorios/                  acesso ao PostgreSQL (base genérica + 1 por tabela)
├── crud/                          TEMPLATE METHOD 2: CrudServiceTemplateMethod + Business/Cobranca/Saque
├── pagamentos/                    TEMPLATE METHOD 1: ProcessadorPagamentoTemplateMethod + Pix/Cartao/Boleto/Cripto
├── extrato/                       TEMPLATE METHOD 3: ExportadorExtratoTemplateMethod + CSV/TXT
├── gateways/                      ADAPTER: interface alvo + 3 adapters
│   └── sdks/                      "bibliotecas de terceiros" simuladas (adaptees)
├── services/                      Auth, Pagamento (lado do cliente) e Extrato
├── http/                          Express: rotas, rotas CRUD genéricas e middlewares
├── seed.ts                        dados de exemplo
└── server.ts                      ponto de entrada
public/                            front-end (um arquivo por tela em js/telas/)
db/                                schema original + migração com ajustes do Figma
test/                              testes dos padrões
```

---

## 3. Principais classes

| # | Classe | Atributos principais | Métodos principais |
|---|---|---|---|
| 1 | `Entidade` (abstrata) | `id`, `criadoEm` | base de todas as entidades |
| 2 | `Business` | `tipoConta`, `nomeEmpresa`, `cnpj`, `cpf`, `email`, `saldo`, `senhaHash` | `criar()`, `creditar()`, `debitar()`, `verificarSenha()`, `alterarSenha()`, `atualizarPerfil()` |
| 3 | `Cobranca` | `itens`, `metodos`, `parcelasMaximas`, `criptomoedas`, `recorrencia`, `clienteCpf`, `linkToken`, `status` | `valor`, `aceita()`, `marcarComoPaga()`, `cancelar()`, `atualizar()`, `paraCliente()` |
| 4 | `ItemCobranca` | `descricao`, `quantidade`, `valorUnitario` | `subtotal` |
| 5 | `Pagamento` | `metodo`, `valorPago`, `taxa`, `status`, `transacaoExternaId`, `instrucoes`, `detalhes` | `valorLiquido`, `registrarEnvio()`, `confirmar()`, `falhar()` |
| 6 | `Saque` | `valor`, `chavePix`, `status`, `concluidoEm` | `concluir()`, `falhar()` |
| 7 | `Movimentacao` | `tipo`, `valor`, `descricao`, `metodo` | `deEntrada()`, `deSaque()`, `ehEntrada()` |
| 8 | `Cpf` (value object) | `valor` | `criar()`, `valido()`, `formatado()`, `mascarado()` |
| 9 | `Cnpj` (value object) | `valor` | `criar()`, `valido()` (inclui o CNPJ alfanumérico de 2026), `formatado()` |
| 10 | `AppConfigSingleton` | taxas, URL base, credenciais, limites | `instancia()`, `taxaPara()`, `urlWebhook()` |
| 11 | `DatabaseSingleton` | `pool`, `transacaoAtual` | `instancia()`, `consultar()`, `transacao()`, `migrar()` |
| 12 | `RepositorioPostgres<T>` | `tabela`, `colunaCriacao` | `buscarPorId()`, `inserir()`, `atualizar()`, `remover()` |
| 13 | `CrudServiceTemplateMethod<T>` | `repositorio`, `nomeRecurso` | `listar()`, `buscar()`, `criar()`, `atualizar()`, `remover()` |
| 14 | `ProcessadorPagamentoTemplateMethod` | `metodo`, `gateway` | `processar()`, `receberNotificacao()` |
| 15 | `ExportadorExtratoTemplateMethod` | `extensao`, `contentType` | `exportar()`, `resumir()` |
| 16 | `AuthService` | — | `login()`, `verificar()` |

---

## 4. Padrões de projeto e por que favorecem o reuso

A ideia central do sistema: **o que é igual é escrito uma vez, e o que varia fica isolado em uma classe pequena.** Cada padrão resolve isso em um nível diferente.

```
Requisição HTTP
   │
   ▼
CrudServiceTemplateMethod / PagamentoService
   │           (Template Method: roteiro fixo + ganchos)
   ▼
ProcessadorPix | ProcessadorCartao | ProcessadorBoleto | ProcessadorCripto
   │           (cada um usa um gateway pela interface GatewayPagamento)
   ▼
PixGatewayAdapter | CartaoGatewayAdapter | CriptoGatewayAdapter
   │           (Adapter: traduz para o SDK de terceiros)
   ▼
BancoPixSdk | CardAcquirerClient | CryptoExchangeApi

Todos leem AppConfigSingleton e gravam via DatabaseSingleton (Singletons).
```

### 4.1 Singleton (2 exemplos)

A classe tem **construtor privado** e um método estático `instancia()` que cria o objeto na primeira chamada e devolve sempre o mesmo depois.

```ts
export class AppConfigSingleton {
  private static instanciaUnica: AppConfigSingleton | null = null;
  private constructor(env: NodeJS.ProcessEnv) { /* lê as variáveis uma vez */ }

  static instancia(): AppConfigSingleton {
    if (!AppConfigSingleton.instanciaUnica) AppConfigSingleton.instanciaUnica = new AppConfigSingleton(process.env);
    return AppConfigSingleton.instanciaUnica;
  }
}
```

#### Exemplo 1: `AppConfigSingleton` ([src/config/AppConfigSingleton.ts](src/config/AppConfigSingleton.ts))

| Classe + método | Por que faz sentido para o reuso |
|---|---|
| `AppConfigSingleton.instancia()` | Chamado por 4 processadores de pagamento, 3 adapters, `Cobranca`, `SaqueService`, `AuthService` e `DatabaseSingleton`. Nenhuma dessas classes precisa receber a configuração por parâmetro nem saber de onde ela vem (variável de ambiente, padrão...). |
| `AppConfigSingleton.taxaPara(metodo, valor)` | A regra da taxa existe em **um único lugar**. Os 4 processadores reutilizam o mesmo cálculo, então não há risco de o Pix cobrar uma taxa diferente da exibida no extrato. |
| `AppConfigSingleton.urlWebhook(gateway)` | Os 3 adapters e o boleto montam a URL de retorno do mesmo jeito. |
| `Object.freeze(this)` no construtor | Como a instância é compartilhada por todo o sistema, ela é imutável: nenhuma classe consegue alterar uma taxa e afetar as outras. |

#### Exemplo 2: `DatabaseSingleton` ([src/infra/DatabaseSingleton.ts](src/infra/DatabaseSingleton.ts))

| Classe + método | Por que faz sentido para o reuso |
|---|---|
| `DatabaseSingleton.instancia()` | Todos os 5 repositórios usam o **mesmo pool de conexões**. Se cada repositório criasse o seu, a aplicação abriria dezenas de conexões e estouraria o limite do PostgreSQL. |
| `DatabaseSingleton.transacao(fn)` | Ao confirmar um pagamento, 4 repositórios diferentes gravam pagamento, cobrança, saldo e extrato. Como todos pedem a conexão ao mesmo Singleton, eles participam **da mesma transação** sem receber a conexão por parâmetro (usa `AsyncLocalStorage`). Os repositórios são reutilizados dentro e fora de transações sem nenhuma mudança. |
| `DatabaseSingleton.consultar(sql, params)` | Único ponto de execução de SQL. Trocar o PostgreSQL por outro banco afeta só esta classe. |

### 4.2 Template Method (3 exemplos)

Uma classe abstrata define o **roteiro fixo** de um algoritmo (o *template method*) e deixa alguns passos como métodos abstratos ou **ganchos** (*hooks*) com implementação padrão. As subclasses só preenchem o que muda.

#### Exemplo 1: `ProcessadorPagamentoTemplateMethod`, o fluxo de pagamento ([src/pagamentos/](src/pagamentos/ProcessadorPagamentoTemplateMethod.ts))

Pagar com qualquer método segue o mesmo roteiro:

```ts
async processar(cobranca, cpfPagador, dados) {            // ← TEMPLATE METHOD
  this.validarComum(cobranca, cpfPagador);                 // fixo
  const extras = this.validarEspecifico(cobranca, dados);  // abstrato (cada método)
  const pagamento = new Pagamento({ ..., taxa: this.calcularTaxa(valor, extras) }); // gancho
  await this.pagamentos.inserir(pagamento);                // fixo
  const resposta = await this.chamarGateway(this.montarRequisicao(...));            // gancho
  if (resposta.situacao !== 'pendente') await this.aplicarResultado(...);           // fixo
}
```

| Classe + método | Por que faz sentido para o reuso |
|---|---|
| `ProcessadorPagamentoTemplateMethod.processar()` | O roteiro é escrito uma vez e reutilizado pelos 4 métodos de pagamento. |
| `ProcessadorPagamentoTemplateMethod.aplicarResultado()` (privado) | É a parte mais difícil: transação, bloqueio de linhas (`FOR UPDATE`), crédito no saldo, lançamento no extrato e **idempotência** (webhook repetido não credita duas vezes). Por ficar na classe base, os 4 métodos de pagamento têm essa garantia sem repetir código. |
| `ProcessadorPagamentoTemplateMethod.receberNotificacao()` | O webhook assíncrono (Pix, boleto, cripto) passa pelo **mesmo** `aplicarResultado()` do fluxo síncrono (cartão). |
| `ProcessadorPix` | Só declara `metodo` e `gateway`, com zero regra própria. É o melhor exemplo do reuso: uma forma de pagamento inteira em ~10 linhas. |
| `ProcessadorCartao.validarEspecifico()` / `montarRequisicao()` / `calcularTaxa()` | Sobrescreve apenas o que o cartão tem de diferente: valida os dados do cartão, acrescenta-os à requisição (chamando `super.montarRequisicao()`) e soma 1% por parcela extra à taxa padrão (`super.calcularTaxa()`). |
| `ProcessadorBoleto.calcularTaxa()` | Troca a taxa percentual por uma **tarifa fixa**, e o resto do fluxo continua igual. |
| `ProcessadorCripto.validarEspecifico()` | Valida a moeda aceita e o valor mínimo. |

**Para adicionar um novo método de pagamento** (ex.: PicPay), basta criar uma subclasse com `metodo`, `gateway` e `validarEspecifico()`.

#### Exemplo 2: `CrudServiceTemplateMethod`, a base de todos os CRUDs ([src/crud/](src/crud/CrudServiceTemplateMethod.ts))

As telas de Business, Cobrança e Saque fazem as mesmas operações e todas precisam checar o dono do registro, validar a entrada, abrir transação e devolver 404 padronizado.

```
criar()     = validarCriacao → construir → [antesDeCriar] → inserir → [aposCriar]
atualizar() = buscar → [verificarPodeAlterar] → validarAtualizacao → aplicarAlteracoes → atualizar
remover()   = buscar → [verificarPodeRemover] → [executarRemocao]
```

| Classe + método | Por que faz sentido para o reuso |
|---|---|
| `CrudServiceTemplateMethod.buscar()` | A regra de segurança "um lojista não vê a cobrança do outro" (`pertenceAo`) é aplicada em **todas** as operações de todos os CRUDs, sem ninguém poder esquecer. |
| `CrudServiceTemplateMethod.criar()` / `atualizar()` / `remover()` | Abrem a transação e seguem a mesma ordem de passos para os 3 recursos. |
| `CobrancaService.executarRemocao()` | Sobrescreve o gancho para fazer **exclusão lógica** (a cobrança vira "cancelada" e fica no banco para auditoria), enquanto `BusinessService` usa o `DELETE` padrão. Mesmo template, dois comportamentos. |
| `SaqueService.antesDeCriar()` | Debita o saldo **na mesma transação** do insert: se faltar saldo, nada é gravado. |
| `SaqueService.verificarPodeAlterar()` / `verificarPodeRemover()` | Saque é "só cria e lê". Os ganchos bloqueiam o resto, e o recurso ainda reaproveita o `listar()`/`buscar()`/`criar()` da base. |
| `BusinessService.verificarPodeRemover()` | Impede excluir a conta com saldo. |
| `rotasCrud(service)` ([src/http/rotasCrud.ts](src/http/rotasCrud.ts)) | Como todo CRUD tem a mesma interface, **uma única função** gera as 5 rotas REST de cobranças e de saques. |

#### Exemplo 3: `ExportadorExtratoTemplateMethod`, a exportação do extrato ([src/extrato/](src/extrato/ExportadorExtratoTemplateMethod.ts))

```ts
exportar(business, movimentacoes, periodo) {          // ← TEMPLATE METHOD
  const ordenadas = ...;                              // fixo
  const resumo = ExportadorExtratoTemplateMethod.resumir(ordenadas); // fixo
  return [this.cabecalho(...), ...ordenadas.map((m) => this.linha(m)), this.rodape(resumo, saldo)]
    .join(this.separadorLinhas());                    // abstratos + gancho
}
```

| Classe + método | Por que faz sentido para o reuso |
|---|---|
| `ExportadorExtratoTemplateMethod.exportar()` | Ordenação e montagem são iguais para qualquer formato. |
| `ExportadorExtratoTemplateMethod.resumir()` | Os totais são dado de **auditoria** (RNF09) e não podem divergir entre formatos, por isso são calculados só na base. A tela de extrato (`ExtratoService`) reutiliza o mesmo método para os cards de Entradas/Saques. |
| `moeda()` / `dataHora()` (protegidos) | Formatação reaproveitada pelas subclasses. |
| `ExportadorCsv` | Implementa `linha()` com escape de `;` e aspas, retorna rodapé vazio e sobrescreve o gancho `separadorLinhas()` para `\r\n` (padrão do Excel). |
| `ExportadorTexto` | Mesmo roteiro, em formato de comprovante com cabeçalho e totais. |

**Para adicionar um novo formato** (ex.: OFX para contabilidade), basta criar uma subclasse com 3 métodos e registrá-la em `ExtratoService`.

### 4.3 Adapter (novo padrão, 3 exemplos)

**Intenção (GoF):** converter a interface de uma classe existente na interface que o cliente espera, permitindo **reutilizar classes que já existem** mesmo com interfaces incompatíveis. Entre os padrões GoF, é o que mais diretamente trata de **reuso de software**.

O problema no MultiPag: cada provedor de pagamento tem sua própria biblioteca, com nomes, unidades e formatos diferentes, e **não podemos alterar essas bibliotecas**. Em vez de espalhar `if (metodo === 'pix')` pelo sistema, definimos uma interface própria:

```ts
// Target
interface GatewayPagamento {
  cobrar(requisicao: RequisicaoGateway): Promise<RespostaGateway>;  // sempre em reais
  traduzirNotificacao(payload: unknown): NotificacaoGateway;        // webhook → nosso formato
}
```

Cada adapter *implementa* `GatewayPagamento` e *contém* o SDK do provedor (o *adaptee*). Os SDKs em [`src/gateways/sdks/`](src/gateways/sdks/) simulam bibliotecas de terceiros e estão marcados como "não podemos alterar".

| Papel | Classe |
|---|---|
| Target | `GatewayPagamento` |
| Client | `ProcessadorPagamentoTemplateMethod` (e subclasses) |
| Adaptees | `BancoPixSdk`, `CardAcquirerClient`, `CryptoExchangeApi` |
| Adapters | `PixGatewayAdapter`, `CartaoGatewayAdapter`, `CriptoGatewayAdapter` |

#### Exemplo 1: `PixGatewayAdapter` ([src/gateways/PixGatewayAdapter.ts](src/gateways/PixGatewayAdapter.ts))

| Incompatibilidade do SDK do banco (formato BACEN) | O que o adapter faz |
|---|---|
| valor como **string** em `{ valor: { original: "100.00" } }` | `req.valor.toFixed(2)` |
| CPF dentro de `{ devedor: { cpf } }` | move o campo |
| status `ATIVA` / `CONCLUIDA` / `REMOVIDA_PELO_PSP` | traduz para `pendente` / `aprovado` / `recusado` |
| webhook `{ pix: [{ txid, ... }] }` | `traduzirNotificacao()` devolve `{ transacaoExternaId, aprovado }` |

#### Exemplo 2: `CartaoGatewayAdapter` ([src/gateways/CartaoGatewayAdapter.ts](src/gateways/CartaoGatewayAdapter.ts))

| Incompatibilidade da adquirente (API em inglês) | O que o adapter faz |
|---|---|
| valor em **centavos inteiros** (`amount_cents`) | `Math.round(valor * 100)` |
| validade em `exp_month` / `exp_year` | quebra `"09/29"` em `9` e `2029` |
| `outcome: approved \| declined` + `decline_code` em inglês | traduz para `situacao` e mensagem em português ("Cartão recusado: saldo ou limite insuficiente.") |

#### Exemplo 3: `CriptoGatewayAdapter` ([src/gateways/CriptoGatewayAdapter.ts](src/gateways/CriptoGatewayAdapter.ts))

A adaptação mais "pesada": a exchange **não aceita reais**.

| Incompatibilidade da exchange | O que o adapter faz |
|---|---|
| fatura na moeda cripto, com 8 casas decimais | chama `getTicker('BTC-BRL')` e converte `valor / cotação` |
| estados `PENDING` / `PAID` / `EXPIRED` | traduz para `pendente` / `aprovado` / `recusado` |
| webhook `{ event: 'invoice.paid', data: {...} }` | `traduzirNotificacao()` |

**Contraste:** `BoletoGatewayInterno` foi escrito já seguindo `GatewayPagamento`, então **não precisa de adapter**. Isso mostra que o Adapter só é necessário quando reusamos código que não controlamos.

| Por que faz sentido para o reuso |
|---|
| Reutilizamos os SDKs dos provedores **sem alterar uma linha deles**. |
| `ProcessadorPagamentoTemplateMethod` (e toda a lógica de confirmação) é reutilizado com qualquer provedor, porque só conhece `GatewayPagamento`. |
| A rota `POST /api/webhooks/:gateway` é **uma só** para todos os provedores: cada adapter traduz o seu formato. |
| Trocar de banco parceiro ou de adquirente significa escrever um novo adapter. Processadores, services e telas continuam iguais. |
| Os adapters recebem o SDK pelo construtor, então nos testes injetamos um SDK falso ([test/padroes.test.ts](test/padroes.test.ts)). |

### 4.4 Outros pontos de reuso (fora dos padrões pedidos)

- **`RepositorioPostgres<T>`**: o SQL de `buscarPorId`/`inserir`/`atualizar`/`remover` é escrito uma vez. Cada repositório só informa a tabela e como converter linha ↔ entidade. `CobrancaRepositorio` usa os ganchos `hidratar()`/`aposGravar()` para as tabelas filhas.
- **`Entidade`**: `id` e `criadoEm` herdados por todas as entidades.
- **`Cpf` / `Cnpj`**: value objects usados no cadastro, na cobrança, no pagamento e nos repositórios. A regra dos dígitos verificadores existe em um lugar só.
- **Front-end**: `ui.js` concentra componentes (`barraTopo`, `etapas`, `aviso`, `chipStatus`) e máscaras reaproveitados pelas 8 telas.

---

## 5. Telas e divisão da equipe

As telas reproduzem o protótipo do Figma (exportado em [`docs/telas/`](docs/telas)). Cada tela é um arquivo em [`public/js/telas/`](public/js/telas).

| Membro | Tela | Arquivo | Telas do Figma | CRUD |
|---|---|---|---|---|
| **1** | 1. Login | `login.js` | `multipag-login` | autenticação |
| **1** | 2. Cadastro (3 etapas) + Minha conta | `cadastro.js`, `conta.js` | `cadastro-etapa-1/2/3` | **Business**: Create, Read, Update, Delete |
| **2** | 3. Nova / editar cobrança (5 etapas) | `form-cobranca.js` | `criar-cobranca-etapa-1..5` | **Cobrança**: Create, Update |
| **2** | 4. Lista de cobranças | `cobrancas.js` | (painel → Cobranças) | **Cobrança**: Read, Delete (cancelamento) |
| **3** | 5. Pagamento pelo cliente | `pagamento.js` | `cobranca-recebida-cliente`, `pagamento-*`, `pagamento-retorno-*` | **Pagamento**: Create, Read |
| **3** | 6. Saque | `saque.js` | `saque` | **Saque**: Create, Read |
| apoio | Painel e Extrato | `painel.js`, `extrato.js` | `business-dashboard`, `extrato` | Read + exportação CSV/TXT |

---

## 6. Banco de dados

- [`db/database.sql`](db/database.sql): schema original do projeto, **sem alterações**.
- [`db/002_ajustes_figma.sql`](db/002_ajustes_figma.sql): migração com o que as telas do Figma exigiram:
  - `business`: tipo de conta PF/Empresa, CNPJ, nome fantasia, nome do responsável
  - `cobranca`: `cliente_cpf` opcional (link aberto), nome do cliente, recorrência, parcelamento máximo e criptomoedas aceitas
  - nova tabela `cobranca_item` (a cobrança agora tem vários itens)
  - `pagamento`: várias tentativas por cobrança (cartão recusado → Pix), mas só **uma confirmada** (índice único parcial), além de taxa, instruções e detalhes do comprovante
  - `movimentacao`: método usado (o extrato mostra "Entrada · Pix")

As migrações rodam automaticamente ao iniciar o servidor (`DatabaseSingleton.migrar()`), controladas pela tabela `migracao`.

---

## 7. API

| Método | Rota | Descrição | Auth |
|---|---|---|---|
| POST | `/api/business` | cadastro | — |
| POST | `/api/auth/login` | login (token HMAC) | — |
| GET / PUT / DELETE | `/api/business/me` | minha conta | ✔ |
| GET / POST | `/api/cobrancas` | listar / criar | ✔ |
| GET / PUT / DELETE | `/api/cobrancas/:id` | detalhar / editar / cancelar | ✔ |
| GET / POST | `/api/saques` | listar / solicitar | ✔ |
| GET | `/api/extrato?mes=AAAA-MM&tipo=` | extrato e resumo do mês | ✔ |
| GET | `/api/extrato/exportar?formato=csv\|txt` | exportação (Template Method 3) | ✔ |
| GET | `/api/publico/cobrancas/:token` | cobrança pelo link | — |
| POST | `/api/publico/cobrancas/:token/pagamentos` | pagar | — |
| GET | `/api/publico/pagamentos/:id` | status do pagamento (polling) | — |
| POST | `/api/webhooks/:gateway` | confirmação dos provedores (`pix`, `boleto`, `cripto`) | — |

---

## 8. O que é simulado

Para o trabalho rodar sem contas reais em bancos e adquirentes:

- Os SDKs de Pix, cartão e cripto são **simulações** (`src/gateways/sdks/`). Eles chamam o webhook do próprio servidor após `SANDBOX_LIQUIDACAO_MS`.
- O saque é marcado como concluído após o mesmo intervalo.
- O e-mail com o link de cobrança é só registrado no log do servidor.
- Cobranças recorrentes guardam a configuração, mas a geração automática das próximas cobranças não está implementada.
- "Esqueci minha senha" e a conta do cliente final (`cadastro-cliente`, `login-cliente` do Figma) estão fora do escopo.
- Os webhooks não verificam assinatura dos provedores (em produção, cada adapter deveria validar a assinatura do respectivo provedor).
