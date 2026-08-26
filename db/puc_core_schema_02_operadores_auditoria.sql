-- ============================================================================
-- PUC CORE — Operadores da plataforma + Auditoria
-- Migração 02 — depende de puc_core_schema.sql já ter sido executado
-- (usa as tabelas tenant e customer).
--
-- Escopo destas tabelas:
--   * "Operador" é a equipe que opera a PLATAFORMA PUC CORE (cross-tenant):
--     cria tenants, edita configuração/feature flags/limites de qualquer
--     tenant, bloqueia contas, gerencia outros operadores etc. É uma camada
--     separada dos perfis internos de cada tenant (tabela "role", já
--     existente), que continuam servindo o Administrador do tenant/
--     Operador/Usuário final DENTRO de um tenant específico.
--   * "audit_log" é um log genérico de ações sensíveis/administrativas:
--     o ator pode ser um operador da plataforma OU um usuário do tenant
--     agindo com um perfil administrativo (via customer + role). NÃO
--     substitui account_transaction — lançamentos financeiros de rotina
--     (Pix, boleto, cartão, cripto) continuam lá; audit_log é para ações
--     de gestão/configuração/controle de acesso.
-- ============================================================================

-- ============================================================================
-- OPERADORES DA PLATAFORMA
-- ============================================================================

CREATE TABLE operator (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(150) NOT NULL,
    email           VARCHAR(255) NOT NULL UNIQUE,
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active', 'blocked', 'inactive')),
    global_scope    BOOLEAN NOT NULL DEFAULT FALSE, -- true = atua em todos os tenants (atuais e futuros), ignora operator_tenant_scope
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE operator IS
    'Equipe que opera a plataforma PUC CORE (cross-tenant). Distinta da tabela "role", '
    'que modela perfis internos de cada tenant. Autenticação/senha ficam fora do escopo '
    'deste modelo, a exemplo de "customer" (assume-se provedor de identidade externo).';

-- Tenants que um operador pode acessar/atuar, quando global_scope = false.
CREATE TABLE operator_tenant_scope (
    operator_id     UUID NOT NULL REFERENCES operator(id) ON DELETE CASCADE,
    tenant_id       UUID NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,
    granted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (operator_id, tenant_id)
);
COMMENT ON TABLE operator_tenant_scope IS
    'Restringe um operador a atuar apenas nos tenants listados aqui. '
    'Ignorada quando operator.global_scope = true.';
CREATE INDEX idx_operator_tenant_scope_tenant ON operator_tenant_scope(tenant_id);

-- Catálogo de níveis de acesso da plataforma (RBAC), reaproveitando o mesmo
-- padrão já usado para role/permission no nível do tenant.
CREATE TABLE operator_role (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL UNIQUE, -- ex.: Super Admin, Gestor de Tenant, Suporte, Auditor
    description     VARCHAR(255)
);
COMMENT ON TABLE operator_role IS 'Níveis de acesso da plataforma (não confundir com "role", que é por tenant).';

CREATE TABLE operator_permission (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code            VARCHAR(100) NOT NULL UNIQUE, -- ex.: tenant.create, tenant.edit_feature_flags, account.block, operator.manage, audit.view
    description     VARCHAR(255)
);
COMMENT ON TABLE operator_permission IS 'Catálogo global de operações administrativas da plataforma.';

CREATE TABLE operator_role_permission (
    operator_role_id       UUID NOT NULL REFERENCES operator_role(id) ON DELETE CASCADE,
    operator_permission_id UUID NOT NULL REFERENCES operator_permission(id) ON DELETE CASCADE,
    PRIMARY KEY (operator_role_id, operator_permission_id)
);
COMMENT ON TABLE operator_role_permission IS 'Associação N:N entre níveis de acesso e permissões da plataforma.';

CREATE TABLE operator_role_assignment (
    operator_id     UUID NOT NULL REFERENCES operator(id) ON DELETE CASCADE,
    operator_role_id UUID NOT NULL REFERENCES operator_role(id) ON DELETE CASCADE,
    assigned_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (operator_id, operator_role_id)
);
COMMENT ON TABLE operator_role_assignment IS
    'Associação N:N entre operador e nível(is) de acesso — um operador pode acumular mais de um papel.';

-- Seed sugerido de permissões e papéis de exemplo (ajustar/expandir conforme o TCC evoluir)
INSERT INTO operator_permission (code, description) VALUES
    ('tenant.create',              'Criar novo tenant'),
    ('tenant.edit_feature_flags',  'Alterar feature flags de um tenant (Pix, boleto, cartão, cripto)'),
    ('tenant.edit_limits',         'Alterar limites e tarifas de um tenant'),
    ('tenant.edit_branding',       'Alterar identidade visual/branding de um tenant'),
    ('account.block',              'Bloquear conta de cliente'),
    ('account.unblock',            'Desbloquear conta de cliente'),
    ('operator.manage',            'Criar/editar/bloquear outros operadores e seus níveis de acesso'),
    ('audit.view',                 'Consultar a trilha de auditoria');

INSERT INTO operator_role (name, description) VALUES
    ('Super Admin',     'Acesso irrestrito à plataforma, incluindo gestão de outros operadores'),
    ('Gestor de Tenant','Cria e configura tenants (feature flags, limites, branding) dentro do escopo atribuído'),
    ('Suporte',         'Ações operacionais pontuais, como bloquear/desbloquear conta de cliente'),
    ('Auditor',         'Somente leitura da trilha de auditoria, sem permissão de alteração');

-- ============================================================================
-- AUDITORIA
-- ============================================================================

CREATE TABLE audit_log (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           UUID REFERENCES tenant(id),  -- tenant afetado; NULL para ações puramente de plataforma (ex.: operator.manage)
    actor_type          VARCHAR(10) NOT NULL CHECK (actor_type IN ('operator', 'customer')),
    actor_operator_id   UUID REFERENCES operator(id),
    actor_customer_id   UUID REFERENCES customer(id),
    action_code         VARCHAR(100) NOT NULL, -- ex.: tenant.create, tenant.edit_feature_flags, account.block, operator.edit_role
    entity_type         VARCHAR(50)  NOT NULL, -- ex.: tenant, tenant_feature_config, account, operator
    entity_id           UUID,                  -- id da entidade afetada (sem FK — entity_type varia entre tabelas)
    before_state        JSONB,                 -- estado anterior (quando aplicável)
    after_state         JSONB,                 -- estado novo (quando aplicável)
    ip_address          VARCHAR(45),
    user_agent          VARCHAR(255),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_audit_log_actor CHECK (
        (actor_type = 'operator' AND actor_operator_id IS NOT NULL AND actor_customer_id IS NULL)
        OR
        (actor_type = 'customer' AND actor_customer_id IS NOT NULL AND actor_operator_id IS NULL)
    )
);
COMMENT ON TABLE audit_log IS
    'Log genérico de ações administrativas/sensíveis. Ator pode ser um operador da plataforma '
    'ou um usuário do tenant agindo com perfil administrativo. Não substitui account_transaction, '
    'que continua sendo o extrato/histórico financeiro de rotina.';

CREATE INDEX idx_audit_log_tenant ON audit_log(tenant_id);
CREATE INDEX idx_audit_log_actor_operator ON audit_log(actor_operator_id);
CREATE INDEX idx_audit_log_actor_customer ON audit_log(actor_customer_id);
CREATE INDEX idx_audit_log_action_code ON audit_log(action_code);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- Torna o log append-only: nenhuma linha de auditoria pode ser alterada ou apagada,
-- nem mesmo por um operador de nível mais alto — reforça a integridade da trilha.
CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_log é append-only: % não é permitido', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_audit_log_no_update
    BEFORE UPDATE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

CREATE TRIGGER trg_audit_log_no_delete
    BEFORE DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();
