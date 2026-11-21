-- ════════════════════════════════════════════════════════════════
--  029 · Ventas por etapas y propuestas (Ventas §1, fase 1).
--  Plan: docs/orbit/plan-ventas-orbit.md
--  Se aplica A MANO y solo con OK del dueño:
--    node --env-file=.env.local scripts/apply-migration.mjs 029_ventas_embudo.sql            (solo mira)
--    node --env-file=.env.local scripts/apply-migration.mjs 029_ventas_embudo.sql --apply    (aplica)
--  Solo AÑADE: columnas, dos tablas y una función. No cambia ni borra nada de lo que hay.
--  Idempotente: se puede correr más de una vez.
--
--  1) leads: etapas nuevas del embudo. El campo `status` ya es texto libre; se le pone
--     una regla con los valores válidos SIN revisar las filas viejas (NOT VALID), para que
--     aplicar nunca falle por un dato antiguo.
--       new · contacted · diagnosed (diagnóstico hecho) · proposal (propuesta enviada)
--       · converted («ganado»: pasó a cliente) · lost (perdido, con motivo) · archived
--       · test · spam (aparte, como hasta ahora)
--     Motivo de «perdido»: price · competitor · timing · no_reply · not_fit, con nota opcional.
--     stage_changed_at: cuándo entró en su etapa (la cola «Para hoy» y los días en etapa).
--  2) proposals: la propuesta escrita, unida al contacto o al cliente. Guarda sus
--     opciones con los precios TAL CUAL se propusieron (en centavos), cuál se recomendó y
--     cuál eligió, caducidad (14 días) y seguimientos (días 2, 5 y 10). Quién la hizo:
--     orbit · marcy · diagnostic. (created_by, source_ref) es único: si Marcy o el
--     Diagnóstico reintentan, no se duplica.
--  3) sales_catalog: copia privada del catálogo de Ventas (precios internos). El repo es
--     público, así que esos precios viven aquí y no en el código.
-- ════════════════════════════════════════════════════════════════

-- ── 1) Etapas del embudo en leads ─────────────────────────────────
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lost_reason      TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS lost_note        TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS stage_changed_at TIMESTAMPTZ;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_status_check') THEN
    ALTER TABLE leads ADD CONSTRAINT leads_status_check
      CHECK (status IN ('new', 'contacted', 'diagnosed', 'proposal', 'converted', 'lost', 'archived', 'test', 'spam'))
      NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_lost_reason_check') THEN
    ALTER TABLE leads ADD CONSTRAINT leads_lost_reason_check
      CHECK (lost_reason IS NULL OR lost_reason IN ('price', 'competitor', 'timing', 'no_reply', 'not_fit'));
  END IF;
END $$;

-- ── 2) Propuestas ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS proposals (
  id                 BIGSERIAL PRIMARY KEY,
  ref_id             TEXT UNIQUE NOT NULL,                 -- PROP-001, PROP-002 …
  lead_ref           TEXT REFERENCES leads(ref_id) ON DELETE SET NULL ON UPDATE CASCADE,
  client_id          BIGINT REFERENCES clients(id) ON DELETE SET NULL,
  status             TEXT NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired')),
  created_by         TEXT NOT NULL DEFAULT 'orbit' CHECK (created_by IN ('orbit', 'marcy', 'diagnostic')),
  source_ref         TEXT,                                 -- id de la conversación o del diagnóstico
  actor_email        TEXT,                                 -- quién la hizo en Orbit
  catalog_version    TEXT NOT NULL,                        -- versión del catálogo con que se preció
  options            JSONB NOT NULL,                       -- 1 a 3 opciones, precios en centavos
  recommended_option SMALLINT,                             -- posición (0, 1, 2) de la recomendada
  chosen_option      SMALLINT,                             -- la que eligió el cliente
  client_value_cents BIGINT CHECK (client_value_cents IS NULL OR client_value_cents > 0),
  sent_at            TIMESTAMPTZ,
  expires_on         DATE,                                 -- día de envío (Houston) + 14
  follow_ups_done    SMALLINT NOT NULL DEFAULT 0 CHECK (follow_ups_done >= 0),
  next_follow_up_on  DATE,                                 -- próximo seguimiento; NULL si no queda
  decided_at         TIMESTAMPTZ,
  decision_note      TEXT,
  notes              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposals_lead      ON proposals(lead_ref);
CREATE INDEX IF NOT EXISTS idx_proposals_client    ON proposals(client_id);
CREATE INDEX IF NOT EXISTS idx_proposals_follow_up ON proposals(status, next_follow_up_on);
CREATE INDEX IF NOT EXISTS idx_proposals_expires   ON proposals(status, expires_on);
CREATE UNIQUE INDEX IF NOT EXISTS uq_proposals_source
  ON proposals(created_by, source_ref) WHERE source_ref IS NOT NULL;

CREATE OR REPLACE FUNCTION proposals_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proposals_updated_at ON proposals;
CREATE TRIGGER trg_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW EXECUTE FUNCTION proposals_set_updated_at();

-- Folio PROP-XXX, con candado para que dos altas a la vez no se lleven el mismo.
CREATE OR REPLACE FUNCTION next_proposal_id()
RETURNS TEXT AS $$
DECLARE
  next_num INT;
BEGIN
  PERFORM pg_advisory_xact_lock(91123790);
  SELECT COALESCE(MAX(CAST(SUBSTRING(ref_id FROM 6) AS INTEGER)), 0) + 1
    INTO next_num
    FROM proposals
   WHERE ref_id ~ '^PROP-[0-9]+$';
  RETURN 'PROP-' || LPAD(next_num::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- ── 3) Catálogo privado ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales_catalog (
  version    TEXT PRIMARY KEY,                             -- la `version` del catálogo
  body       JSONB NOT NULL,                               -- el catálogo entero
  loaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
