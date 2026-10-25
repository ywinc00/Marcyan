// ─────────────────────────────────────────────────────────────
// Cliente HTTP ÚNICO del panel (Orbit). Sustituye los 6 api() que cada
// sección copiaba. Reglas:
//   · timeout de 15 s (AbortController): una función colgada o un cold-start
//     nunca deja un "Cargando…" infinito.
//   · JSON seguro: una página HTML de error (502 de Vercel, proxy) no revienta
//     el parseo; se convierte en un error legible.
//   · 401 → avisa a la carcasa (onUnauthorized) para volver al login con
//     "Tu sesión caducó, vuelve a entrar". Las llamadas de sesión (me, login,
//     logout) lo desactivan con { auth: false }.
//   · Errores SIEMPRE en español llano: si el servidor manda un texto técnico
//     ("Method not allowed", "amount_cents inválido") se sustituye por uno
//     genérico según el código.
//   · Devuelve el JSON ya parseado. Lanza ApiError si la respuesta no es ok
//     o trae { ok:false }, salvo con { acceptErrors: true } (la sección quiere
//     leer el cuerpo del error, p. ej. la sincronización de SEO).
// ─────────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT = 15000;

export const MSG = {
  session: 'Tu sesión caducó, vuelve a entrar.',
  timeout: 'La conexión tardó demasiado. Inténtalo de nuevo.',
  offline: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
  network: 'No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
  invalid: 'El servidor respondió algo inesperado. Inténtalo de nuevo.',
  generic: 'No se pudo completar la acción. Inténtalo de nuevo.',
};

const BY_STATUS = {
  400: 'Revisa los datos e inténtalo de nuevo.',
  403: 'No tienes permiso para hacer esto.',
  404: 'No se encontró. Puede que ya se haya borrado.',
  405: 'Esta acción no está disponible.',
  409: 'Ese registro cambió mientras tanto. Recarga e inténtalo de nuevo.',
  413: 'Los datos son demasiado grandes.',
  429: 'Demasiados intentos. Espera unos minutos y vuelve a probar.',
  500: 'El servidor tuvo un problema. Inténtalo de nuevo en un momento.',
};

export class ApiError extends Error {
  constructor(message, { status = 0, kind = 'http', data = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;   // código HTTP (0 si no hubo respuesta)
    this.kind = kind;       // http | session | timeout | network | parse
    this.data = data;       // cuerpo JSON del error, si lo hubo
  }
}

// ── Suscripciones de la carcasa ──────────────────────────────
// onUnauthorized: una sola función (la registra DashboardApp).
// onMutation: avisa tras cada POST/PATCH/PUT/DELETE correcto, para que la
// carcasa refresque lo suyo (suscripciones de la barra, proyectos) sin que
// cada sección tenga que acordarse (SH-08).
// onNetwork: 'up' con cada respuesta, 'down' cuando la red falla; alimenta el
// indicador de conexión, que así solo dice "En línea" si es verdad (SH-14).
let unauthorizedHandler = null;
const mutationListeners = new Set();
const networkListeners = new Set();

export function onUnauthorized(fn) {
  unauthorizedHandler = fn;
  return () => { if (unauthorizedHandler === fn) unauthorizedHandler = null; };
}
export function onMutation(fn) { mutationListeners.add(fn); return () => mutationListeners.delete(fn); }
export function onNetwork(fn) { networkListeners.add(fn); return () => networkListeners.delete(fn); }

function emit(set, ...args) {
  for (const fn of set) { try { fn(...args); } catch (err) { console.error('[orbit] listener', err); } }
}

// Texto del servidor que no se le puede enseñar tal cual al dueño.
function looksTechnical(msg) {
  if (!msg || typeof msg !== 'string') return true;
  return /not allowed|unauthori[sz]ed|forbidden|internal|exception|failed|\bHTTP\b|\bnull\b|\bundefined\b|[a-z]+_[a-z_]+|^error( interno)?$/i.test(msg.trim());
}

function humanMessage(status, serverMsg) {
  if (!looksTechnical(serverMsg)) return serverMsg;
  if (status >= 500) return BY_STATUS[500];
  return BY_STATUS[status] || MSG.generic;
}

function isPlainBody(b) {
  return b != null && typeof b === 'object'
    && !(typeof FormData !== 'undefined' && b instanceof FormData)
    && !(typeof Blob !== 'undefined' && b instanceof Blob)
    && !(b instanceof URLSearchParams)
    && !(b instanceof ArrayBuffer);
}

/**
 * Llama a un endpoint del panel y devuelve su JSON.
 * @param {string} url
 * @param {object} [opts] method, body (objeto o string JSON), headers, timeout,
 *   auth (false = un 401 no cierra la sesión), acceptErrors (true = devuelve el
 *   JSON aunque no sea ok, en vez de lanzar).
 */
export async function api(url, opts = {}) {
  const { timeout = DEFAULT_TIMEOUT, auth = true, acceptErrors = false, body, headers, method = 'GET', ...rest } = opts;
  const m = String(method).toUpperCase();
  const payload = isPlainBody(body) ? JSON.stringify(body) : body;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  let res, text = '';
  try {
    res = await fetch(url, {
      ...rest,
      method: m,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(headers || {}) },
      body: payload,
      signal: ctrl.signal,
    });
    text = await res.text().catch(() => '');
  } catch (e) {
    clearTimeout(t);
    if (e && (e.name === 'AbortError' || e.name === 'TimeoutError')) {
      throw new ApiError(MSG.timeout, { kind: 'timeout' });
    }
    emit(networkListeners, 'down');
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    throw new ApiError(offline ? MSG.offline : MSG.network, { kind: 'network' });
  }
  clearTimeout(t);
  emit(networkListeners, 'up');

  // JSON seguro.
  let data = null;
  if (text) { try { data = JSON.parse(text); } catch (_) { data = null; } }

  if (res.status === 401 && auth) {
    if (unauthorizedHandler) unauthorizedHandler();
    throw new ApiError(MSG.session, { status: 401, kind: 'session', data });
  }

  const failed = !res.ok || (data && data.ok === false);
  if (failed) {
    const message = humanMessage(res.status, data && data.error);
    if (!acceptErrors) throw new ApiError(message, { status: res.status, kind: 'http', data });
    return data && typeof data === 'object' ? { ...data, ok: false, error: message } : { ok: false, error: message };
  }
  if (data == null) {
    // 204 o cuerpo vacío: éxito sin datos. Cuerpo no-JSON con 200: inesperado.
    if (!text) data = { ok: true };
    else throw new ApiError(MSG.invalid, { status: res.status, kind: 'parse' });
  }
  if (auth && m !== 'GET' && m !== 'HEAD') emit(mutationListeners, { url, method: m });
  return data;
}

/** Mensaje legible de cualquier error (ApiError o inesperado). */
export function errorMessage(e, fallback = MSG.generic) {
  if (e instanceof ApiError) return e.message;
  return fallback;
}

/** ¿Es el error de sesión caducada? (la carcasa ya lo gestiona: no repetir avisos). */
export function isSessionError(e) {
  return e instanceof ApiError && e.kind === 'session';
}
