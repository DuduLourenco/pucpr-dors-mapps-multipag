-- =========================================================
-- MultiPag - Migração 002: ajustes pedidos pelas telas do Figma
-- Roda DEPOIS de db/database.sql. Tudo aqui é idempotente.
-- =========================================================

-- ---------------------------------------------------------
-- BUSINESS: tipo de conta Pessoa Física / Empresa
-- (telas cadastro-etapa-1-*)
-- ---------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE tipo_conta AS ENUM ('pessoa_fisica', 'empresa');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE business
    ADD COLUMN IF NOT EXISTS tipo_conta       tipo_conta   NOT NULL DEFAULT 'pessoa_fisica',
    ADD COLUMN IF NOT EXISTS cnpj             CHAR(14)     UNIQUE,   -- aceita CNPJ alfanumérico (2026)
    ADD COLUMN IF NOT EXISTS nome_fantasia    VARCHAR(150),
    ADD COLUMN IF NOT EXISTS nome_responsavel VARCHAR(150);

-- ---------------------------------------------------------
-- COBRANCA: link aberto, nome do cliente, recorrência,
-- parcelamento e criptomoedas aceitas (telas criar-cobranca-*)
-- ---------------------------------------------------------
ALTER TABLE cobranca ALTER COLUMN cliente_cpf DROP NOT NULL;  -- "Deixar em aberto"

ALTER TABLE cobranca
    ADD COLUMN IF NOT EXISTS cliente_nome           VARCHAR(150),
    ADD COLUMN IF NOT EXISTS recorrencia            VARCHAR(10) NOT NULL DEFAULT 'unica'
        CHECK (recorrencia IN ('unica', 'semanal', 'mensal', 'anual')),
    ADD COLUMN IF NOT EXISTS recorrencia_inicio     DATE,
    ADD COLUMN IF NOT EXISTS recorrencia_repeticoes INT CHECK (recorrencia_repeticoes > 0),
    ADD COLUMN IF NOT EXISTS parcelas_maximas       SMALLINT NOT NULL DEFAULT 1
        CHECK (parcelas_maximas BETWEEN 1 AND 12),
    ADD COLUMN IF NOT EXISTS criptomoedas           VARCHAR(10)[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS cobranca_item (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cobranca_id     UUID NOT NULL REFERENCES cobranca(id) ON DELETE CASCADE,
    descricao       VARCHAR(150) NOT NULL,
    quantidade      INT NOT NULL CHECK (quantidade > 0),
    valor_unitario  NUMERIC(12,2) NOT NULL CHECK (valor_unitario > 0),
    ordem           SMALLINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_cobranca_item_cobranca ON cobranca_item(cobranca_id);

-- ---------------------------------------------------------
-- PAGAMENTO: várias tentativas por cobrança (ex.: cartão recusado e
-- depois Pix), mas só UMA confirmada. Guarda taxa e dados de retorno.
-- ---------------------------------------------------------
ALTER TABLE pagamento DROP CONSTRAINT IF EXISTS pagamento_cobranca_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS ux_pagamento_confirmado
    ON pagamento(cobranca_id) WHERE status = 'confirmado';
CREATE INDEX IF NOT EXISTS idx_pagamento_transacao ON pagamento(transacao_externa_id);

ALTER TABLE pagamento
    ADD COLUMN IF NOT EXISTS taxa          NUMERIC(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS instrucoes    TEXT,          -- Pix copia-e-cola, linha digitável, carteira cripto
    ADD COLUMN IF NOT EXISTS motivo_falha  VARCHAR(255),
    ADD COLUMN IF NOT EXISTS detalhes      JSONB NOT NULL DEFAULT '{}',  -- parcelas, final do cartão, cotação...
    ADD COLUMN IF NOT EXISTS confirmado_em TIMESTAMPTZ;

-- ---------------------------------------------------------
-- MOVIMENTACAO: método usado (extrato mostra "Entrada · Pix")
-- ---------------------------------------------------------
ALTER TABLE movimentacao ADD COLUMN IF NOT EXISTS metodo metodo_pagamento;
