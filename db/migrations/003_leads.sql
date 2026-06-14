-- ════════════════════════════════════════════════════════════════
--  MARCYAN — migration 003: leads (mensajes de contacto)
--  Separa los LEADS (contacto simple + chatbot) de los BRIEFS de proyecto.
--  Antes: contacto, /formulario y chatbot escribían todos a `briefs` vía
--  /api/brief, consumiendo un MRC-XXX de proyecto por cada mensaje casual.
--  Ahora: el contacto simple y el chatbot van a `leads` (LEAD-XXX propio);
--  el /formulario amplio sigue creando briefs.
--  Idempotente: IF NOT EXISTS, se puede correr múltiples veces.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS leads (
  id           BIGSERIAL PRIMARY KEY,
  ref_id       TEXT UNIQUE NOT NULL,          -- LEAD-001, LEAD-002 …
  status       TEXT NOT NULL DEFAULT 'new',
               -- new | contacted | converted | archived
  source       TEXT NOT NULL DEFAULT 'contact', -- contact | chat

  -- Datos del lead ─────────────────────────────────────────────
  name           TEXT,
  email          TEXT,
  phone          TEXT,
  business_name  TEXT,
  city           TEXT,
  interest       TEXT,                         -- servicio / objetivo de interés
  message        TEXT,

  -- Conversión (cuando un lead se vuelve proyecto) ─────────────
  converted_brief_id TEXT,                     -- MRC-XXX si se convirtió a brief

  -- Metadata ───────────────────────────────────────────────────
  ip_address   TEXT,
  user_agent   TEXT,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_status     ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email      ON leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_source     ON leads(source);

-- ── Trigger updated_at ────────────────────────────────────────
CREATE OR REPLACE FUNCTION leads_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_leads_updated_at ON leads;
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION leads_set_updated_at();

-- ── Generador atómico del próximo ref_id (LEAD-XXX) ───────────
-- Análogo a next_project_id() pero con su PROPIA clave de advisory
-- lock (91123746 ≠ 91123745 de briefs) para no serializar ambas
-- numeraciones entre sí.
CREATE OR REPLACE FUNCTION next_lead_id()
RETURNS TEXT AS $$
DECLARE
  next_num INT;
BEGIN
  PERFORM pg_advisory_xact_lock(91123746);

  SELECT COALESCE(MAX(CAST(SUBSTRING(ref_id FROM 6) AS INTEGER)), 0) + 1
    INTO next_num
    FROM leads
   WHERE ref_id ~ '^LEAD-[0-9]+$';

  RETURN 'LEAD-' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;
