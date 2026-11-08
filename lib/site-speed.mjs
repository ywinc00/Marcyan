// ════════════════════════════════════════════════════════════════
//  lib/site-speed.mjs — velocidad de Google en segundo plano (migración 023)
//  ────────────────────────────────────────────────────────────────
//  PageSpeed Insights tarda 15-60 s: no cabe en un turno del chat. Tras
//  "revisar_sitio" se lanza en segundo plano (waitUntil) y el resultado se
//  guarda en site_speed; en el siguiente turno de esa conversación Marcy lo
//  recibe como contexto (solo cifras medidas, nunca contenido de la web ajena)
//  y lo cuenta si encaja. Una medición por conversación. Sin la migración o
//  sin clave de Google, no pasa nada (el chat sigue igual).
// ════════════════════════════════════════════════════════════════
const validSid = (sid) => typeof sid === 'string' && /^[\w-]{1,64}$/.test(sid);
async function getSql(sqlImpl) { return sqlImpl || (await import('@vercel/postgres')).sql; }

/** Lanza la medición sin esperar. Nunca lanza. */
export async function startSiteSpeed({ sid, url, lang = 'es', sqlImpl, measure, wait } = {}) {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!validSid(sid) || !url || (!key && !measure)) return false;
  const job = (async () => {
    const sql = await getSql(sqlImpl);
    const ins = await sql`INSERT INTO site_speed (sid, url) VALUES (${sid}, ${String(url).slice(0, 300)}) ON CONFLICT (sid) DO NOTHING RETURNING sid`;
    if (!ins.rows.length) return;                            // ya se midió en esta conversación
    const m = measure || (await import('./diagnostic-measure.mjs')).measurePageSpeed;
    const r = await m(url, { key, lang, timeoutMs: 70000 });
    await sql`UPDATE site_speed SET result = ${JSON.stringify(r || { ok: false })}::jsonb WHERE sid = ${sid}`;
  })().catch((err) => console.warn('[velocidad] sin medir', err && (err.code || err.message)));
  try {
    const w = wait || (await import('@vercel/functions')).waitUntil;
    w(job);
  } catch { /* fuera de Vercel: la promesa sigue sola */ }
  return true;
}

/** Texto para Marcy a partir de la medición (puro). null si no aporta. */
export function speedContext(r, url) {
  if (!r) return null;
  if (!r.ok) {
    if (r.motivo === 'web-no-abre') return `Medición de Google lista para ${url}: el navegador de Google NO pudo abrir la web (caída o bloqueada). Si encaja, díselo al cliente con tacto: sus clientes podrían estar viendo lo mismo.`;
    return null;
  }
  const p = r.puntuacion || {};
  const lab = r.laboratorio || {};
  const real = r.usuarios_reales;
  const parts = [];
  if (Number.isFinite(p.rendimiento)) parts.push(`velocidad en móvil ${p.rendimiento}/100`);
  if (Number.isFinite(lab.lcp_s)) parts.push(`tarda ${String(lab.lcp_s).replace('.', ',')} s en mostrar lo principal`);
  if (Number.isFinite(p.seo)) parts.push(`SEO técnico ${p.seo}/100`);
  if (real && real.veredicto) parts.push(`visitantes reales: ${real.veredicto === 'FAST' ? 'rápida' : real.veredicto === 'SLOW' ? 'lenta' : 'media'}`);
  if (!parts.length) return null;
  return `Medición de Google ya lista para ${url} (Google abrió la web en un móvil real): ${parts.join(', ')}. Si encaja con la conversación, cuéntaselo al cliente en una o dos frases con estas cifras exactas y qué supone para sus ventas (más de 3 s en cargar hace que muchos se vayan). No inventes otras cifras. Si ya no viene a cuento, no lo menciones.`;
}

/** Medición lista y aún no contada → contexto para este turno (y se marca contada). */
export async function takeSiteSpeed(sid, { sqlImpl } = {}) {
  if (!validSid(sid)) return null;
  try {
    const sql = await getSql(sqlImpl);
    const q = sql`UPDATE site_speed SET delivered_at = NOW() WHERE sid = ${sid} AND result IS NOT NULL AND delivered_at IS NULL RETURNING url, result`;
    const r = await Promise.race([q, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 1500))]);
    if (!r.rows.length) return null;
    return speedContext(r.rows[0].result, r.rows[0].url);
  } catch { return null; }
}

/** Borra las mediciones de más de 30 días. */
export async function purgeOldSpeed({ sqlImpl } = {}) {
  const sql = await getSql(sqlImpl);
  const r = await sql`DELETE FROM site_speed WHERE created_at < NOW() - INTERVAL '30 days'`;
  return r.rowCount || 0;
}
