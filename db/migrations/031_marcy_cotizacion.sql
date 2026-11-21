-- ════════════════════════════════════════════════════════════════
--  MARCYAN — migration 031: la cotización de Marcy, en su conversación (Ventas §4, 2026-11-20)
--
--  Marcy da la cotización (tres opciones con planes y paquetes) ANTES de tener el
--  contacto: los datos llegan después, en la cajita. La última cotización queda en
--  la conversación y, cuando la conversación tiene lead (LEAD-…), pasa a Orbit como
--  propuesta en borrador (lib/marcy-quote.mjs → saveProposal de lib/proposals.mjs).
--
--  quote     ids de plan, servicio y añadido de cada opción con el precio que Marcy
--            dijo (en centavos, para que la propuesta sea la misma), la recomendada, lo
--            que le vale un cliente y una clave para no duplicar. saveProposal vuelve a
--            comprobar cada precio con la lista de la base al guardar.
--  quote_at  cuándo se dio.
--  quote_proposal  la propuesta de Orbit en que se guardó (PROP-…); vacía = pendiente,
--            la tarea de cada 5 min (api/cron/canales) la reintenta hasta 30 días.
--
--  Idempotente. Advisory lock propio (91123785). Aplicar A MANO y solo con OK del dueño.
--  Sin ella el chat funciona igual: solo no guarda la cotización.
-- ════════════════════════════════════════════════════════════════

BEGIN;
SELECT pg_advisory_xact_lock(91123785);
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS quote JSONB;
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS quote_at TIMESTAMPTZ;
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS quote_proposal TEXT;
COMMIT;
