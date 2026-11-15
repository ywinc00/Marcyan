-- ════════════════════════════════════════════════════════════════
--  MARCYAN — migración 025: libros de Finanzas listos para impuestos
--  Plan: _cerebro/marcyan-web/encargos/2026-11-14-plan-panel-finanzas.md (fase 1)
--  Leyes: _cerebro/marcyan-web/encargos/2026-11-14-investigacion-fiscal-2026.md
--
--  SOLO AÑADE: tablas nuevas y columnas nuevas con valor por defecto. No borra ni
--  renombra nada, no cambia datos existentes salvo rellenar columnas nuevas
--  (started_at de las suscripciones = su fecha de alta). Idempotente.
--  Montos en CENTAVOS (BIGINT), USD, como el resto de Finanzas.
-- ════════════════════════════════════════════════════════════════

-- ── Ajustes del panel (clave → JSON). Finanzas usa las claves 'finance.*';
--    la sección Ajustes (fase 4) reutiliza la misma tabla.
CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  TEXT
);

-- ── Cuentas por donde entra y sale el dinero (decisión del dueño 2026-11-14).
--    Sin números de cuenta: solo el nombre y el tipo.
CREATE TABLE IF NOT EXISTS finance_accounts (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT NOT NULL UNIQUE,
  kind        TEXT NOT NULL DEFAULT 'bank'
              CHECK (kind IN ('bank', 'stripe', 'paypal', 'revolut', 'card', 'cash', 'other')),
  active      BOOLEAN NOT NULL DEFAULT true,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO finance_accounts (name, kind) VALUES
  ('Banco (Zelle y transferencias)', 'bank'),
  ('Stripe', 'stripe'),
  ('PayPal', 'paypal'),
  ('Tarjeta', 'card'),
  ('Revolut', 'revolut'),
  ('Efectivo', 'cash')
ON CONFLICT (name) DO NOTHING;

-- ── Proveedores y contratistas (para la lista de 1099). Nunca se guarda el
--    número fiscal ni el archivo del W-9 (lleva el SSN o EIN): solo si lo tenemos.
CREATE TABLE IF NOT EXISTS finance_vendors (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  is_contractor BOOLEAN NOT NULL DEFAULT false,
  entity_type   TEXT NOT NULL DEFAULT 'unknown'
                CHECK (entity_type IN ('individual', 'llc', 'partnership', 'corporation', 'unknown')),
  w9_status     TEXT NOT NULL DEFAULT 'missing'
                CHECK (w9_status IN ('missing', 'on_file', 'not_required')),
  email         TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_finance_vendors_name ON finance_vendors (lower(name));

-- ── Gastos: lo que pide un libro listo para impuestos.
ALTER TABLE company_expenses ADD COLUMN IF NOT EXISTS updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE company_expenses ADD COLUMN IF NOT EXISTS account_id      BIGINT REFERENCES finance_accounts(id) ON DELETE SET NULL;
ALTER TABLE company_expenses ADD COLUMN IF NOT EXISTS vendor_id       BIGINT REFERENCES finance_vendors(id) ON DELETE SET NULL;
ALTER TABLE company_expenses ADD COLUMN IF NOT EXISTS tax_line        TEXT;   -- línea del Schedule C si se sale de la de su categoría
ALTER TABLE company_expenses ADD COLUMN IF NOT EXISTS business_pct    SMALLINT NOT NULL DEFAULT 100 CHECK (business_pct BETWEEN 0 AND 100);
ALTER TABLE company_expenses ADD COLUMN IF NOT EXISTS receipt_path    TEXT;   -- archivo privado en Blob
ALTER TABLE company_expenses ADD COLUMN IF NOT EXISTS receipt_status  TEXT NOT NULL DEFAULT 'none'
                                                                      CHECK (receipt_status IN ('none', 'attached', 'not_required'));
ALTER TABLE company_expenses ADD COLUMN IF NOT EXISTS source          TEXT NOT NULL DEFAULT 'manual'
                                                                      CHECK (source IN ('manual', 'subscription', 'import', 'agent'));
ALTER TABLE company_expenses ADD COLUMN IF NOT EXISTS source_ref      TEXT;   -- clave de origen: evita duplicar cargos e importaciones
ALTER TABLE company_expenses ADD COLUMN IF NOT EXISTS subscription_id BIGINT REFERENCES subscriptions(id) ON DELETE SET NULL;
ALTER TABLE company_expenses ADD COLUMN IF NOT EXISTS review_status   TEXT NOT NULL DEFAULT 'ok'
                                                                      CHECK (review_status IN ('ok', 'pending'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_company_expenses_source_ref ON company_expenses (source_ref) WHERE source_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_company_expenses_subscription ON company_expenses (subscription_id);
CREATE INDEX IF NOT EXISTS idx_company_expenses_vendor       ON company_expenses (vendor_id);

-- ── Suscripciones: con alta y baja, para que el pasado no cambie al pausarlas.
--    Cada cargo nace como un gasto real (source='subscription') que genera el cron.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS started_at DATE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS ended_at   DATE;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS account_id BIGINT REFERENCES finance_accounts(id) ON DELETE SET NULL;
--    Alta = el día que se aplica esta migración: así el cron no genera de golpe años de
--    cargos (ni del año ya declarado ni los que el dueño ya apuntó a mano). El panel le
--    pide revisar el alta real de cada una; los cargos pasados se crean en meses abiertos.
--    Las que ya estaban en pausa no generan cargos hasta que se reactiven.
UPDATE subscriptions SET started_at = CURRENT_DATE WHERE started_at IS NULL;

-- ── Movimientos automáticos que el dueño borró: el cron y las importaciones no
--    los vuelven a crear (cargo de suscripción que no se cobró, fila repetida…).
CREATE TABLE IF NOT EXISTS finance_suppressed_refs (
  source_ref  TEXT PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  TEXT
);

-- ── Cobros: cuenta y comisión (Stripe/PayPal); el neto es monto − comisión.
ALTER TABLE payments ADD COLUMN IF NOT EXISTS account_id BIGINT REFERENCES finance_accounts(id) ON DELETE SET NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS fee_cents  BIGINT NOT NULL DEFAULT 0 CHECK (fee_cents >= 0);

-- ── Devoluciones a clientes (antes no se podían registrar).
CREATE TABLE IF NOT EXISTS refunds (
  id           BIGSERIAL PRIMARY KEY,
  payment_id   BIGINT REFERENCES payments(id) ON DELETE SET NULL,
  invoice_id   BIGINT REFERENCES invoices(id) ON DELETE SET NULL,
  client_id    BIGINT REFERENCES clients(id) ON DELETE SET NULL,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  refunded_at  DATE NOT NULL,
  account_id   BIGINT REFERENCES finance_accounts(id) ON DELETE SET NULL,
  reason       TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refunds_refunded_at ON refunds (refunded_at DESC);

-- ── Ingresos sin factura (intereses, ventas sueltas, cobros importados aún sin
--    asignar a una factura). Los pendientes no cuentan hasta que se revisan.
CREATE TABLE IF NOT EXISTS income_entries (
  id            BIGSERIAL PRIMARY KEY,
  label         TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'servicios'
                CHECK (category IN ('servicios', 'otros', 'intereses')),
  amount_cents  BIGINT NOT NULL CHECK (amount_cents > 0),
  fee_cents     BIGINT NOT NULL DEFAULT 0 CHECK (fee_cents >= 0),
  received_at   DATE NOT NULL,
  client_id     BIGINT REFERENCES clients(id) ON DELETE SET NULL,
  account_id    BIGINT REFERENCES finance_accounts(id) ON DELETE SET NULL,
  source        TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'import', 'agent')),
  source_ref    TEXT,
  review_status TEXT NOT NULL DEFAULT 'ok' CHECK (review_status IN ('ok', 'pending')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_income_entries_source_ref ON income_entries (source_ref) WHERE source_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_income_entries_received_at ON income_entries (received_at DESC);

-- ── Impuesto de ventas (Texas): estado del cliente y lo cobrado en cada factura.
ALTER TABLE clients  ADD COLUMN IF NOT EXISTS state           TEXT;   -- 'TX', 'FL', …
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sales_tax_cents BIGINT NOT NULL DEFAULT 0 CHECK (sales_tax_cents >= 0);

-- ── Cierre de cada mes: el visto bueno del dueño bloquea el mes.
CREATE TABLE IF NOT EXISTS finance_months (
  month      DATE PRIMARY KEY,                   -- primer día del mes
  status     TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  closed_at  TIMESTAMPTZ,
  closed_by  TEXT,
  checklist  JSONB,                              -- foto del checklist al cerrar
  notes      TEXT
);

-- ── Pagos estimados de impuestos ya hechos (se restan en la hoja del trimestral).
CREATE TABLE IF NOT EXISTS tax_estimated_payments (
  id            BIGSERIAL PRIMARY KEY,
  tax_year      INT NOT NULL,
  quarter       SMALLINT CHECK (quarter BETWEEN 1 AND 4),
  jurisdiction  TEXT NOT NULL DEFAULT 'federal',
  amount_cents  BIGINT NOT NULL CHECK (amount_cents > 0),
  paid_at       DATE NOT NULL,
  partner       TEXT,                            -- en sociedad, de quién es el pago
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Registro de millaje (Parte IV del Schedule C).
CREATE TABLE IF NOT EXISTS mileage_trips (
  id          BIGSERIAL PRIMARY KEY,
  trip_date   DATE NOT NULL,
  origin      TEXT,
  destination TEXT,
  purpose     TEXT NOT NULL,
  miles       NUMERIC(8,1) NOT NULL CHECK (miles > 0),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_mileage_trips_date ON mileage_trips (trip_date DESC);

-- ── Historial de importaciones de CSV (banco, Stripe, PayPal, Revolut, tarjeta).
CREATE TABLE IF NOT EXISTS finance_imports (
  id          BIGSERIAL PRIMARY KEY,
  account_id  BIGINT REFERENCES finance_accounts(id) ON DELETE SET NULL,
  filename    TEXT,
  rows_total  INT NOT NULL DEFAULT 0,
  rows_new    INT NOT NULL DEFAULT 0,
  imported_by TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
