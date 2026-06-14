-- ════════════════════════════════════════════════════════════════
--  MARCYAN — migration 005: project_milestones (hitos por proyecto)
--  La tabla `projects` la define la migración 004 (Finanzas); aquí
--  SÓLO añadimos los hitos (stepper de progreso por proyecto).
--  Cada hito pertenece a un proyecto y tiene un estado del ciclo:
--    pending | in_progress | done
--  El % de avance del proyecto = done / total (calculado en lib).
--  Idempotente: IF NOT EXISTS, se puede correr múltiples veces.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS project_milestones (
  id           BIGSERIAL PRIMARY KEY,
  project_id   BIGINT NOT NULL
               REFERENCES projects(id) ON DELETE CASCADE,

  stage        TEXT,                          -- clave estable: brief|proposal|design|dev|delivery
  label        TEXT NOT NULL,                 -- etiqueta visible (editable)
  status       TEXT NOT NULL DEFAULT 'pending',
               -- pending | in_progress | done
  position     INT  NOT NULL DEFAULT 0,       -- orden dentro del proyecto

  due_date     DATE,                          -- fecha objetivo (opcional)
  done_at      TIMESTAMPTZ,                   -- se setea al pasar a 'done'

  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_milestones_project_position
  ON project_milestones(project_id, position);
CREATE INDEX IF NOT EXISTS idx_milestones_status
  ON project_milestones(status);

-- ── Trigger updated_at ────────────────────────────────────────
-- Copiado del patrón de leads_set_updated_at (migración 003).
CREATE OR REPLACE FUNCTION milestones_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_milestones_updated_at ON project_milestones;
CREATE TRIGGER trg_milestones_updated_at
  BEFORE UPDATE ON project_milestones
  FOR EACH ROW
  EXECUTE FUNCTION milestones_set_updated_at();

-- ── Sembrado de los 5 hitos por defecto de un proyecto ────────
-- brief → propuesta → diseño → desarrollo → entrega.
-- Idempotente por proyecto: usa un advisory lock de CLAVE ÚNICA (91123753)
-- distinta de TODAS las usadas hasta ahora:
--   next_project_id()=91123745  next_lead_id()=91123746
--   next_invoice_id()=91123750  next_client_id()=91123751
--   next_project_code()=91123752  (ver db/migrations/004_finance.sql)
-- y no hace nada si el proyecto ya tiene hitos.
CREATE OR REPLACE FUNCTION seed_default_milestones(p_project_id BIGINT)
RETURNS INT AS $$
DECLARE
  inserted INT := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(91123753);

  IF EXISTS (SELECT 1 FROM project_milestones WHERE project_id = p_project_id) THEN
    RETURN 0;
  END IF;

  INSERT INTO project_milestones (project_id, stage, label, status, position)
  VALUES
    (p_project_id, 'brief',    'Brief',      'pending', 0),
    (p_project_id, 'proposal', 'Propuesta',  'pending', 1),
    (p_project_id, 'design',   'Diseño',     'pending', 2),
    (p_project_id, 'dev',      'Desarrollo', 'pending', 3),
    (p_project_id, 'delivery', 'Entrega',    'pending', 4);

  GET DIAGNOSTICS inserted = ROW_COUNT;
  RETURN inserted;
END;
$$ LANGUAGE plpgsql;
