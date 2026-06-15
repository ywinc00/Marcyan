-- ════════════════════════════════════════════════════════════════
--  MARCYAN — migration 008: gastos de empresa + suscripciones
--  Egresos del negocio (no facturas de cliente). Complementa 004_finance.sql.
--  Todo monto en CENTAVOS (BIGINT), USD. El formateo a dólares vive SOLO en la UI.
--  Idempotente: IF NOT EXISTS, se puede correr múltiples veces.
--
--  Reusa finance_set_updated_at() de 004_finance.sql (no se redefine aquí;
--  estas tablas no llevan updated_at por simplicidad del MVP).
-- ════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════
--  company_expenses — gastos puntuales del negocio (one-off)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS company_expenses (
  id           BIGSERIAL PRIMARY KEY,
  label        TEXT NOT NULL,                       -- nombre del gasto
  category     TEXT,                                -- software | hosting | marketing | legal | otro …
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  spent_at     DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor       TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_expenses_spent_at   ON company_expenses(spent_at DESC);
CREATE INDEX IF NOT EXISTS idx_company_expenses_category   ON company_expenses(category);
CREATE INDEX IF NOT EXISTS idx_company_expenses_created_at ON company_expenses(created_at DESC);

-- ════════════════════════════════════════════════════════════════
--  subscriptions — SaaS recurrentes que pagamos (run-rate mensual)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS subscriptions (
  id             BIGSERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  category       TEXT,
  amount_cents   BIGINT NOT NULL CHECK (amount_cents >= 0),
  cycle          TEXT NOT NULL DEFAULT 'monthly'
                 CHECK (cycle IN ('monthly', 'yearly')),
  next_charge_at DATE,
  active         BOOLEAN NOT NULL DEFAULT true,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_active         ON subscriptions(active);
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_charge_at ON subscriptions(next_charge_at);
CREATE INDEX IF NOT EXISTS idx_subscriptions_created_at     ON subscriptions(created_at DESC);
