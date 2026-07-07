// ════════════════════════════════════════════════════════════════
//  lib/site-fetch.mjs — Descarga de sitios con guardia SSRF (SIN Postgres)
//  ────────────────────────────────────────────────────────────────
//  Factorizado desde api/diagnostic.mjs para compartir la MISMA guardia
//  SSRF y el fetch endurecido entre el diagnóstico (api/diagnostic.mjs) y
//  la tool interna del chat (api/chat.mjs). Este módulo NO importa
//  @vercel/postgres ni nada de infra: api/chat.mjs tiene doctrina CERO-Postgres
//  y solo puede tocar ESTE módulo + lib/diagnostic-checks.mjs.
//
//  La lógica es IDÉNTICA a la original (con el endurecimiento IPv6 ya hecho);
//  lo único nuevo es que fetchSite acepta presupuestos parametrizables para
//  que el chat use un timeout/tamaño/redirects más ajustados que el diagnóstico.
// ════════════════════════════════════════════════════════════════
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

// ── Guardia SSRF (rechaza IPs privadas / loopback / hosts internos) ──
// ¿IPv4 dotted privada/reservada? Malformado → se bloquea por defecto.
export function isPrivateV4(ip) {
  const p = ip.split('.');
  if (p.length !== 4) return true;
  const n = p.map((x) => Number(x));
  if (n.some((x) => !Number.isInteger(x) || x < 0 || x > 255)) return true;
  const [a, b] = n;
  if (a === 0 || a === 10 || a === 127) return true;         // this-host / privada / loopback
  if (a === 169 && b === 254) return true;                   // link-local (metadata 169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return true;          // privada
  if (a === 192 && b === 168) return true;                   // privada
  if (a === 100 && b >= 64 && b <= 127) return true;         // CGNAT
  if (a >= 224) return true;                                 // multicast / reservado
  return false;
}

// ¿Dirección IP (v4 o v6, literal o resuelta) que hay que bloquear? Cubre las
// codificaciones IPv6 que un regex sobre string dejaba pasar (IPv4-mapped,
// link-local, unique-local, loopback), extrayendo el IPv4 embebido cuando aplica.
export function isBlockedIp(ip) {
  const fam = isIP(ip);
  if (fam === 4) return isPrivateV4(ip);
  if (fam === 6) {
    const l = ip.toLowerCase();
    // IPv4-mapped / -compat en notación dotted: ::ffff:a.b.c.d  o  ::a.b.c.d
    let m = l.match(/(?:::ffff:|::)(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/);
    if (m) return isPrivateV4(m[1]);
    // IPv4-mapped en notación hex: ::ffff:7f00:0001 → decodifica los últimos 32 bits
    m = l.match(/::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
    if (m) {
      const hi = parseInt(m[1], 16), lo = parseInt(m[2], 16);
      return isPrivateV4([(hi >> 8) & 255, hi & 255, (lo >> 8) & 255, lo & 255].join('.'));
    }
    if (l === '::1' || l === '::') return true;               // loopback / unspecified
    if (/^f[cd]/.test(l)) return true;                        // fc00::/7 unique-local
    if (/^fe[89ab]/.test(l)) return true;                     // fe80::/10 link-local
    if (/^ff/.test(l)) return true;                           // multicast
    return false;
  }
  return true;                                                // no es IP válida → bloquear (defensivo)
}

export async function ssrfGuard(raw) {
  let u;
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); }
  catch { return { ok: false, reason: 'invalid' }; }
  if (!/^https?:$/.test(u.protocol)) return { ok: false, reason: 'protocol' };
  if (u.port && !['80', '443', ''].includes(u.port)) return { ok: false, reason: 'port' };
  // hostname de un literal IPv6 llega entre corchetes ("[::1]") → quitarlos para isIP.
  let host = u.hostname.toLowerCase();
  if (host.startsWith('[') && host.endsWith(']')) host = host.slice(1, -1);
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.localhost') || host.endsWith('.internal')) return { ok: false, reason: 'host' };
  if (isIP(host)) {
    if (isBlockedIp(host)) return { ok: false, reason: 'ip' };
  } else {
    try {
      const addrs = await lookup(host, { all: true });
      // NOTA (limitación conocida, riesgo BAJO): validamos aquí lo que resuelve el
      // DNS, pero fetch() vuelve a resolver por su cuenta → hay una ventana TOCTOU /
      // DNS-rebinding. Cerrarla requiere fijar la IP (dispatcher propio, dep nueva),
      // fuera de alcance del MVP; el timeout y el re-guardado por salto acotan.
      if (!addrs.length || addrs.some((a) => isBlockedIp(a.address))) return { ok: false, reason: 'dns' };
    } catch { return { ok: false, reason: 'dns' }; }
  }
  return { ok: true, url: u };
}

// Descarga el sitio RE-GUARDANDO cada salto (manual) para que un redirect a una
// IP privada no evada el SSRF. Presupuestos parametrizables (el chat usa límites
// más ajustados que el diagnóstico).
//   timeoutMs   — timeout por salto (default 8s)
//   maxBytes    — tope de body leído (default 500KB)
//   maxRedirects— saltos de redirect permitidos (default 3)
export async function fetchSite(startUrl, { timeoutMs = 8000, maxBytes = 500_000, maxRedirects = 3 } = {}) {
  let url = startUrl; // URL ya validada por ssrfGuard
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    let res;
    try {
      res = await fetch(url, {
        redirect: 'manual',
        signal: ctrl.signal,
        headers: { 'user-agent': 'MarcyanDiagnostic/1.0 (+https://marcyanstudio.com)' },
      });
    } catch { clearTimeout(t); return { ok: false }; }

    // ¿Redirect? Resolver Location, re-validar SSRF, seguir (máx maxRedirects saltos).
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      clearTimeout(t);
      if (hop === maxRedirects) return { ok: false };
      let next;
      try { next = new URL(res.headers.get('location'), url); } catch { return { ok: false }; }
      const g = await ssrfGuard(next.href);
      if (!g.ok) return { ok: false };
      url = g.url;
      continue;
    }

    // Respuesta final: leer body capado a maxBytes.
    try {
      const reader = res.body.getReader();
      let html = '', got = 0;
      const dec = new TextDecoder();
      while (got < maxBytes) {
        const { done, value } = await reader.read();
        if (done) break;
        got += value.byteLength;
        html += dec.decode(value, { stream: true });
      }
      try { ctrl.abort(); } catch {}
      clearTimeout(t);
      return { ok: res.ok, status: res.status, https: url.protocol === 'https:', finalUrl: url.href, html };
    } catch { clearTimeout(t); return { ok: false }; }
  }
  return { ok: false };
}
