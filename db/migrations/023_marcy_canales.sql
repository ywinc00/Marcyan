-- ════════════════════════════════════════════════════════════════
--  MARCYAN — migration 023: Marcy en WhatsApp, Instagram y teléfono
--  (plan "Marcy con todo el potencial", fases 3, 4 y 6, 2026-11-07)
--
--  channel_inbox      cada mensaje que entra por un canal externo se guarda
--                     ANTES de procesarlo (puerta técnica punto 2). La clave
--                     única (channel, provider_id) hace que los reintentos de
--                     Meta o Twilio no dupliquen respuestas. Si la IA falla,
--                     queda 'pendiente' y la tarea /api/cron/canales lo reintenta.
--  chat_conversations + contact (número E.164 o id de Instagram) y nombre de
--                     perfil, para enlazar con la ficha y para que el dueño
--                     conteste desde Orbit ("Tomo yo") por el mismo canal.
--  site_speed         medición de velocidad de Google (PageSpeed) que corre en
--                     segundo plano tras "revisar_sitio"; Marcy la recibe en el
--                     siguiente turno de esa conversación.
--
--  Borrado: channel_inbox cae con sus conversaciones a los 12 meses (tarea
--  diaria brief-cleanup); site_speed a los 30 días.
--  Idempotente. Advisory lock propio (91123783, libre). Aplicar A MANO en Neon.
--  La app funciona sin ella: los canales responden 200 a Meta/Twilio y avisan.
-- ════════════════════════════════════════════════════════════════

BEGIN;
SELECT pg_advisory_xact_lock(91123783);

ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS contact TEXT;
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS contact_name TEXT;
CREATE INDEX IF NOT EXISTS chat_conversations_contact_idx ON chat_conversations (channel, contact);

CREATE TABLE IF NOT EXISTS channel_inbox (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  channel       TEXT        NOT NULL,                  -- whatsapp | instagram | telefono
  provider_id   TEXT        NOT NULL,                  -- id del mensaje en Meta / CallSid+turno en Twilio
  sid           TEXT        NOT NULL,
  contact       TEXT        NOT NULL,
  text          TEXT        NOT NULL DEFAULT '',
  kind          TEXT        NOT NULL DEFAULT 'text',   -- text | audio | image | otro
  received_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status        TEXT        NOT NULL DEFAULT 'pendiente', -- pendiente | hecho | error | omitido
  attempts      INT         NOT NULL DEFAULT 0,
  last_error    TEXT,
  processed_at  TIMESTAMPTZ,
  UNIQUE (channel, provider_id)
);
CREATE INDEX IF NOT EXISTS channel_inbox_pending_idx ON channel_inbox (status, received_at) WHERE status = 'pendiente';

CREATE TABLE IF NOT EXISTS site_speed (
  sid          TEXT        PRIMARY KEY,
  url          TEXT        NOT NULL,
  result       JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);

COMMIT;
