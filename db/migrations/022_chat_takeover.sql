-- ════════════════════════════════════════════════════════════════
--  MARCYAN — migration 022: "Tomo yo" (el dueño contesta en el chat web)
--  takeover_at: desde cuándo la conversación la lleva el dueño (Marcy calla).
--  NULL = la lleva Marcy. Los mensajes del dueño van a chat_turns con
--  action_type 'dueno'; los del visitante mientras tanto, con 'espera'.
--  Idempotente. Advisory lock propio (91123782, libre). Aplicar A MANO.
-- ════════════════════════════════════════════════════════════════
BEGIN;
SELECT pg_advisory_xact_lock(91123782);
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS takeover_at TIMESTAMPTZ;
ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS takeover_by TEXT;
COMMIT;
