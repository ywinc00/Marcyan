-- ════════════════════════════════════════════════════════════════
--  MARCYAN — migration 017: coste y caché del chat de Marcy por día
--  (encargo P2 del informe de Marcy, 2026-10-31)
--
--  Una fila por día, entorno (production | preview | development) y modelo,
--  con los totales de los turnos del chat: turnos, conversaciones nuevas,
--  llamadas a la IA, tokens (entrada, salida, lectura y escritura de caché)
--  y el coste estimado en micro-dólares con los precios vigentes al anotarlo.
--  SIN contenido, SIN IP, SIN id de conversación: solo números.
--
--  La escribe api/chat.mjs (lib/chat-usage.mjs) con un UPSERT por turno. Es,
--  con el freno (rate_limit_hits), el único contacto del chat con la base.
--  La lee scripts/chat-costes.mjs para el resumen del mes.
--
--  Idempotente: IF NOT EXISTS; se puede correr varias veces.
--  Advisory lock propio (91123777, libre).
--  Aplicar A MANO en Neon (como 002-016). La app funciona sin ella: si la
--  tabla no existe, el turno solo deja su línea en el registro del servidor.
-- ════════════════════════════════════════════════════════════════

BEGIN;
SELECT pg_advisory_xact_lock(91123777);

CREATE TABLE IF NOT EXISTS chat_usage_daily (
  day                 DATE    NOT NULL,
  env                 TEXT    NOT NULL,
  model               TEXT    NOT NULL,
  turns               INT     NOT NULL DEFAULT 0,
  conversations       INT     NOT NULL DEFAULT 0,  -- turnos que abren conversación (1.er mensaje)
  calls               INT     NOT NULL DEFAULT 0,  -- llamadas a la IA (1 o 2 por turno)
  input_tokens        BIGINT  NOT NULL DEFAULT 0,  -- entrada sin caché
  output_tokens       BIGINT  NOT NULL DEFAULT 0,  -- salida (incluye el razonamiento)
  cache_read_tokens   BIGINT  NOT NULL DEFAULT 0,
  cache_write_tokens  BIGINT  NOT NULL DEFAULT 0,
  cost_micro_usd      BIGINT  NOT NULL DEFAULT 0,
  PRIMARY KEY (day, env, model)
);

COMMIT;
