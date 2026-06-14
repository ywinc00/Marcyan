-- ════════════════════════════════════════════════════════════════
--  MARCYAN — migration 006: SEO + GA4
--  Cada proyecto SEO representa un sitio de cliente (o el propio) que
--  monitoreamos vía Google Search Console (GSC) y Google Analytics 4
--  (GA4). Modelo: UNA service account de la agencia con acceso de solo
--  lectura a cada propiedad; aquí guardamos los identificadores
--  (ga4_property_id numérico, gsc_site_url) y cacheamos las métricas
--  diarias en seo_metrics (payload JSONB por fuente+fecha).
--  La conexión real (env GOOGLE_SA_KEY + permisos por cliente) se cablea
--  al final; el esquema no depende de ella.
--  Idempotente: IF NOT EXISTS, se puede correr múltiples veces.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS seo_projects (
  id               BIGSERIAL PRIMARY KEY,
  name             TEXT NOT NULL,                 -- etiqueta interna del proyecto
  client_name      TEXT,                          -- nombre del cliente (opcional)
  ga4_property_id  TEXT,                           -- ID numérico de la propiedad GA4 (ej. 123456789)
  gsc_site_url     TEXT,                           -- propiedad GSC (ej. https://ejemplo.com/ o sc-domain:ejemplo.com)
  domain           TEXT,                           -- dominio canónico para mostrar
  active           BOOLEAN NOT NULL DEFAULT TRUE,
  last_synced_at   TIMESTAMPTZ,                    -- última sincronización exitosa con Google

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_projects_active     ON seo_projects(active);
CREATE INDEX IF NOT EXISTS idx_seo_projects_created_at ON seo_projects(created_at DESC);

-- ── Métricas cacheadas (una fila por proyecto+fuente+fecha) ───
CREATE TABLE IF NOT EXISTS seo_metrics (
  id          BIGSERIAL PRIMARY KEY,
  project_id  BIGINT NOT NULL REFERENCES seo_projects(id) ON DELETE CASCADE,
  source      TEXT NOT NULL,                      -- 'gsc' | 'ga4'
  metric_date DATE NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}'::jsonb,
  fetched_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, source, metric_date)
);

CREATE INDEX IF NOT EXISTS idx_seo_metrics_project_source_date
  ON seo_metrics(project_id, source, metric_date DESC);

-- ── Trigger updated_at (mismo patrón que leads_set_updated_at) ─
CREATE OR REPLACE FUNCTION seo_projects_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_seo_projects_updated_at ON seo_projects;
CREATE TRIGGER trg_seo_projects_updated_at
  BEFORE UPDATE ON seo_projects
  FOR EACH ROW
  EXECUTE FUNCTION seo_projects_set_updated_at();
