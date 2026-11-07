-- ════════════════════════════════════════════════════════════════
--  MARCYAN — migration 019: citas que agenda Marcy (y las del dueño)
--  (plan "Marcy con todo el potencial": agendar, 2026-11-07)
--
--  Una fila por cita de 30 min. El horario de atención y los huecos libres
--  los calcula lib/appointments.mjs (hora de Houston). El índice único
--  parcial impide dos citas activas a la misma hora aunque dos visitantes
--  pulsen a la vez: la segunda recibe "hueco ocupado".
--  Los datos de contacto llegan del formulario del chat, nunca del modelo.
--  El lead se guarda ANTES que la cita (lead_ref): si la cita falla, el
--  contacto no se pierde.
--
--  Idempotente: IF NOT EXISTS. Advisory lock propio (91123779, libre).
--  Aplicar A MANO en Neon (como 002-018).
-- ════════════════════════════════════════════════════════════════

BEGIN;
SELECT pg_advisory_xact_lock(91123779);

CREATE TABLE IF NOT EXISTS appointments (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  starts_at     TIMESTAMPTZ NOT NULL,
  duration_min  INT         NOT NULL DEFAULT 30,
  status        TEXT        NOT NULL DEFAULT 'pendiente',  -- pendiente | hecha | cancelada | no_vino
  source        TEXT        NOT NULL DEFAULT 'marcy',      -- marcy | manual
  env           TEXT        NOT NULL DEFAULT 'production',
  name          TEXT,
  email         TEXT,
  phone         TEXT,
  topic         TEXT,                                      -- lo que necesita, en sus palabras
  lang          TEXT        NOT NULL DEFAULT 'es',
  lead_ref      TEXT,
  chat_sid      TEXT,
  notes         TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS appointments_slot_unique
  ON appointments (env, starts_at) WHERE status <> 'cancelada';
CREATE INDEX IF NOT EXISTS appointments_starts_idx ON appointments (env, starts_at);

COMMIT;
