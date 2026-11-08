-- ════════════════════════════════════════════════════════════════
--  MARCYAN — migration 018: conversaciones de Marcy para Orbit
--  (plan "Marcy con todo el potencial", fase 2, 2026-11-07)
--
--  Para que el dueño vea a Marcy en vivo, el historial con su resultado
--  (cerrada · no cerrada · transferida · abandonada) y dónde falló, y así
--  mejorarla y alimentar la batería de pruebas.
--
--  chat_conversations  una fila por conversación (id de sesión del widget).
--  chat_turns          una fila por turno: lo que escribió el visitante y lo
--                      que vio como respuesta (ya filtrada), la acción mostrada,
--                      la herramienta interna usada y las cifras cortadas.
--  Sin IP ni agente de usuario. Los datos de contacto NO pasan por aquí: van
--  del formulario a /api/contact|brief|handoff, que solo anotan aquí la
--  referencia del lead (lead_ref).
--
--  El resultado y el "dónde falló" se calculan al leer (lib/chat-log.mjs),
--  no se guardan: así cambiar el criterio no exige reescribir filas.
--  Borrado: las conversaciones sin actividad en 12 meses las borra la tarea
--  diaria /api/cron/brief-cleanup (purgeOldConversations).
--
--  Idempotente: IF NOT EXISTS; se puede correr varias veces.
--  Advisory lock propio (91123778, libre).
--  Aplicar A MANO en Neon (como 002-017). La app funciona sin ella: si las
--  tablas no existen, el chat sigue y solo deja un aviso en el registro.
-- ════════════════════════════════════════════════════════════════

BEGIN;
SELECT pg_advisory_xact_lock(91123778);

CREATE TABLE IF NOT EXISTS chat_conversations (
  sid             TEXT PRIMARY KEY,
  env             TEXT        NOT NULL,                 -- production | preview | development
  channel         TEXT        NOT NULL DEFAULT 'web',   -- web | telefono | whatsapp | instagram | correo
  lang            TEXT        NOT NULL DEFAULT 'es',
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  turns           INT         NOT NULL DEFAULT 0,
  cost_micro_usd  BIGINT      NOT NULL DEFAULT 0,
  lead_ref        TEXT,                                 -- LEAD-XXX / MRC-XXX si dejó contacto
  lead_kind       TEXT                                  -- lead | brief | handoff
);
CREATE INDEX IF NOT EXISTS chat_conversations_last_idx ON chat_conversations (env, last_at DESC);

CREATE TABLE IF NOT EXISTS chat_turns (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sid             TEXT        NOT NULL REFERENCES chat_conversations(sid) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_text       TEXT        NOT NULL,
  reply           TEXT        NOT NULL,
  action_type     TEXT,                                 -- capture | channels | link
  action_destino  TEXT,                                 -- contacto | proyecto | persona (captura)
  tool            TEXT,                                 -- herramienta interna usada en el turno
  cortadas        TEXT,                                 -- cifras que cortó el filtro de precios
  fallback        BOOLEAN     NOT NULL DEFAULT FALSE,   -- respuesta genérica por error o cifra cortada
  cost_micro_usd  BIGINT      NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS chat_turns_sid_idx ON chat_turns (sid, id);

COMMIT;
