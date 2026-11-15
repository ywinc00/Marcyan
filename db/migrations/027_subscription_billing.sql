-- 027 · Suscripciones que no cobran siempre lo mismo (pedido del dueño 2026-11-15).
-- Solo AÑADE columnas; no cambia ni borra nada de lo que hay.
--
--  billing            'fixed'    = cobra siempre el mismo monto (lo de antes).
--                     'variable' = el monto cambia cada mes (Vercel, Supabase…): el cron
--                                  apunta el cargo como «por confirmar» con el último
--                                  monto real, y la factura de verdad lo sustituye.
--  intro_amount_cents Precio de entrada (meses gratis = 0 o precio rebajado)…
--  intro_until        …hasta esta fecha (sin incluir). Desde ahí, el precio normal.
--
-- La baja (ended_at) y el alta (started_at) ya existían (migración 025): una suscripción
-- cancelada deja de generar cargos desde su baja; reactivarla abre un alta nueva.
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS billing TEXT NOT NULL DEFAULT 'fixed';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_billing_check') THEN
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_billing_check CHECK (billing IN ('fixed', 'variable'));
  END IF;
END $$;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS intro_amount_cents BIGINT;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_intro_amount_check') THEN
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_intro_amount_check CHECK (intro_amount_cents IS NULL OR intro_amount_cents >= 0);
  END IF;
END $$;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS intro_until DATE;
