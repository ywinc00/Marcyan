// ─────────────────────────────────────────────────────────────
// Progreso · listas para elegir cliente y brief en el formulario del
// proyecto (CRM-05, OP-09, OP-10). Se cargan una vez al abrir el formulario
// y se pueden recargar. Selector SIMPLE a propósito: A2 construye en
// paralelo un ClientPicker con búsqueda en crm/; cuando exista, este
// selector se sustituye por él (anotado en el contrato de la rama).
// ─────────────────────────────────────────────────────────────
import { api, errorMessage, isSessionError } from '../lib/api.js';

export const opts = $state({
  clients: [], briefs: [],
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
      const [c, b] = await Promise.all([
        api('/api/admin/clients?limit=200'),
        api('/api/admin/briefs?limit=200'),
      ]);
      // Clientes por nombre (más fácil de encontrar en la lista); archivados al final.
      opts.clients = (c.rows || []).slice().sort((x, y) =>
        (x.status === 'archived') - (y.status === 'archived')
        || String(x.business_name || '').localeCompare(String(y.business_name || ''), 'es'));
      opts.briefs = b.rows || [];
      opts.briefsComplete = b.total == null ? opts.briefs.length < 200 : Number(b.total) <= opts.briefs.length;
      opts.loaded = true;
    } catch (e) {
      if (!isSessionError(e)) opts.error = errorMessage(e, 'No se pudieron cargar los clientes y los briefs.');
    } finally {
      opts.loading = false;
      inflight = null;
    }
  })();
  return inflight;
}

/** Nombre legible de un cliente de la lista ("Taquería Los Compadres · CLI-004"). */
export function clientLabel(c) {
  if (!c) return '';
  const name = c.business_name || c.owner_name || 'Cliente sin nombre';
  const tail = c.status === 'archived' ? ' (archivado)' : c.status === 'inactive' ? ' (inactivo)' : '';
  return `${name}${c.client_code ? ' · ' + c.client_code : ''}${tail}`;
}
