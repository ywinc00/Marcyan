-- ════════════════════════════════════════════════════════════════
--  MARCYAN — migration 010: Brief v2 (dos momentos + archivos + límite de envíos)
--
--  1) briefs: columnas nuevas para el brief v2 y el "Kit de arranque".
--       extra jsonb     → campos nuevos del momento inicial (lib/brief-schema.mjs, storage 'extra')
--       kit jsonb       → campos del kit de arranque (storage 'kit')
--       schema_version  → 1 = brief histórico (formulario v1 y chat) · 2 = brief v2
--       lang, services  → idioma del cliente y servicios del catálogo elegidos
--       kit_token_hash  → SHA-256 del token del enlace del kit (el token NUNCA se guarda en claro)
--       kit_status      → 'none' | 'sent' | 'in_progress' | 'submitted'
--  2) brief_drafts: borrador con secreto (solo su hash) que autoriza subir
--     archivos antes de enviar. Caduca (48 h el brief, 30 días el kit).
--  3) brief_files: metadatos de cada archivo guardado en Vercel Blob privado.
--  4) rate_limit_hits: límite de envíos persistente por ventana fija
--     (clave = HMAC de bucket+IP: la IP no se guarda en claro).
--
--  Idempotente: IF NOT EXISTS en todo; se puede correr varias veces.
--  Advisory lock propio (91123760, libre: ≠ 91123745 briefs, ≠ 91123746
--  leads, ≠ 91123747 diagnósticos, ≠ 91123750-53 finanzas/hitos) para que
--  dos ejecuciones simultáneas no se pisen.
--  Aplicar A MANO en Neon (como 002-009). La app funciona sin ella: el
--  límite de envíos cae a memoria y los briefs v1 siguen entrando igual.
-- ════════════════════════════════════════════════════════════════

BEGIN;
SELECT pg_advisory_xact_lock(91123760);

-- gen_random_uuid() es nativa desde Postgres 13 (Neon usa 15 o superior): sin extensiones.

-- ── 1) briefs: columnas del brief v2 y del kit ────────────────
ALTER TABLE briefs ADD COLUMN IF NOT EXISTS extra            JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE briefs ADD COLUMN IF NOT EXISTS kit              JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE briefs ADD COLUMN IF NOT EXISTS schema_version   INT  NOT NULL DEFAULT 1;
ALTER TABLE briefs ADD COLUMN IF NOT EXISTS lang             TEXT;
ALTER TABLE briefs ADD COLUMN IF NOT EXISTS services         TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE briefs ADD COLUMN IF NOT EXISTS kit_token_hash   TEXT;
ALTER TABLE briefs ADD COLUMN IF NOT EXISTS kit_status       TEXT NOT NULL DEFAULT 'none';
ALTER TABLE briefs ADD COLUMN IF NOT EXISTS kit_sent_at      TIMESTAMPTZ;
ALTER TABLE briefs ADD COLUMN IF NOT EXISTS kit_submitted_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'briefs_kit_status_chk') THEN
    ALTER TABLE briefs ADD CONSTRAINT briefs_kit_status_chk
      CHECK (kit_status IN ('none', 'sent', 'in_progress', 'submitted'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'briefs_lang_chk') THEN
    ALTER TABLE briefs ADD CONSTRAINT briefs_lang_chk
      CHECK (lang IS NULL OR lang IN ('es', 'en'));
  END IF;
END $$;

-- Búsqueda del brief por el hash del token del kit (enlace único).
CREATE UNIQUE INDEX IF NOT EXISTS briefs_kit_token_hash_idx
  ON briefs (kit_token_hash) WHERE kit_token_hash IS NOT NULL;

-- ── 2) Borradores (autorizan las subidas) ─────────────────────
CREATE TABLE IF NOT EXISTS brief_drafts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secret_hash   TEXT NOT NULL,                       -- SHA-256 del secreto; el secreto solo lo tiene el navegador
  purpose       TEXT NOT NULL DEFAULT 'brief'
                CHECK (purpose IN ('brief', 'kit')),
  brief_id      BIGINT REFERENCES briefs(id) ON DELETE SET NULL,  -- kit: desde el inicio · brief: al enviar
  ip            TEXT,                                -- solo para abuso y soporte; se borra con el borrador
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ NOT NULL,
  submitted_at  TIMESTAMPTZ,
  files_count   INT    NOT NULL DEFAULT 0,           -- cupo reservado al emitir cada token de subida
  bytes_total   BIGINT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS brief_drafts_expires_idx ON brief_drafts (expires_at) WHERE submitted_at IS NULL;
CREATE INDEX IF NOT EXISTS brief_drafts_brief_idx   ON brief_drafts (brief_id);

-- ── 3) Archivos (Vercel Blob privado: briefs/<draftId>/<kind>/<nombre>) ──
CREATE TABLE IF NOT EXISTS brief_files (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  draft_id        UUID REFERENCES brief_drafts(id) ON DELETE SET NULL,
  brief_id        BIGINT REFERENCES briefs(id) ON DELETE SET NULL,  -- la API borra los blobs ANTES de borrar el brief
  kind            TEXT NOT NULL CHECK (kind IN ('logo', 'photo', 'doc', 'video', 'legal')),
  pathname        TEXT NOT NULL UNIQUE,
  content_type    TEXT,                              -- tras verificar: el tipo REAL por bytes mágicos
  size            BIGINT,
  sha256          TEXT,
  original_name   TEXT,
  converted_from  TEXT,                              -- p. ej. 'image/heic' si el navegador lo pasó a JPEG
  tags            JSONB NOT NULL DEFAULT '{}'::jsonb, -- field, shot, service, neighborhood, month, origin, stage, variant…
  verified        BOOLEAN,                           -- NULL = pendiente · true = tipo real OK · false = no coincide (blob borrado)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS brief_files_brief_idx ON brief_files (brief_id, created_at);
CREATE INDEX IF NOT EXISTS brief_files_draft_idx ON brief_files (draft_id);
CREATE INDEX IF NOT EXISTS brief_files_pending_idx ON brief_files (created_at) WHERE verified IS NULL;

-- ── 4) Límite de envíos persistente ───────────────────────────
CREATE TABLE IF NOT EXISTS rate_limit_hits (
  bucket        TEXT NOT NULL,                       -- 'brief' | 'contact' | 'login' | 'draft' | 'upload' | 'kit' | 'confirmEmail'
  key_hash      TEXT NOT NULL,                       -- HMAC-SHA256(bucket|ip): nunca la IP en claro
  window_start  TIMESTAMPTZ NOT NULL,
  count         INT NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, key_hash, window_start)
);
CREATE INDEX IF NOT EXISTS rate_limit_hits_window_idx ON rate_limit_hits (window_start);

COMMIT;
