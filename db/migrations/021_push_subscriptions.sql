-- ════════════════════════════════════════════════════════════════
--  MARCYAN — migration 021: avisos de Orbit en el móvil y el ordenador
--  Una fila por dispositivo que activó los avisos (suscripción Web Push).
--  endpoint único: activar dos veces en el mismo dispositivo no duplica.
--  Si el navegador da la suscripción por muerta (404/410) se borra sola.
--  Idempotente. Advisory lock propio (91123781, libre). Aplicar A MANO.
-- ════════════════════════════════════════════════════════════════

BEGIN;
SELECT pg_advisory_xact_lock(91123781);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  admin_email TEXT        NOT NULL,
  endpoint    TEXT        NOT NULL UNIQUE,
  p256dh      TEXT        NOT NULL,
  auth        TEXT        NOT NULL,
  device      TEXT,
  last_ok_at  TIMESTAMPTZ,
  fails       INT         NOT NULL DEFAULT 0
);

COMMIT;
