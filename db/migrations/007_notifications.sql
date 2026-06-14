-- ════════════════════════════════════════════════════════════════
--  MARCYAN — migration 007: notifications (bandeja in-dashboard)
--  Bandeja de avisos del fundador. Cada evento relevante del sitio
--  (nuevo lead de contacto/chatbot, nuevo brief de proyecto, o un
--  HANDOFF de chat — un visitante que pidió hablar con un humano)
--  crea una fila aquí. El fundador la ve en el dashboard y responde
--  por WhatsApp/email (no hay chat en vivo).
--  Idempotente: IF NOT EXISTS, se puede correr múltiples veces.
-- ════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notifications (
  id           BIGSERIAL PRIMARY KEY,
  type         TEXT NOT NULL DEFAULT 'system',
               -- new_lead | new_brief | chat_handoff | system
  title        TEXT NOT NULL,
  body         TEXT,
  ref          TEXT,                          -- LEAD-001 / MRC-001 (referencia opcional)
  url          TEXT,                          -- enlace de acción (ej. /dashboard)

  read_at      TIMESTAMPTZ,                   -- NULL = no leída
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice compuesto: la bandeja ordena por created_at DESC y filtra por
-- no-leídas (read_at IS NULL). El índice cubre ambos casos.
CREATE INDEX IF NOT EXISTS idx_notifications_read_created
  ON notifications(read_at, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON notifications(created_at DESC);
