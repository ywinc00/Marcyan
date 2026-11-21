-- ════════════════════════════════════════════════════════════════
--  MARCYAN — migration 031: la cotización de Marcy, en su conversación (Ventas §4, 2026-11-20)
--
--  Marcy da la cotización (tres opciones con planes y paquetes) ANTES de tener el
--  contacto: los datos llegan después, en la cajita. La última cotización queda en
--  la conversación y, cuando la conversación tiene lead (LEAD-…), pasa a Orbit como
--  propuesta en borrador (lib/marcy-quote.mjs → saveProposal de lib/proposals.mjs).
--
--  quote     lo que pidió Marcy: paquetes u opciones (ids de plan, servicio y añadido),
--            lo que le vale un cliente, si pidió rebaja, el idioma, la versión de la lista
--            y una clave para no duplicar. SIN cifras: el precio se vuelve a poner con la
--            lista de la base al pasarla a Orbit (lib/marcy-quote.mjs).
--  quote_at  cuándo se dio.
--  quote_proposal  la propuesta de Orbit en que se guardó (PROP-…), «descartada» si Orbit
--            la rechazó, o vacía = pendiente: la tarea de cada 5 min (api/cron/canales) la
--            pasa a Orbit cuando hay contacto o brief, hasta 30 días.
--  quote_tries / quote_error  intentos fallidos y el último error (con 20, se avisa).
--
--  Idempotente. Advisory lock propio (91123785). Aplicar A MANO y solo con OK del dueño.
--  Sin ella el chat funciona igual: solo no guarda la cotización.
-- ════════════════════════════════════════════════════════════════

BEGIN;
SELECT pg_advisory_xact_lock(91123785);
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS quote JSONB;
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS quote_at TIMESTAMPTZ;
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS quote_proposal TEXT;
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS quote_tries INT NOT NULL DEFAULT 0;
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS quote_error TEXT;
COMMIT;
