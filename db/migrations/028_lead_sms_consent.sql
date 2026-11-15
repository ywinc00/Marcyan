-- 028 · Casilla de SMS y WhatsApp guardada con el lead (encargo legal 2026-11-15 §2b).
-- Se aplica A MANO y solo con OK del dueño. Hasta entonces el alta guarda la misma prueba en
-- leads.notes (lib/leads.mjs), así que aplicarla no es urgente ni rompe nada.
-- sms_consent: true = marcó la casilla; false = la vio y no la marcó; NULL = el formulario no la enseñaba.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sms_consent      BOOLEAN;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sms_consent_at   TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS sms_consent_text TEXT;
