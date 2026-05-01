-- ════════════════════════════════════════════════════════════════
--  MARCYAN — migration 002: panel admin
--  Tablas: admin_magic_tokens, admin_sessions, brief_events
--  Idempotente: usa IF NOT EXISTS, se puede correr múltiples veces.
-- ════════════════════════════════════════════════════════════════

-- ── 1) Tokens de magic link (de un solo uso, TTL ~15 min) ─────
CREATE TABLE IF NOT EXISTS admin_magic_tokens (
  id          BIGSERIAL PRIMARY KEY,
  email       TEXT NOT NULL,
  token       TEXT UNIQUE NOT NULL,        -- opaco, ~64 chars random
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,                 -- NULL si aún no se usó
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_amt_token   ON admin_magic_tokens(token);
CREATE INDEX IF NOT EXISTS idx_amt_email   ON admin_magic_tokens(email);
CREATE INDEX IF NOT EXISTS idx_amt_expires ON admin_magic_tokens(expires_at);


-- ── 2) Sesiones del admin (cookie HttpOnly mapea aquí) ────────
CREATE TABLE IF NOT EXISTS admin_sessions (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT NOT NULL,
  session_id    TEXT UNIQUE NOT NULL,      -- opaco, ~64 chars random
  expires_at    TIMESTAMPTZ NOT NULL,      -- por defecto +30 días
  ip_address    TEXT,
  user_agent    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at    TIMESTAMPTZ                -- NULL si activa
);

CREATE INDEX IF NOT EXISTS idx_as_session_id ON admin_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_as_email      ON admin_sessions(email);
CREATE INDEX IF NOT EXISTS idx_as_expires    ON admin_sessions(expires_at);


-- ── 3) Audit log de eventos sobre briefs ──────────────────────
-- event_type: brief_received | status_changed | summary_updated
--             | email_sent_to_client | note
CREATE TABLE IF NOT EXISTS brief_events (
  id           BIGSERIAL PRIMARY KEY,
  project_id   TEXT NOT NULL,
  event_type   TEXT NOT NULL,
  actor_email  TEXT,                       -- NULL = sistema (form submit, cron, etc.)
  data         JSONB,                      -- { old_status, new_status, subject, ... }
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_brief_events_brief
    FOREIGN KEY (project_id) REFERENCES briefs(project_id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_be_project_created
  ON brief_events(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_be_event_type
  ON brief_events(event_type);


-- ── 4) Helper: limpieza de tokens y sesiones expiradas ────────
-- Llamarla periódicamente (manual o cron). Es opcional pero
-- mantiene las tablas limpias.
CREATE OR REPLACE FUNCTION admin_cleanup_expired()
RETURNS TABLE(deleted_tokens INT, deleted_sessions INT) AS $$
DECLARE
  t INT;
  s INT;
BEGIN
  WITH d AS (
    DELETE FROM admin_magic_tokens
     WHERE expires_at < NOW() - INTERVAL '7 days'
        OR used_at    < NOW() - INTERVAL '7 days'
    RETURNING 1
  ) SELECT COUNT(*) INTO t FROM d;

  WITH d AS (
    DELETE FROM admin_sessions
     WHERE expires_at < NOW()
        OR revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '30 days'
    RETURNING 1
  ) SELECT COUNT(*) INTO s FROM d;

  RETURN QUERY SELECT t, s;
END;
$$ LANGUAGE plpgsql;
