-- ════════════════════════════════════════════════════════════════
--  MARCYAN — migration 020: Marcy atiende la bandeja de correo
--  (encargo _cerebro/marcyan-web/encargos/2026-11-07-marcy-correo.md)
--
--  mail_items: una fila por correo que Marcy clasificó. gmail_id único =
--  reintentar la pasada nunca duplica ni manda dos acuses.
--  mail_state: el último historyId leído de cada buzón (la pasada sigue
--  desde ahí).
--  Solo se guarda lo necesario para la bandeja de Orbit: remitente, asunto,
--  resumen de una línea y categoría. El cuerpo NO se guarda.
--  Se borra a los 12 meses (cron de limpieza).
--
--  Idempotente: IF NOT EXISTS. Advisory lock propio (91123780, libre).
--  Aplicar A MANO en Neon (como 002-019).
-- ════════════════════════════════════════════════════════════════

BEGIN;
SELECT pg_advisory_xact_lock(91123780);

CREATE TABLE IF NOT EXISTS mail_items (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mailbox       TEXT        NOT NULL,
  gmail_id      TEXT        NOT NULL,
  thread_id     TEXT        NOT NULL,
  received_at   TIMESTAMPTZ,
  from_email    TEXT,
  from_name     TEXT,
  subject       TEXT,
  category      TEXT        NOT NULL,            -- cliente | oportunidad | importante | facturas | boletines | spam
  urgent        BOOLEAN     NOT NULL DEFAULT FALSE,
  summary       TEXT,
  lang          TEXT,
  lead_ref      TEXT,
  draft_id      TEXT,
  acked_at      TIMESTAMPTZ,
  status        TEXT        NOT NULL DEFAULT 'nuevo',  -- nuevo | visto | respondido | archivado
  model_cost_usd NUMERIC(10,5) NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS mail_items_gmail_uq ON mail_items (mailbox, gmail_id);
CREATE INDEX IF NOT EXISTS mail_items_recent_idx ON mail_items (received_at DESC);
CREATE INDEX IF NOT EXISTS mail_items_thread_idx ON mail_items (mailbox, thread_id);

CREATE TABLE IF NOT EXISTS mail_state (
  mailbox     TEXT PRIMARY KEY,
  history_id  TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error  TEXT
);

COMMIT;
