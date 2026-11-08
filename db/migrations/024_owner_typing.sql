-- ════════════════════════════════════════════════════════════════
--  MARCYAN — migration 024: "escribiendo…" del dueño (2026-11-08)
--
--  chat_conversations.owner_typing_at  última vez que el dueño tecleó en el
--  cuadro de Orbit con la conversación tomada. El chat de la web enseña los
--  tres puntos mientras sea reciente (6 s); en WhatsApp e Instagram se manda
--  el indicador nativo del canal.
--  Idempotente. Advisory lock propio (91123784, libre). Aplicar A MANO.
--  Sin ella todo funciona igual, solo que sin los tres puntos.
-- ════════════════════════════════════════════════════════════════

BEGIN;
SELECT pg_advisory_xact_lock(91123784);
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS owner_typing_at TIMESTAMPTZ;
COMMIT;
