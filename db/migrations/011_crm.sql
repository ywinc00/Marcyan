-- ════════════════════════════════════════════════════════════════
--  MARCYAN — migration 011: CRM (leads ↔ clientes ↔ briefs, Orbit v2 · A2)
--
--  1) leads: rastro de la conversión y notas internas.
--       converted_client_id → cliente al que se convirtió (SET NULL si el cliente se borra)
--       converted_at        → cuándo se convirtió de verdad
--       notes               → notas internas del dueño (nunca se envían al cliente)
--       page_url            → página del sitio desde la que llegó (opcional; la llena
--                             createLead cuando el formulario o el chat la mandan)
--     converted_brief_id ya existía (003) y pasa a escribirse; gana FK a
--     briefs(project_id) con SET NULL (solo si no hay huérfanos, DM-01).
--  2) clients.source_lead_id: el lead de origen (como source_brief_id para briefs).
--     FK a leads(ref_id) con SET NULL: borrar un lead nunca borra un cliente.
--  3) lead_events: historial de la ficha del lead (estado, conversión, notas).
--     Gemelo de brief_events (002); se borra en cascada con el lead.
--  4) Índices para detectar clientes duplicados por correo (sin mayúsculas)
--     y por teléfono, y para listar los leads de un cliente.
--
--  Idempotente: IF NOT EXISTS en todo; se puede correr varias veces.
--  Advisory lock propio (91123770, libre: ≠ 91123745 briefs, ≠ 91123746 leads,
--  ≠ 91123747 diagnósticos, ≠ 91123750-53 finanzas/hitos, ≠ 91123760 brief v2).
--  Aplicar A MANO en Neon (como 002-010). La app funciona sin ella: la lista
--  de leads y la de clientes siguen igual; convertir, las notas y el
--  historial responden "falta la actualización de la base de datos".
-- ════════════════════════════════════════════════════════════════

BEGIN;
SELECT pg_advisory_xact_lock(91123770);

-- ── 1) leads ──────────────────────────────────────────────────
ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_client_id BIGINT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_at        TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes               TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS page_url            TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_converted_client_fk') THEN
    ALTER TABLE leads ADD CONSTRAINT leads_converted_client_fk
      FOREIGN KEY (converted_client_id) REFERENCES clients(id) ON DELETE SET NULL;
  END IF;
END $$;

-- converted_brief_id → briefs(project_id) (revisión final DM-01): al borrar el
-- brief el lead se desvincula solo, y un folio MRC reutilizado (next_project_id
-- es MAX+1) nunca queda pegado a un lead ajeno. Solo se añade si no hay
-- valores huérfanos: no se toca ningún dato existente; si los hubiera, se avisa
-- y se deja sin clave (el DELETE del brief limpia igual el enlace por código).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'leads_converted_brief_fk') THEN
    IF EXISTS (
      SELECT 1 FROM leads l
       WHERE l.converted_brief_id IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM briefs b WHERE b.project_id = l.converted_brief_id)
    ) THEN
      RAISE NOTICE 'leads_converted_brief_fk no se creó: hay leads con converted_brief_id sin brief. Revisarlos a mano.';
    ELSE
      ALTER TABLE leads ADD CONSTRAINT leads_converted_brief_fk
        FOREIGN KEY (converted_brief_id) REFERENCES briefs(project_id) ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leads_converted_client ON leads(converted_client_id)
  WHERE converted_client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_converted_brief ON leads(converted_brief_id)
  WHERE converted_brief_id IS NOT NULL;

-- ── 2) clients.source_lead_id ─────────────────────────────────
ALTER TABLE clients ADD COLUMN IF NOT EXISTS source_lead_id TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_source_lead_fk') THEN
    ALTER TABLE clients ADD CONSTRAINT clients_source_lead_fk
      FOREIGN KEY (source_lead_id) REFERENCES leads(ref_id) ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_clients_source_lead  ON clients(source_lead_id) WHERE source_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_source_brief ON clients(source_brief_id) WHERE source_brief_id IS NOT NULL;
-- Duplicados: correo sin mayúsculas y teléfono por sus 10 últimos dígitos
-- ("(713) 555-0118" = "+1 713 555 0118"). Misma expresión que lib/finance.mjs.
CREATE INDEX IF NOT EXISTS idx_clients_email_lower  ON clients (LOWER(email)) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_clients_phone_digits ON clients (RIGHT(REGEXP_REPLACE(phone, '\D', '', 'g'), 10)) WHERE phone IS NOT NULL;

-- ── 3) lead_events ────────────────────────────────────────────
-- event_type: status_changed | converted_to_client | converted_to_brief | note_updated
CREATE TABLE IF NOT EXISTS lead_events (
  id           BIGSERIAL PRIMARY KEY,
  lead_ref     TEXT NOT NULL REFERENCES leads(ref_id) ON DELETE CASCADE ON UPDATE CASCADE,
  event_type   TEXT NOT NULL,
  actor_email  TEXT,                       -- NULL = sistema
  data         JSONB,                      -- { from, to } · { client_code } · { project_id } …
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lead_events_ref ON lead_events(lead_ref, created_at DESC);

COMMIT;
