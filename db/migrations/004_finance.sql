-- ════════════════════════════════════════════════════════════════
--  MARCYAN — migration 004: finanzas (clients, projects, invoices, payments)
--  MVP manual (sin Stripe todavía). Todo monto en CENTAVOS (BIGINT), USD.
--  El formateo a dólares vive SOLO en la UI.
--  Idempotente: IF NOT EXISTS, se puede correr múltiples veces.
--
--  Advisory locks de numeración (claves ÚNICAS, distintas entre sí y de
--  next_project_id()=91123745 / next_lead_id()=91123746):
--    next_client_id()      → 91123751  (CLI-XXX)
--    next_project_code()   → 91123752  (PRJ-XXX)
--    next_invoice_id()     → 91123750  (INV-XXX)
-- ════════════════════════════════════════════════════════════════

-- ── Función trigger updated_at compartida ─────────────────────
-- Patrón copiado de leads_set_updated_at() (db/migrations/003_leads.sql).
CREATE OR REPLACE FUNCTION finance_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════════
--  clients — clientes reales (un brief convertido o alta manual)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS clients (
  id              BIGSERIAL PRIMARY KEY,
  client_code     TEXT UNIQUE NOT NULL,          -- CLI-001, CLI-002 …
  business_name   TEXT,
  owner_name      TEXT,
  email           TEXT,
  phone           TEXT,
  city_state      TEXT,
  source_brief_id TEXT REFERENCES briefs(project_id) ON DELETE SET NULL,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'active', -- active | inactive | archived
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clients_status     ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_clients_email      ON clients(email);

DROP TRIGGER IF EXISTS trg_clients_updated_at ON clients;
CREATE TRIGGER trg_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW
  EXECUTE FUNCTION finance_set_updated_at();

-- Generador atómico del próximo client_code (CLI-XXX) — lock 91123751
CREATE OR REPLACE FUNCTION next_client_id()
RETURNS TEXT AS $$
DECLARE
  next_num INT;
BEGIN
  PERFORM pg_advisory_xact_lock(91123751);

  SELECT COALESCE(MAX(CAST(SUBSTRING(client_code FROM 5) AS INTEGER)), 0) + 1
    INTO next_num
    FROM clients
   WHERE client_code ~ '^CLI-[0-9]+$';

  RETURN 'CLI-' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════════
--  projects — proyectos facturables (también usados por sección Progreso)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS projects (
  id                 BIGSERIAL PRIMARY KEY,
  project_code       TEXT UNIQUE NOT NULL,        -- PRJ-001, PRJ-002 …
  client_id          BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  brief_project_id   TEXT REFERENCES briefs(project_id) ON DELETE SET NULL,
  name               TEXT,
  service_type       TEXT,                        -- landing | web | seo | aeo | logo | chatbot | other
  agreed_amount_cents BIGINT NOT NULL DEFAULT 0,  -- monto acordado, en CENTAVOS USD
  status             TEXT NOT NULL DEFAULT 'active', -- active | on_hold | completed | cancelled
  started_at         DATE,
  completed_at       DATE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_client_id  ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status     ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION finance_set_updated_at();

-- Generador atómico del próximo project_code (PRJ-XXX) — lock 91123752
CREATE OR REPLACE FUNCTION next_project_code()
RETURNS TEXT AS $$
DECLARE
  next_num INT;
BEGIN
  PERFORM pg_advisory_xact_lock(91123752);

  SELECT COALESCE(MAX(CAST(SUBSTRING(project_code FROM 5) AS INTEGER)), 0) + 1
    INTO next_num
    FROM projects
   WHERE project_code ~ '^PRJ-[0-9]+$';

  RETURN 'PRJ-' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════════
--  invoices — facturas (monto total en CENTAVOS USD)
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS invoices (
  id             BIGSERIAL PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,            -- INV-001, INV-002 …
  client_id      BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  project_id     BIGINT REFERENCES projects(id) ON DELETE SET NULL,
  amount_cents   BIGINT NOT NULL CHECK (amount_cents >= 0),
  currency       TEXT NOT NULL DEFAULT 'USD',
  status         TEXT NOT NULL DEFAULT 'draft',
                 -- draft | sent | partial | paid | overdue | void
  issued_at      DATE,
  due_date       DATE,
  description    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status    ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date  ON invoices(due_date);

DROP TRIGGER IF EXISTS trg_invoices_updated_at ON invoices;
CREATE TRIGGER trg_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION finance_set_updated_at();

-- Generador atómico del próximo invoice_number (INV-XXX) — lock 91123750
CREATE OR REPLACE FUNCTION next_invoice_id()
RETURNS TEXT AS $$
DECLARE
  next_num INT;
BEGIN
  PERFORM pg_advisory_xact_lock(91123750);

  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 5) AS INTEGER)), 0) + 1
    INTO next_num
    FROM invoices
   WHERE invoice_number ~ '^INV-[0-9]+$';

  RETURN 'INV-' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════════
--  payments — pagos parciales/totales contra una factura
-- ════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS payments (
  id                BIGSERIAL PRIMARY KEY,
  invoice_id        BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  client_id         BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount_cents      BIGINT NOT NULL CHECK (amount_cents > 0),
  method            TEXT,                         -- zelle | cash | transfer | paypal | card | other
  paid_at           DATE NOT NULL,
  reference         TEXT,
  stripe_payment_id TEXT,                         -- NULL en MVP manual
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_client_id  ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_paid_at    ON payments(paid_at DESC);
