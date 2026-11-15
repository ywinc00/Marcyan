// /api/admin/settings — Ajustes del panel (fase 4 del plan del panel)
//   GET  → { ok, finance, team, limits }
//          finance: perfil fiscal y de Finanzas (app_settings 'finance.*')
//          team:    quién puede entrar (ADMIN_ALLOWED_EMAILS; se cambia en Vercel)
//          limits:  topes de seguridad de Marcy y de los formularios (lib/ratelimit.mjs, solo lectura)
//   POST { key, value } → guarda un ajuste de Finanzas (valida el valor) → { ok, finance }
// Protegido con requireAdmin. Nada secreto sale de aquí: ni claves ni tokens.
import { requireAdmin, getAllowedEmails } from '../../lib/auth.mjs';
import { LIMITS } from '../../lib/ratelimit.mjs';
import { BooksError, getFinanceSettings, setFinanceSetting } from '../../lib/finance-books.mjs';

const ENTITY_TYPES = ['undecided', 'individual', 'single_llc', 'partnership'];

/** Valida cada ajuste antes de guardarlo (mensajes en llano). */
export function cleanSetting(key, value) {
  if (key === 'finance.filing') {
    if (!['single', 'mfj'].includes(value)) throw new BooksError('Elige cómo declaras: individual o conjunta.');
    return value;
  }
  if (key === 'finance.method') {
    if (!['cash', 'accrual'].includes(value)) throw new BooksError('Elige el método contable.');
    return value;
  }
  if (key === 'finance.sales_tax_tx') {
    const registered = !!(value && value.registered);
    return { registered, local_rate: null };
  }
  if (key === 'finance.agent') {
    const v = value && typeof value === 'object' ? value : {};
    const cap = Number(v.monthly_cap_usd);
    if (!Number.isFinite(cap) || cap < 1 || cap > 200) throw new BooksError('El tope va de 1 a 200 USD al mes.');
    return { enabled: Boolean(v.enabled), monthly_cap_usd: Math.round(cap * 100) / 100 };
  }
  if (key === 'finance.entity') {
    const type = value && ENTITY_TYPES.includes(value.type) ? value.type : null;
    if (!type) throw new BooksError('Elige la forma del negocio.');
    const from = String(value.from || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) throw new BooksError('Indica desde qué fecha vale.');
    let partners = [];
    if (type === 'partnership') {
      partners = (Array.isArray(value.partners) ? value.partners : [])
        .map((p) => ({ name: String(p && p.name || '').trim().slice(0, 80), share: Number(p && p.share) }))
        .filter((p) => p.name);
      if (partners.length < 2) throw new BooksError('Una sociedad tiene al menos dos socios.');
      if (partners.some((p) => !Number.isFinite(p.share) || p.share <= 0 || p.share > 100)) throw new BooksError('El porcentaje de cada socio va de 1 a 100.');
      const total = partners.reduce((a, p) => a + p.share, 0);
      if (Math.abs(total - 100) > 0.01) throw new BooksError(`Los porcentajes suman ${total}; tienen que sumar 100.`);
    }
    return { periods: [{ from, type, partners }] };
  }
  throw new BooksError('Ajuste desconocido.');
}

// Topes que se enseñan, en llano (los cambia el código: protegen el gasto de IA).
function limitsView() {
  const per = (arr, sec) => (arr || []).find((x) => x.windowSec === sec)?.limit ?? null;
  return [
    { label: 'Mensajes de Marcy que llegan a la IA en un día, en todo el sitio', value: per(LIMITS.chatGlobal, 86400) },
    { label: 'Mensajes por conversación en un día', value: per(LIMITS.chatSession, 86400) },
    { label: 'Mensajes por conexión en un minuto', value: per(LIMITS.chat, 60) },
    { label: 'Búsquedas de fichas de Google en un día (cada una se cobra)', value: per(LIMITS.chatPlacesGlobal, 86400) },
    { label: 'Envíos del formulario de contacto por persona en un día', value: per(LIMITS.contact, 86400) },
    { label: 'Envíos del brief por persona en un día', value: per(LIMITS.brief, 86400) },
  ].filter((x) => x.value != null);
}

export default async function handler(req, res) {
  const session = await requireAdmin(req, res);
  if (!session) return;
  try {
    if (req.method === 'GET') {
      return res.status(200).json({
        ok: true,
        finance: await getFinanceSettings(),
        team: getAllowedEmails(),
        me: session.email || null,
        limits: limitsView(),
      });
    }
    if (req.method === 'POST') {
      const b = (typeof req.body === 'object' && req.body) ? req.body : {};
      const key = String(b.key || '');
      const finance = await setFinanceSetting(key, cleanSetting(key, b.value), session.email || null);
      return res.status(200).json({ ok: true, finance });
    }
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof BooksError) return res.status(err.status).json({ ok: false, error: err.message });
    console.error('[admin/settings] error:', err);
    return res.status(500).json({ ok: false, error: 'No se pudieron cargar los ajustes.' });
  }
}
