-- ════════════════════════════════════════════════════════════════
--  MARCYAN — migration 016: cola de reintento de archivos del brief (revisión R4)
--
--  La política de privacidad dice que lo que el cliente quita se borra al
--  recibir el formulario o el kit. Si en ese momento el almacén de archivos
--  falla (o la conciliación entera falla después de cerrar el borrador), el
--  borrador queda en esta cola y el cron diario (api/cron/brief-cleanup.mjs)
--  lo vuelve a conciliar: enlaza lo que el cliente dejó y borra lo que quitó.
--
--  1) brief_drafts.sweep_at   → NULL = nada pendiente; con fecha = en la cola.
--  2) brief_drafts.sweep_meta → lo que mandó el navegador al enviar (rutas,
--     etiquetas y lo quitado), para repetir la conciliación igual.
--  3) Índice parcial de la cola.
--
--  Idempotente: IF NOT EXISTS en todo; se puede correr varias veces.
--  Advisory lock propio (91123776, libre: ninguna otra migración lo usa)
--  para que dos ejecuciones simultáneas no se pisen.
--  Aplicar A MANO en Neon (como 002-015), después de la 010. La app funciona
--  sin ella: si las columnas no existen, el fallo se registra en el log como
--  hasta ahora y el cron se salta este paso.
-- ════════════════════════════════════════════════════════════════

BEGIN;
SELECT pg_advisory_xact_lock(91123776);

ALTER TABLE brief_drafts ADD COLUMN IF NOT EXISTS sweep_at   TIMESTAMPTZ;
ALTER TABLE brief_drafts ADD COLUMN IF NOT EXISTS sweep_meta JSONB;

CREATE INDEX IF NOT EXISTS brief_drafts_sweep_idx ON brief_drafts (sweep_at) WHERE sweep_at IS NOT NULL;

COMMIT;
