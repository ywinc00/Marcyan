-- ════════════════════════════════════════════════════════════════
--  MARCYAN — migración 026: agente contable de Finanzas (fase 2 del plan)
--  Plan: _cerebro/marcyan-web/encargos/2026-11-14-plan-panel-finanzas.md (fase 2)
--
--  El agente SOLO PROPONE: cada propuesta espera el «Aplicar» del dueño en Orbit.
--  No mueve dinero, no presenta impuestos y no manda nada a nadie.
--
--  SOLO AÑADE tablas nuevas. No toca datos existentes. Idempotente.
--  Se aplica a mano con scripts/apply-migration.mjs y con el OK del dueño.
-- ════════════════════════════════════════════════════════════════

-- ── Cada vez que el agente despierta (cron diario o «Revisar ahora»).
--    Guarda lo que costó para el tope mensual que se fija en Ajustes.
CREATE TABLE IF NOT EXISTS finance_agent_runs (
  id              BIGSERIAL PRIMARY KEY,
  trigger         TEXT NOT NULL CHECK (trigger IN ('cron', 'manual')),
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at     TIMESTAMPTZ,
  status          TEXT NOT NULL DEFAULT 'running'
                  CHECK (status IN ('running', 'done', 'nothing_new', 'skipped', 'failed')),
  model           TEXT,
  events          INTEGER NOT NULL DEFAULT 0,
  proposals       INTEGER NOT NULL DEFAULT 0,
  input_tokens    BIGINT NOT NULL DEFAULT 0,
  output_tokens   BIGINT NOT NULL DEFAULT 0,
  cost_micro_usd  BIGINT NOT NULL DEFAULT 0,
  note            TEXT
);
CREATE INDEX IF NOT EXISTS finance_agent_runs_started_idx ON finance_agent_runs (started_at DESC);
-- Una sola pasada en marcha a la vez (cron y «Revisar ahora» no se pisan).
CREATE UNIQUE INDEX IF NOT EXISTS finance_agent_runs_one_running ON finance_agent_runs ((TRUE)) WHERE status = 'running';

-- ── Lo que el agente propone. Solo el dueño lo aplica o lo descarta.
--    target_ref: a qué se refiere (mail:12, exp:40, inc:7, close:2026-10…). Una sola
--    propuesta pendiente por cosa, y lo descartado no se vuelve a proponer en 60 días.
CREATE TABLE IF NOT EXISTS finance_agent_proposals (
  id           BIGSERIAL PRIMARY KEY,
  run_id       BIGINT REFERENCES finance_agent_runs(id) ON DELETE SET NULL,
  kind         TEXT NOT NULL CHECK (kind IN ('registrar_gasto', 'categorizar', 'descartar_movimiento',
                                             'vincular_suscripcion', 'vincular_cobro', 'aviso')),
  target_ref   TEXT NOT NULL,
  title        TEXT NOT NULL,
  detail       TEXT,
  payload      JSONB NOT NULL DEFAULT '{}'::jsonb,
  status       TEXT NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'applied', 'rejected', 'expired')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at   TIMESTAMPTZ,
  decided_by   TEXT,
  result       JSONB
);
CREATE UNIQUE INDEX IF NOT EXISTS finance_agent_proposals_pending_uq
  ON finance_agent_proposals (target_ref) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS finance_agent_proposals_status_idx ON finance_agent_proposals (status, created_at DESC);

-- ── Bandeja de eventos: lo que el agente ya vio. Solo despierta (y gasta) si hay
--    algo que no está aquí: un correo de factura nuevo, un movimiento por revisar…
CREATE TABLE IF NOT EXISTS finance_agent_seen (
  ref         TEXT PRIMARY KEY,
  run_id      BIGINT REFERENCES finance_agent_runs(id) ON DELETE SET NULL,
  seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Memoria del agente (herramienta de memoria de Anthropic): archivos cortos bajo
--    /memories con lo que aprende de las decisiones del dueño. Sin datos personales.
CREATE TABLE IF NOT EXISTS finance_agent_memory (
  path        TEXT PRIMARY KEY CHECK (path LIKE '/memories/%'),
  content     TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
