-- ════════════════════════════════════════════════════════════════
--  MARCYAN — migration 015: avisos archivables + enlaces y títulos viejos (Orbit A7)
--
--  1) notifications.archived_at → archivar un aviso (sale de la bandeja y
--     del contador; se puede desarchivar). NULL = en la bandeja.
--  2) Índice parcial para la bandeja (no archivados, más nuevos primero).
--  3) Avisos viejos: la url '/dashboard' a secas pasa al enlace profundo
--     según type+ref (la lectura ya lo calculaba; esto lo deja guardado).
--  4) Títulos viejos con guion largo ("Nuevo brief — Acme") pasan a coma
--     ("Nuevo brief, Acme"), igual que hace lib/notifications.mjs con los nuevos.
--
--  Idempotente: IF NOT EXISTS y UPDATE con WHERE que solo toca lo pendiente;
--  se puede correr varias veces.
--  Advisory lock propio (91123775, libre: ≠ 91123745-47, ≠ 91123750-53,
--  ≠ 91123760) para que dos ejecuciones simultáneas no se pisen.
--  Aplicar A MANO en Neon (como 002-010). La app funciona sin ella: si la
--  columna no existe, la bandeja se lista igual y "Archivar" responde que
--  todavía no está disponible.
-- ════════════════════════════════════════════════════════════════

BEGIN;
SELECT pg_advisory_xact_lock(91123775);

-- ── 1) Archivado ──────────────────────────────────────────────
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- ── 2) Índice de la bandeja (no archivados) ───────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_inbox
  ON notifications (created_at DESC, id DESC)
  WHERE archived_at IS NULL;

-- Contador de no leídos de la barra lateral (?countOnly=1).
CREATE INDEX IF NOT EXISTS idx_notifications_unread_inbox
  ON notifications (id)
  WHERE read_at IS NULL AND archived_at IS NULL;

-- ── 3) Enlaces profundos de los avisos viejos ─────────────────
UPDATE notifications
   SET url = '/dashboard#/leads/' || ref
 WHERE (url IS NULL OR url = '/dashboard')
   AND ref ~ '^LEAD-[A-Za-z0-9-]+$';

UPDATE notifications
   SET url = '/dashboard#/briefs/' || ref
 WHERE (url IS NULL OR url = '/dashboard')
   AND ref ~ '^MRC-[A-Za-z0-9-]+$';

-- ── 4) Títulos sin guion largo de conector ────────────────────
UPDATE notifications
   SET title = regexp_replace(title, '\s*[—–]\s*', ', ', 'g')
 WHERE title ~ '[—–]';

COMMIT;
