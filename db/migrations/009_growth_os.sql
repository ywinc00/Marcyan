-- ════════════════════════════════════════════════════════════════
--  MARCYAN — migration 009: Growth OS (diagnósticos + eventos)
--  Dos tablas nuevas para el "Diagnóstico digital gratis":
--    · diagnostics — un análisis (DGN-XXX). Se guarda AUNQUE el
--      visitante no reclame el reporte (lead anónimo por session_id).
--      Si reclama, lead_ref apunta al LEAD-XXX creado (source
--      'diagnostic', ver lib/leads.mjs).
--    · events — tracking first-party sin cookies ni PII (api/events.mjs).
--  Folio DGN-XXX con su PROPIA clave de advisory lock (91123747,
--  libre: ≠ 91123745 briefs, ≠ 91123746 leads, ≠ 91123750-53 finance).
--  Idempotente: IF NOT EXISTS, se puede correr múltiples veces.
-- ════════════════════════════════════════════════════════════════

-- ── Diagnósticos ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS diagnostics (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ref_id        TEXT UNIQUE NOT NULL,             -- DGN-001, DGN-002 …
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_id    TEXT,
  language      TEXT NOT NULL DEFAULT 'es',
  business_name TEXT, city TEXT, industry TEXT,
  url           TEXT, url_hash TEXT,
  self_reviews  TEXT,                             -- bucket auto-reportado ('0','1-9','10-29','30+','ns')
  problem       TEXT,
  score_total   INT, score_web INT, score_seo INT, score_ai INT, score_conv INT, score_rep INT,
  findings      JSONB,                            -- [{id, cat, es, en, impact_es, impact_en}]
  report_full   TEXT,
  lead_ref      TEXT,                             -- LEAD-XXX si reclamó el reporte
  ip_address    TEXT, user_agent TEXT
);
CREATE INDEX IF NOT EXISTS diagnostics_url_hash_idx ON diagnostics (url_hash, created_at DESC);

-- ── Eventos first-party ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS events (
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_id TEXT,
  event_name TEXT NOT NULL,
  page       TEXT,
  language   TEXT,
  properties JSONB,
  ip_address TEXT
);
CREATE INDEX IF NOT EXISTS events_name_idx ON events (event_name, created_at DESC);

-- ── Generador atómico del próximo ref_id (DGN-XXX) ────────────
-- Análogo a next_lead_id()/next_project_id() con su PROPIA clave de
-- advisory lock (91123747) para no serializar esta numeración contra
-- las de leads/briefs/finance.
CREATE OR REPLACE FUNCTION next_diagnostic_id()
RETURNS TEXT AS $$
DECLARE
  next_num INT;
BEGIN
  PERFORM pg_advisory_xact_lock(91123747);

  SELECT COALESCE(MAX(CAST(SUBSTRING(ref_id FROM 5) AS INTEGER)), 0) + 1
    INTO next_num
    FROM diagnostics
   WHERE ref_id ~ '^DGN-[0-9]+$';

  RETURN 'DGN-' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;
