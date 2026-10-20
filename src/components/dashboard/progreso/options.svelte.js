// ─────────────────────────────────────────────────────────────
// Progreso · lista de briefs para sugerir el código en el formulario del
// proyecto (OP-09). Se carga una vez al abrir el formulario y se puede
// recargar. El cliente se elige con el selector único del panel
// (crm/ClientPicker, integración CRM), que busca en el servidor.
// ─────────────────────────────────────────────────────────────
import { api, errorMessage, isSessionError } from '../lib/api.js';

export const opts = $state({
  briefs: [],
  // false si la lista de briefs vino recortada (tope de 200 del servidor):
  // entonces un código que no aparece puede existir y lo decide el servidor.
  briefsComplete: true,
  loading: false, loaded: false, error: '',
});

let inflight = null;

export function loadOptions({ force = false } = {}) {
  if (inflight) return inflight;
  if (opts.loaded && !force) return Promise.resolve();
  opts.loading = true; opts.error = '';
  inflight = (async () => {
    try {
      const b = await api('/api/admin/briefs?limit=200');
      opts.briefs = b.rows || [];
      opts.briefsComplete = b.total == null ? opts.briefs.length < 200 : Number(b.total) <= opts.briefs.length;
      opts.loaded = true;
    } catch (e) {
      if (!isSessionError(e)) opts.error = errorMessage(e, 'No se pudo cargar la lista de briefs.');
    } finally {
      opts.loading = false;
      inflight = null;
    }
  })();
  return inflight;
}
