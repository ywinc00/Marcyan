// ─────────────────────────────────────────────────────────────
// Descargas de la ficha del brief (kit .zip y ficha .html) CON aviso de
// error (revisión A3-06). Un <a download> directo deja el fallo en la barra
// de descargas del navegador sin que el panel diga nada; aquí se pide el
// archivo con fetch, se comprueba la respuesta y solo entonces se guarda.
//   · 401 → se comprueba la sesión con el cliente único api(), que avisa a la
//     carcasa y vuelve al login como en el resto del panel.
//   · 404 / 5xx / red cortada → ApiError con texto en español llano, para
//     toastError(); el botón sigue disponible para reintentar.
// ─────────────────────────────────────────────────────────────
import { api, ApiError, MSG } from '../lib/api.js';

const BY_STATUS = {
  403: 'No tienes permiso para descargar esto.',
  404: 'No se encontró. Puede que el brief ya se haya borrado.',
};

/** Nombre del archivo según Content-Disposition (o el de respaldo). */
export function filenameFrom(disposition, fallback = 'descarga') {
  const s = String(disposition || '');
  const star = /filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i.exec(s);
  if (star) { try { return decodeURIComponent(star[1].trim().replace(/^"|"$/g, '')); } catch (_) { /* nombre mal codificado: se prueba el simple */ } }
  const plain = /filename\s*=\s*"?([^";]+)"?/i.exec(s);
  return plain ? plain[1].trim() : fallback;
}

/**
 * Descarga url y la guarda con su nombre. onprogress(bytes) mientras llega.
 * Lanza ApiError si algo falla (nunca deja el error mudo).
 */
export async function downloadFile(url, { fallbackName = 'descarga', onprogress } = {}) {
  let res;
  try {
    res = await fetch(url, { credentials: 'same-origin' });
  } catch (_) {
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    throw new ApiError(offline ? MSG.offline : MSG.network, { kind: 'network' });
  }
  if (res.status === 401) {
    // api() con la sesión caducada avisa a la carcasa y lanza el error de sesión.
    await api('/api/admin/me');
    throw new ApiError(MSG.session, { status: 401, kind: 'session' });
  }
  if (!res.ok) {
    throw new ApiError(BY_STATUS[res.status] || (res.status >= 500
      ? 'El servidor no pudo preparar el archivo. Inténtalo de nuevo en un momento.'
      : MSG.generic), { status: res.status, kind: 'http' });
  }

  let blob;
  try {
    const type = res.headers.get('Content-Type') || 'application/octet-stream';
    if (res.body && typeof res.body.getReader === 'function') {
      const reader = res.body.getReader();
      const chunks = [];
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        got += value.byteLength;
        if (onprogress) onprogress(got);
      }
      blob = new Blob(chunks, { type });
    } else {
      blob = await res.blob();
    }
  } catch (_) {
    throw new ApiError('La descarga se cortó. Revisa tu conexión e inténtalo de nuevo.', { kind: 'network' });
  }

  const name = filenameFrom(res.headers.get('Content-Disposition'), fallbackName);
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 30000);
  return { name, size: blob.size };
}
