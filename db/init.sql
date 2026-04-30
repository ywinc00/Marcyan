-- ════════════════════════════════════════════════════════════════
--  MARCYAN — schema inicial de la tabla `briefs`
--  Correr UNA vez en el dashboard de Vercel (Storage → SQL Editor)
--  o en cualquier cliente Postgres conectado a la DB.
-- ════════════════════════════════════════════════════════════════

-- ── Tabla principal ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS briefs (
  id              BIGSERIAL PRIMARY KEY,
  project_id      TEXT UNIQUE NOT NULL,        -- MRC-001, MRC-002 …
  status          TEXT NOT NULL DEFAULT 'pending',
                  -- pending | contacted | in_progress | completed | archived
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 01 · Información del negocio ───────────────────────────────
  business_name        TEXT,
  owner_name           TEXT,
  industry             TEXT,
  years_in_market      TEXT,
  business_description TEXT,
  products_services    TEXT,

  -- 02 · Contacto e información digital ────────────────────────
  phone            TEXT,
  email            TEXT,
  city_state       TEXT,
  current_website  TEXT,
  instagram        TEXT,
  facebook         TEXT,
  other_socials    TEXT,
  google_business  TEXT,

  -- 03 · Tipo de sitio ─────────────────────────────────────────
  website_type       TEXT,
  has_domain         TEXT,
  has_hosting        TEXT,
  pages_required     JSONB DEFAULT '[]'::jsonb,
  features_required  JSONB DEFAULT '[]'::jsonb,

  -- 04 · Audiencia y objetivos ─────────────────────────────────
  target_audience  TEXT,
  main_objective   TEXT,
  visitor_action   TEXT,
  competitors      TEXT,

  -- 05 · Identidad de marca ────────────────────────────────────
  has_logo            TEXT,
  brand_colors        TEXT,
  brand_fonts         TEXT,
  brand_personality   TEXT,
  inspiration_sites   TEXT,
  design_dislikes     TEXT,

  -- 06 · Contenido del sitio ───────────────────────────────────
  has_photos  TEXT,
  has_copy    TEXT,
  has_video   TEXT,
  language    TEXT,

  -- 07 · Presupuesto y tiempos ─────────────────────────────────
  budget_range  TEXT,
  timeline      TEXT,
  deadline      TEXT,

  -- 08 · Notas adicionales ─────────────────────────────────────
  additional_notes  TEXT,
  referred_by       TEXT,
  previous_agency   TEXT,

  -- Ciclo de vida del proyecto ─────────────────────────────────
  contacted_at   TIMESTAMPTZ,
  completed_at   TIMESTAMPTZ,
  summary        TEXT,                          -- resumen al cierre

  -- Metadata ───────────────────────────────────────────────────
  ip_address  TEXT,
  user_agent  TEXT,
  source      TEXT NOT NULL DEFAULT 'web'
);

-- ── Índices ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_briefs_status     ON briefs(status);
CREATE INDEX IF NOT EXISTS idx_briefs_created_at ON briefs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_briefs_email      ON briefs(email);

-- ── Trigger updated_at ────────────────────────────────────────
CREATE OR REPLACE FUNCTION briefs_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_briefs_updated_at ON briefs;
CREATE TRIGGER trg_briefs_updated_at
  BEFORE UPDATE ON briefs
  FOR EACH ROW
  EXECUTE FUNCTION briefs_set_updated_at();

-- ── Generador atómico del próximo project_id ──────────────────
-- Devuelve MRC-001, MRC-002, … con relleno a 3 dígitos.
-- Usa lock advisory para evitar races concurrentes.
CREATE OR REPLACE FUNCTION next_project_id()
RETURNS TEXT AS $$
DECLARE
  next_num INT;
BEGIN
  -- Lock cooperativo (clave arbitraria pero estable para esta función)
  PERFORM pg_advisory_xact_lock(91123745);

  SELECT COALESCE(MAX(CAST(SUBSTRING(project_id FROM 5) AS INTEGER)), 0) + 1
    INTO next_num
    FROM briefs
   WHERE project_id ~ '^MRC-[0-9]+$';

  RETURN 'MRC-' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;
