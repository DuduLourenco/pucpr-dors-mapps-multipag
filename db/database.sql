-- =========================================================
-- MultiPag - Schema mínimo (PostgreSQL)
-- Cobre RF01-RF15 e RNF01/RNF09 do documento de definição
-- =========================================================

-- Extensão usada para gerar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================
-- ENUMS
-- =========================================================
CREATE TYPE metodo_pagamento AS ENUM ('pix', 'cartao', 'boleto', 'cripto');
CREATE TYPE status_cobranca  AS ENUM ('pendente', 'paga', 'expirada', 'cancelada');
CREATE TYPE status_pagamento AS ENUM ('pendente', 'confirmado', 'falhou');
CREATE TYPE status_saque     AS ENUM ('solicitado', 'processando', 'concluido', 'falhou');

-- =========================================================
-- BUSINESS (RF01, RF02, RF07)
-- =========================================================
CREATE TABLE business (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome_empresa      VARCHAR(150) NOT NULL,
    email             VARCHAR(150) NOT NULL UNIQUE,
    cpf               CHAR(11)     NOT NULL UNIQUE,
    data_nascimento   DATE         NOT NULL,
    senha_hash        VARCHAR(255) NOT NULL,               -- RNF01: armazenar sempre com hash
    saldo_disponivel  NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (saldo_disponivel >= 0),
    criado_em         TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON TABLE business IS 'Lojista/empresa que se cadastra para gerar cobranças';

-- =========================================================
-- CLIENTE (RF13, RF14) - conta opcional do cliente final
-- =========================================================
CREATE TABLE cliente (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email       VARCHAR(150) NOT NULL UNIQUE,
    cpf         CHAR(11)     NOT NULL UNIQUE,
    senha_hash  VARCHAR(255) NOT NULL,
    criado_em   TIMESTAMPTZ  NOT NULL DEFAULT now()
);
COMMENT ON TABLE cliente IS 'Conta opcional do cliente final, vinculada pelo CPF';

-- =========================================================
-- COBRANCA (RF03, RF05, RF06, RF15)
-- =========================================================
CREATE TABLE cobranca (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id     UUID NOT NULL REFERENCES business(id) ON DELETE CASCADE,
    cliente_id      UUID REFERENCES cliente(id) ON DELETE SET NULL,  -- pode ser NULL (pagamento como convidado)
    cliente_cpf     CHAR(11) NOT NULL,           -- sempre obrigatório, mesmo sem conta (RF11)
    cliente_email   VARCHAR(150),
    valor           NUMERIC(12,2) NOT NULL CHECK (valor > 0),
    descricao       VARCHAR(255),
    link_pagamento  VARCHAR(255) NOT NULL UNIQUE,
    status          status_cobranca NOT NULL DEFAULT 'pendente',
    criado_em       TIMESTAMPTZ NOT NULL DEFAULT now(),
    pago_em         TIMESTAMPTZ
);
COMMENT ON TABLE cobranca IS 'Cobrança criada pelo business; vínculo ao cliente é pelo CPF, não pela conta (permite histórico mesmo sem cadastro)';

CREATE INDEX idx_cobranca_cliente_cpf ON cobranca(cliente_cpf);
CREATE INDEX idx_cobranca_business    ON cobranca(business_id);

-- =========================================================
-- COBRANCA_METODO_PAGAMENTO (RF04) - métodos habilitados por cobrança
-- =========================================================
CREATE TABLE cobranca_metodo_pagamento (
    cobranca_id  UUID NOT NULL REFERENCES cobranca(id) ON DELETE CASCADE,
    metodo       metodo_pagamento NOT NULL,
    PRIMARY KEY (cobranca_id, metodo)
);
COMMENT ON TABLE cobranca_metodo_pagamento IS 'Métodos de pagamento habilitados para cada cobrança';

-- =========================================================
-- PAGAMENTO (RF12, RF15)
-- =========================================================
CREATE TABLE pagamento (
    id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cobranca_id            UUID NOT NULL UNIQUE REFERENCES cobranca(id) ON DELETE CASCADE,
    metodo_utilizado       metodo_pagamento NOT NULL,
    valor_pago             NUMERIC(12,2) NOT NULL CHECK (valor_pago > 0),
    cpf_pagador            CHAR(11) NOT NULL,
    status                 status_pagamento NOT NULL DEFAULT 'pendente',
    transacao_externa_id   VARCHAR(100),      -- id retornado pelo gateway (Pix/cartão/boleto/cripto)
    pago_em                TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE pagamento IS 'Registro do pagamento efetuado; confirmação dispara atualização do status da cobrança';

-- =========================================================
-- MOVIMENTACAO / EXTRATO (RF08, RNF09)
-- =========================================================
CREATE TABLE movimentacao (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id   UUID NOT NULL REFERENCES business(id) ON DELETE CASCADE,
    tipo          VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada_pagamento', 'saque')),
    valor         NUMERIC(12,2) NOT NULL,
    pagamento_id  UUID REFERENCES pagamento(id),
    saque_id      UUID,  -- FK adicionada após a criação da tabela saque (abaixo)
    descricao     VARCHAR(255),
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE movimentacao IS 'Extrato de movimentações do saldo do business, para auditoria';

CREATE INDEX idx_movimentacao_business ON movimentacao(business_id);

-- =========================================================
-- SAQUE (RF09)
-- =========================================================
CREATE TABLE saque (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id    UUID NOT NULL REFERENCES business(id) ON DELETE CASCADE,
    valor          NUMERIC(12,2) NOT NULL CHECK (valor > 0),
    chave_pix      VARCHAR(150) NOT NULL,     -- saque é exclusivo via Pix
    status         status_saque NOT NULL DEFAULT 'solicitado',
    solicitado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
    concluido_em   TIMESTAMPTZ
);
COMMENT ON TABLE saque IS 'Solicitação de saque do saldo, exclusivamente via Pix';

-- FK de movimentacao -> saque (criada agora que a tabela saque já existe)
ALTER TABLE movimentacao
    ADD CONSTRAINT fk_movimentacao_saque FOREIGN KEY (saque_id) REFERENCES saque(id);