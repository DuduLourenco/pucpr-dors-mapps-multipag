# multipag-validador-documentos

Validação, formatação e máscaras de **CPF** e **CNPJ** em TypeScript, sem dependências. Funciona no Node.js e no navegador.

Já aceita o **CNPJ alfanumérico** (letras nas 12 primeiras posições), formato da Receita Federal a partir de julho/2026.

## Instalação

```bash
npm install multipag-validador-documentos
```

## Uso

```ts
import { cpfValido, formatarCpf, cnpjValido, mascaraCnpj } from 'multipag-validador-documentos';

cpfValido('529.982.247-25');      // true
cpfValido('111.111.111-11');      // false
formatarCpf('52998224725');       // "529.982.247-25"

cnpjValido('11.222.333/0001-81'); // true
cnpjValido('12.ABC.345/01DE-35'); // true (alfanumérico)
mascaraCnpj('12abc3');            // "12.ABC.3"
```

## Funções

Todas aceitam o documento com ou sem pontuação.

| Função | O que faz | Exemplo |
|---|---|---|
| `cpfValido(entrada)` | Confere tamanho, sequência repetida e os dígitos verificadores | `cpfValido('529.982.247-25')` → `true` |
| `limparCpf(entrada)` | Deixa só os dígitos | `'529.982.247-25'` → `'52998224725'` |
| `formatarCpf(entrada)` | Aplica a pontuação (não valida) | `'52998224725'` → `'529.982.247-25'` |
| `ocultarCpf(entrada)` | Esconde o início e o fim, para telas públicas | `'52998224725'` → `'***.982.247-**'` |
| `mascaraCpf(digitando)` | Pontua enquanto a pessoa digita em um campo | `'5299'` → `'529.9'` |
| `cnpjValido(entrada)` | Valida CNPJ numérico e alfanumérico | `cnpjValido('12.ABC.345/01DE-35')` → `true` |
| `limparCnpj(entrada)` | Deixa só letras maiúsculas e dígitos | `'12.abc.345/01de-35'` → `'12ABC34501DE35'` |
| `formatarCnpj(entrada)` | Aplica a pontuação (não valida) | `'12ABC34501DE35'` → `'12.ABC.345/01DE-35'` |
| `mascaraCnpj(digitando)` | Pontua enquanto a pessoa digita em um campo | `'12abc3'` → `'12.ABC.3'` |

## Desenvolvimento

```bash
npm install     # instala o TypeScript
npm test        # roda os testes (Node.js 22.18+)
npm run build   # compila src/ para dist/
npm pack        # gera o .tgz que vai para o npm
```
