-- ════════════════════════════════════════════════════════════════
--  032 · Propuestas unidas a un brief (tanda 2 de Ventas, petición de ChatBot por Bases y
--  Estructura, 2026-11-20). Número dado por Bases y Estructura: la 030 es de Orbit fase 2
--  y la 031 de ChatBot.
--  Quien se decide en el chat de Marcy va directo al brief (MRC-…), sin contacto: su
--  cotización se guarda unida al brief. «Brief y contacto no se fusionan» sigue en pie.
--  Se aplica A MANO y solo con OK del dueño:
--    node --env-file=.env.local scripts/apply-migration.mjs 032_propuestas_brief.sql            (solo mira)
--    node --env-file=.env.local scripts/apply-migration.mjs 032_propuestas_brief.sql --apply    (aplica)
--  Solo AÑADE: una columna, su relación y su índice. Idempotente.
-- ════════════════════════════════════════════════════════════════

ALTER TABLE proposals ADD COLUMN IF NOT EXISTS brief_ref TEXT;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proposals_brief_ref_fk') THEN
    ALTER TABLE proposals ADD CONSTRAINT proposals_brief_ref_fk
      FOREIGN KEY (brief_ref) REFERENCES briefs(project_id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_proposals_brief ON proposals(brief_ref);
