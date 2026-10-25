-- ════════════════════════════════════════════════════════════════
--  MARCYAN — migration 014: SEO, estado honesto de la sincronización
--
--  1) seo_projects: estado del último intento de sincronizar, por fuente
--     (SEO-03, SEO-07). last_synced_at pasa a significar lo que dice 006:
--     "última sincronización EXITOSA" (todas las fuentes configuradas bien).
--       last_attempt_at   → último intento (manual o del cron), haya ido bien o no
--       last_sync_status  → 'ok' | 'partial' | 'error' del último intento
--       sync_state        → JSONB por fuente (gsc, ga4, indexation):
--                           { status, at, ok_at, synced, range, error{code,title,action,detail} }
--                           (forma exacta en lib/seo-core.mjs, mergeSyncState)
--  2) seo_metrics: el resumen de "top búsquedas" deja de compartir clave con
--     el dato diario de Search Console (SEO-05). Va con source 'gsc_queries'.
--     Las filas viejas (source 'gsc' con payload.kind = 'top_queries') se
--     mueven si no chocan y se borran si chocan (el dato diario de esa fecha
--     se vuelve a traer en la próxima sincronización).
--  3) CHECK de las fuentes válidas de seo_metrics y comentarios al día
--     (SEO-25: la conexión ya no usa GOOGLE_SA_KEY sino Workload Identity
--     Federation sin clave; la fuente 'indexation' existía sin documentar).
--
--  Idempotente: IF NOT EXISTS / DROP … IF EXISTS; se puede correr varias veces.
--  Advisory lock propio 91123764 (libre: ≠ 91123745-47, 91123750-53, 91123760).
--  Aplicar A MANO en Neon (como 002-010). La app funciona sin ella: el panel
--  enseña el resultado de la sincronización en curso pero no lo recuerda al
--  recargar, y lee los resúmenes viejos de búsquedas.
-- ════════════════════════════════════════════════════════════════

BEGIN;
SELECT pg_advisory_xact_lock(91123764);

-- ── 1) Estado de la sincronización ─────────────────────────────
ALTER TABLE seo_projects ADD COLUMN IF NOT EXISTS last_attempt_at  TIMESTAMPTZ;
ALTER TABLE seo_projects ADD COLUMN IF NOT EXISTS last_sync_status TEXT;
ALTER TABLE seo_projects ADD COLUMN IF NOT EXISTS sync_state       JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE seo_projects DROP CONSTRAINT IF EXISTS seo_projects_last_sync_status_check;
ALTER TABLE seo_projects ADD CONSTRAINT seo_projects_last_sync_status_check
  CHECK (last_sync_status IS NULL OR last_sync_status IN ('ok', 'partial', 'error'));

-- El cron recorre primero los proyectos que llevan más tiempo sin intentarse.
CREATE INDEX IF NOT EXISTS idx_seo_projects_attempt ON seo_projects(active, last_attempt_at NULLS FIRST);

COMMENT ON COLUMN seo_projects.last_synced_at   IS 'Última sincronización EXITOSA: todas las fuentes configuradas (Search Console y Analytics) fueron bien.';
COMMENT ON COLUMN seo_projects.last_attempt_at  IS 'Último intento de sincronizar (manual o cron), haya ido bien o no.';
COMMENT ON COLUMN seo_projects.last_sync_status IS 'Resultado del último intento: ok | partial | error.';
COMMENT ON COLUMN seo_projects.sync_state       IS 'Estado por fuente (gsc, ga4, indexation) con el error guardado. Forma en lib/seo-core.mjs.';
COMMENT ON COLUMN seo_projects.ga4_property_id  IS 'ID de PROPIEDAD de GA4 (solo dígitos), no el ID de medición G-XXXX.';
COMMENT ON COLUMN seo_projects.gsc_site_url     IS 'Propiedad de Search Console exacta: sc-domain:dominio.com o https://…/ (con barra final).';
COMMENT ON TABLE  seo_projects IS 'Sitios que se monitorizan en Search Console y GA4 con UNA cuenta de servicio de solo lectura, vía Workload Identity Federation (sin clave JSON).';

-- ── 2) Resumen de búsquedas con fuente propia ──────────────────
-- Mover las filas viejas que no chocan con otra 'gsc_queries' de la misma fecha.
UPDATE seo_metrics m
   SET source = 'gsc_queries'
 WHERE m.source = 'gsc'
   AND m.payload->>'kind' = 'top_queries'
   AND NOT EXISTS (
     SELECT 1 FROM seo_metrics q
      WHERE q.project_id = m.project_id AND q.source = 'gsc_queries' AND q.metric_date = m.metric_date
   );
-- Las que quedan (duplicadas) sobran: el resumen nuevo ya existe.
DELETE FROM seo_metrics WHERE source = 'gsc' AND payload->>'kind' = 'top_queries';

-- ── 3) Fuentes válidas ─────────────────────────────────────────
ALTER TABLE seo_metrics DROP CONSTRAINT IF EXISTS seo_metrics_source_check;
ALTER TABLE seo_metrics ADD CONSTRAINT seo_metrics_source_check
  CHECK (source IN ('gsc', 'ga4', 'indexation', 'gsc_queries'));

COMMENT ON COLUMN seo_metrics.source IS 'gsc (diario de Search Console) | ga4 (diario de Analytics) | indexation (foto de indexación) | gsc_queries (resumen de búsquedas del rango).';

COMMIT;
