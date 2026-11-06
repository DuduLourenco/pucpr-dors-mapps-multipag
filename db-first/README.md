# MultiPag: Database First

Neste projeto o caminho é inverso: o **banco de dados vem primeiro** (os scripts SQL da pasta `../db`) e o código é **gerado a partir dele**, sem escrever as classes nem as telas na mão.

| O que é gerado | Ferramenta | Onde fica |
|---|---|---|
| Classes de cada tabela (atributos, tipos, enums, chaves e relacionamentos) | [sequelize-auto](https://github.com/sequelize/sequelize-auto) | `src/models` |
| Telas de CRUD (listar, criar, ver, editar e apagar) de cada tabela | [AdminJS](https://adminjs.co) | `http://localhost:3334/admin` |

```
database.sql  ->  sequelize-auto  ->  src/models (classes)  ->  AdminJS  ->  telas de CRUD
```

O único código escrito à mão é o [`src/admin.ts`](src/admin.ts), que liga as classes geradas ao AdminJS (cerca de 40 linhas).

---

## 1. Como rodar

Pré-requisitos: **Node.js 22+** e **Docker**.

```bash
cd db-first
npm install
npm run banco     # sobe o PostgreSQL (porta 5434) já com as tabelas do MultiPag
npm run gerar     # gera as classes em src/models a partir do banco
npm run admin     # sobe as telas em http://localhost:3334/admin
```

O banco desta pasta é separado do banco do MultiPag (que usa a porta 5433), então os dois podem ficar ligados ao mesmo tempo.

---

## 2. O que o `npm run gerar` cria

Uma classe por tabela em `src/models`, mais o `init-models.ts`, que liga todas elas:

| Arquivo | Tabela |
|---|---|
| `business.ts` | `business` |
| `cliente.ts` | `cliente` |
| `cobranca.ts` | `cobranca` |
| `cobrancaItem.ts` | `cobranca_item` |
| `cobrancaMetodoPagamento.ts` | `cobranca_metodo_pagamento` |
| `pagamento.ts` | `pagamento` |
| `movimentacao.ts` | `movimentacao` |
| `saque.ts` | `saque` |

Cada classe já vem com:

- os atributos com os tipos do banco (`NUMERIC` vira `number`, os `ENUM` viram a lista de valores, `NOT NULL` vira obrigatório);
- chave primária, `UNIQUE` e valores padrão (`now()`, `uuid`);
- os relacionamentos das chaves estrangeiras, com os métodos prontos (`getCobrancas()`, `createCobranca()`, `countSaques()`...).

---

## 3. Roteiro da demonstração

1. **Mostrar o banco.** Abrir `../db/database.sql` e mostrar as tabelas e as chaves estrangeiras.
2. **Subir o banco.** `npm run banco`. As tabelas são criadas sozinhas a partir do SQL.
3. **Gerar as classes.** Apagar a pasta `src/models` e rodar `npm run gerar`. Abrir `src/models/business.ts` e mostrar a classe `Business` com os atributos e os relacionamentos.
4. **Subir as telas.** `npm run admin` e abrir `http://localhost:3334/admin`. No menu aparecem as 8 tabelas.
5. **Fazer o CRUD.** Em **Business**:
   - **Criar** (campos obrigatórios: Nome Empresa, Email, Cpf, Senha Hash e Data Nascimento; o resto usa o valor padrão do banco);
   - **Listar** e **ver** o registro;
   - **Editar** o nome da empresa;
   - **Apagar** (as cobranças dele também são apagadas, porque a chave estrangeira tem `ON DELETE CASCADE`).

   Em **Cobranca**, mostrar os campos Business Id e Cliente Id, que vêm das chaves estrangeiras.
6. **Mudar o banco e gerar de novo** (é isso que mostra o Database First funcionando):

   ```bash
   docker exec multipag_db_first psql -U multipag -d multipag -c "ALTER TABLE business ADD COLUMN telefone VARCHAR(20);"
   npm run gerar
   ```

   Reiniciar o `npm run admin`. A coluna `telefone` aparece na classe `Business` e no formulário, sem escrever nada. Para desfazer:

   ```bash
   docker exec multipag_db_first psql -U multipag -d multipag -c "ALTER TABLE business DROP COLUMN telefone;"
   npm run gerar
   ```

Para zerar tudo: `docker compose down -v`.

---

## 4. Observações

- As telas não têm login. Servem só para a demonstração local.
- O campo **Senha Hash** é digitado como texto, porque a tela grava direto na coluna. Quem gera o hash de verdade é o back-end do MultiPag.
- O `src/admin.ts` fixa o fuso horário em UTC. Sem isso, a data de nascimento (`DATE`, sem hora) voltava um dia em computadores com fuso do Brasil.
- Se mudar a porta ou a senha do banco, ajustar o `docker-compose.yml`, o script `gerar` do `package.json` e a variável `DATABASE_URL`.

## 5. Por que essas ferramentas

O MultiPag usa Node.js, TypeScript e PostgreSQL. O sequelize-auto lê o banco e escreve as classes em TypeScript, e o AdminJS monta as telas de CRUD direto dessas classes. Uma alternativa seria o Prisma (`prisma db pull` para o modelo e o Prisma Studio para o CRUD).
