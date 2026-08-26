-- ============================================================================
-- PUC CORE — Plataforma Bancária Digital White-label Multitenant
-- Script de criação do banco de dados (PostgreSQL)
--
-- Estratégia multitenant: banco único, schema compartilhado, com tenant_id
-- em toda tabela de dados de negócio (isolamento por linha / row-level).
-- Estratégia de chave primária: UUID em todas as tabelas.
--
-- Como usar no DBeaver:
--   1. Conecte no seu Postgres já em execução.
--   2. Abra um SQL Editor apontando para o database desejado.
--   3. Execute este script inteiro (Ctrl+Enter em cada bloco, ou "Execute
--      SQL Script" para rodar tudo de uma vez).
--   4. Depois de criado, clique com o botão direito no schema "public" no
--      Database Navigator > "View Diagram" (ou selecione as tabelas e use
--      "ER Diagram") para o DBeaver gerar o diagrama automaticamente a
--      partir do schema real.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- necessário para gen_random_uuid()

-- ============================================================================
-- MÓDULO 1 — NÚCLEO / CONFIGURAÇÃO DE TENANT
-- ============================================================================

CREATE TABLE tenant (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(150) NOT NULL,
    trade_name      VARCHAR(150),                  -- nome fantasia / marca
    slug            VARCHAR(60)  NOT NULL UNIQUE,   -- identificador único
    cnpj            VARCHAR(18)  NOT NULL UNIQUE,
    environment     VARCHAR(20)  NOT NULL DEFAULT 'production'
                        CHECK (environment IN ('development', 'staging', 'production')),
    status          VARCHAR(20)  NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'suspended', 'onboarding', 'decommissioned')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE tenant IS 'Cliente white-label da plataforma (o "tenant" do PUC CORE).';

CREATE TABLE tenant_branding (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL UNIQUE REFERENCES tenant(id) ON DELETE CASCADE,
    app_display_name VARCHAR(150),
    logo_url        VARCHAR(500),
    favicon_url     VARCHAR(500),
    primary_color   VARCHAR(7),   -- HEX, ex.: #112233
    secondary_color VARCHAR(7),
    accent_color    VARCHAR(7),
    font_family     VARCHAR(100),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE tenant_branding IS 'Identidade visual/branding do tenant (item 2 do template de onboarding).';

CREATE TABLE tenant_channel (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL UNIQUE REFERENCES tenant(id) ON DELETE CASCADE,
    primary_domain  VARCHAR(255) NOT NULL,
    staging_url     VARCHAR(255),
    app_name        VARCHAR(150),
    support_email   VARCHAR(255),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE tenant_channel IS 'Canais e endereços de acesso do tenant (item 3 do template de onboarding).';

CREATE TABLE tenant_feature_config (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL UNIQUE REFERENCES tenant(id) ON DELETE CASCADE,
    pix_enabled     BOOLEAN NOT NULL DEFAULT FALSE,
    boleto_enabled  BOOLEAN NOT NULL DEFAULT FALSE,
    card_enabled    BOOLEAN NOT NULL DEFAULT FALSE, -- cartões débito e crédito unificados em uma única flag
    crypto_enabled  BOOLEAN NOT NULL DEFAULT FALSE, -- módulo cripto habilitado como bloco único (tudo ou nada)
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE tenant_feature_config IS
    'Componente "Configuração do tenant": feature flags do módulo fiduciário e do módulo cripto (bloco único). '
    'Conta/saldo, extrato e histórico são habilitados por padrão e não aparecem aqui.';

-- Catálogo fixo de criptomoedas suportadas pela plataforma (não é por tenant)
CREATE TABLE crypto_asset (
    symbol          VARCHAR(10) PRIMARY KEY, -- BTC, ETH, USDT, BNB, SOL
    name            VARCHAR(50) NOT NULL
);
COMMENT ON TABLE crypto_asset IS 'Catálogo fixo de criptoativos suportados pela plataforma.';

INSERT INTO crypto_asset (symbol, name) VALUES
    ('BTC',  'Bitcoin'),
    ('ETH',  'Ethereum'),
    ('BNB',  'BNB'),
    ('USDT', 'Tether'),
    ('SOL',  'Solana');

CREATE TABLE tenant_crypto_asset_config (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    crypto_symbol   VARCHAR(10) NOT NULL REFERENCES crypto_asset(symbol),
    enabled         BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, crypto_symbol)
);
COMMENT ON TABLE tenant_crypto_asset_config IS
    'Habilitação individual de cada criptomoeda do catálogo fixo, por tenant. '
    'Só é relevante quando tenant_feature_config.crypto_enabled = true.';

CREATE TABLE tenant_limit (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                   UUID NOT NULL UNIQUE REFERENCES tenant(id) ON DELETE CASCADE,
    pix_daily_limit             NUMERIC(18,2),
    pix_transaction_limit       NUMERIC(18,2),
    boleto_fee                  NUMERIC(18,2),
    crypto_purchase_limit       NUMERIC(18,2),
    crypto_trade_fee_percent    NUMERIC(5,2),
    card_limit                  NUMERIC(18,2),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE tenant_limit IS 'Limites e tarifas por tenant (item 6 do template de onboarding).';

CREATE TABLE tenant_integration (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    purpose         VARCHAR(50) NOT NULL
                        CHECK (purpose IN ('pix', 'boleto', 'cartao', 'cotacao_cripto', 'kyc', 'notificacoes')),
    provider_name   VARCHAR(150),
    is_required     BOOLEAN NOT NULL DEFAULT TRUE,
    notes           TEXT,
    UNIQUE (tenant_id, purpose)
);
COMMENT ON TABLE tenant_integration IS 'Integrações externas configuradas por tenant (item 8 do template de onboarding).';

CREATE TABLE role (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    description     VARCHAR(255),
    UNIQUE (tenant_id, name)
);
COMMENT ON TABLE role IS 'Perfis específicos do tenant (ex.: Administrador do tenant, Operador, Usuário final).';

CREATE TABLE permission (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(100) NOT NULL UNIQUE,
    description     VARCHAR(255)
);
COMMENT ON TABLE permission IS 'Catálogo global de permissões, reutilizável entre tenants.';

CREATE TABLE role_permission (
    role_id         UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
    permission_id   UUID NOT NULL REFERENCES permission(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);
COMMENT ON TABLE role_permission IS 'Associação N:N entre perfis do tenant e permissões do catálogo global.';

-- ============================================================================
-- MÓDULO 2 — CLIENTE / CONTA (habilitados por padrão, não configuráveis)
-- ============================================================================

CREATE TABLE customer (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    role_id         UUID REFERENCES role(id),
    full_name       VARCHAR(150) NOT NULL,
    document_number VARCHAR(14)  NOT NULL, -- CPF
    email           VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'blocked', 'pending_kyc', 'closed')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, document_number)
);
COMMENT ON TABLE customer IS 'Cliente final do tenant, com dados básicos de KYC mantidos pelo PUC CORE.';
CREATE INDEX idx_customer_tenant ON customer(tenant_id);

CREATE TABLE account (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    customer_id     UUID NOT NULL REFERENCES customer(id) ON DELETE CASCADE,
    currency        CHAR(3) NOT NULL DEFAULT 'BRL' CHECK (currency = 'BRL'), -- plataforma suporta apenas BRL
    balance         NUMERIC(18,2) NOT NULL DEFAULT 0,
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'blocked', 'closed')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE account IS 'Conta e saldo em BRL do cliente. Habilitada por padrão para todo tenant.';
CREATE INDEX idx_account_tenant ON account(tenant_id);
CREATE INDEX idx_account_customer ON account(customer_id);

CREATE TABLE account_transaction (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    account_id      UUID NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    channel         VARCHAR(20) NOT NULL
                        CHECK (channel IN ('pix', 'boleto', 'cartao', 'cripto', 'ajuste_interno')),
    direction       VARCHAR(6) NOT NULL CHECK (direction IN ('credito', 'debito')),
    amount          NUMERIC(18,2) NOT NULL CHECK (amount > 0),
    description     VARCHAR(255),
    status          VARCHAR(20) NOT NULL DEFAULT 'completed'
                        CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE account_transaction IS
    'Lançamento genérico da conta — base do extrato e histórico de transações. '
    'Habilitado por padrão; cada canal (pix/boleto/cartao/cripto) tem uma tabela de detalhe própria.';
CREATE INDEX idx_account_transaction_tenant ON account_transaction(tenant_id);
CREATE INDEX idx_account_transaction_account ON account_transaction(account_id);

-- ============================================================================
-- MÓDULO 3 — FIDUCIÁRIO (Pix, boleto, cartões — configuráveis individualmente)
-- ============================================================================

CREATE TABLE pix_transaction (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    account_transaction_id  UUID NOT NULL UNIQUE REFERENCES account_transaction(id) ON DELETE CASCADE,
    pix_key                 VARCHAR(140) NOT NULL,
    end_to_end_id           VARCHAR(50),
    counterparty_name       VARCHAR(150),
    counterparty_document   VARCHAR(18)
);
COMMENT ON TABLE pix_transaction IS 'Detalhe de uma transação Pix (1:1 com account_transaction).';
CREATE INDEX idx_pix_transaction_tenant ON pix_transaction(tenant_id);

CREATE TABLE boleto (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    account_id              UUID NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    account_transaction_id  UUID REFERENCES account_transaction(id), -- preenchido quando pago
    barcode                 VARCHAR(48) NOT NULL,
    amount                  NUMERIC(18,2) NOT NULL,
    due_date                DATE NOT NULL,
    status                  VARCHAR(20) NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'paid', 'expired', 'canceled')),
    paid_at                 TIMESTAMPTZ
);
COMMENT ON TABLE boleto IS 'Boleto emitido/pago pelo cliente.';
CREATE INDEX idx_boleto_tenant ON boleto(tenant_id);
CREATE INDEX idx_boleto_account ON boleto(account_id);

CREATE TABLE card (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    account_id      UUID NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    card_type       VARCHAR(10) NOT NULL CHECK (card_type IN ('debito', 'credito')),
    masked_number   VARCHAR(25) NOT NULL,
    credit_limit    NUMERIC(18,2), -- aplicável apenas quando card_type = 'credito'
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'blocked', 'canceled')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE card IS
    'Cartão do cliente. Débito e crédito são unificados nesta tabela e controlados pela mesma '
    'feature flag (tenant_feature_config.card_enabled); card_type distingue o comportamento em nível de instância.';
CREATE INDEX idx_card_tenant ON card(tenant_id);
CREATE INDEX idx_card_account ON card(account_id);

-- ============================================================================
-- MÓDULO 4 — CRIPTO (compra, venda e carteira — habilitado como bloco único)
-- ============================================================================

CREATE TABLE crypto_wallet (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    account_id      UUID NOT NULL REFERENCES account(id) ON DELETE CASCADE,
    crypto_symbol   VARCHAR(10) NOT NULL REFERENCES crypto_asset(symbol),
    balance         NUMERIC(28,8) NOT NULL DEFAULT 0,
    UNIQUE (account_id, crypto_symbol)
);
COMMENT ON TABLE crypto_wallet IS 'Carteira do cliente para um criptoativo específico.';
CREATE INDEX idx_crypto_wallet_tenant ON crypto_wallet(tenant_id);

CREATE TABLE crypto_transaction (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id               UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    wallet_id               UUID NOT NULL REFERENCES crypto_wallet(id) ON DELETE CASCADE,
    account_transaction_id  UUID REFERENCES account_transaction(id), -- perna de liquidação em BRL
    operation               VARCHAR(6) NOT NULL CHECK (operation IN ('compra', 'venda')),
    quantity                NUMERIC(28,8) NOT NULL CHECK (quantity > 0),
    unit_price_brl          NUMERIC(18,2) NOT NULL,
    total_brl               NUMERIC(18,2) NOT NULL,
    fee_brl                 NUMERIC(18,2) NOT NULL DEFAULT 0,
    status                  VARCHAR(20) NOT NULL DEFAULT 'completed'
                                CHECK (status IN ('pending', 'completed', 'failed', 'reversed')),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE crypto_transaction IS 'Compra ou venda de criptoativo, liquidada em BRL na conta do cliente.';
CREATE INDEX idx_crypto_transaction_tenant ON crypto_transaction(tenant_id);
CREATE INDEX idx_crypto_transaction_wallet ON crypto_transaction(wallet_id);

-- ============================================================================
-- Índices adicionais recomendados para isolamento/consulta multitenant
-- ============================================================================

CREATE INDEX idx_tenant_crypto_asset_config_tenant ON tenant_crypto_asset_config(tenant_id);
CREATE INDEX idx_tenant_integration_tenant ON tenant_integration(tenant_id);
CREATE INDEX idx_role_tenant ON role(tenant_id);
