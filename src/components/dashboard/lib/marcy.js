// ─────────────────────────────────────────────────────────────
// Sección Marcy de Orbit: textos y reglas puras (se prueban sin navegador).
// El resultado y el motivo de fallo los calcula el servidor (lib/chat-log.mjs);
// aquí solo se ponen en palabras y se filtran.
// ─────────────────────────────────────────────────────────────

export const OUTCOMES = {
  en_vivo:     { label: 'En vivo',     tone: 'data' },
  abierta:     { label: 'Abierta',     tone: 'neutral' },
  cerrada:     { label: 'Cerrada',     tone: 'success' },
  transferida: { label: 'Pasada a ti', tone: 'info' },
  no_cerrada:  { label: 'No cerrada',  tone: 'warning' },
  abandonada:  { label: 'Abandonada',  tone: 'neutral' },
};
export const outcomeMeta = (o) => OUTCOMES[o] || OUTCOMES.abierta;

export const MOTIVOS = {
  se_fue_tras_precio:      'Se fue tras el precio',
  no_dejo_contacto:        'No dejó contacto en el formulario',
  se_fue_tras_saludo:      'Se fue tras el saludo',
  se_fue_tras_revisar_web: 'Se fue tras revisar su web',
  se_fue_tras_respuesta:   'Se fue tras una respuesta',
  cifra_cortada:           'El filtro cortó una cifra',
  error_de_marcy:          'Error de Marcy',
};
export const motivoLabel = (m) => MOTIVOS[m] || 'Se fue';

export const TOOLS = {
  cotizar: 'Cotizó con las reglas',
  revisar_sitio: 'Revisó su web y su ficha de Google',
  calcular_perdida: 'Calculó lo que pierde el negocio',
};
export const toolLabel = (t) => TOOLS[t] || 'Usó una herramienta';

export function actionLabel(type, destino) {
  if (type === 'capture') {
    if (destino === 'proyecto') return 'Abrió el formulario del proyecto';
    if (destino === 'persona') return 'Ofreció pasarle con una persona';
    return 'Abrió el formulario de contacto';
  }
  if (type === 'channels') return 'Mostró llamar y WhatsApp';
  if (type === 'link') return 'Le dejó un enlace del sitio';
  return '';
}

// Filtros de la bandeja (E-06): estado en la URL (#/marcy?f=en_vivo).
export const FILTERS = [
  { id: '',         label: 'Todas' },
  { id: 'en_vivo',  label: 'En vivo' },
  { id: 'cerrada',  label: 'Cerradas' },
  { id: 'transferida', label: 'Pasadas a ti' },
  { id: 'fallo',    label: 'Con fallo' },
];

/** Filtra por pastilla, paso del embudo (?paso=) o motivo (?motivo=). */
export function applyFilter(rows, { f = '', paso = '', motivo = '' } = {}) {
  return rows.filter((r) => {
    if (f === 'fallo' && !r.fallo) return false;
    if (f && f !== 'fallo' && r.outcome !== f) return false;
    if (paso === 'precio' && !r.pasos.precio) return false;
    if (paso === 'pidio_contacto' && !r.pasos.pidio_contacto) return false;
    if (paso === 'dejaron_contacto' && r.outcome !== 'cerrada') return false;
    if (paso === 'pasadas' && r.outcome !== 'transferida') return false;
    if (motivo && (!r.fallo || r.fallo.motivo !== motivo)) return false;
    return true;
  });
}

/** Pasos del embudo con lo que se pierde en cada salto. */
export function funnelSteps(e) {
  if (!e) return [];
  const steps = [
    { id: '',                 label: 'Conversaciones',     n: e.conversaciones },
    { id: 'precio',           label: 'Pidieron precio',    n: e.precio },
    { id: 'pidio_contacto',   label: 'Les pidió contacto', n: e.pidio_contacto },
    { id: 'dejaron_contacto', label: 'Dejaron contacto',   n: e.dejaron_contacto },
  ];
  const top = Math.max(1, e.conversaciones);
  return steps.map((s, i) => ({
    ...s,
    pct: Math.round((s.n / top) * 100),
    drop: i > 0 ? Math.max(0, steps[i - 1].n - s.n) : 0,
  }));
}

/** Motivos ordenados de más a menos, con su proporción sobre el mayor. */
export function motivosOrdenados(e) {
  const list = Object.entries((e && e.motivos) || {}).map(([id, n]) => ({ id, n, label: motivoLabel(id) }));
  list.sort((a, b) => b.n - a.n);
  const max = Math.max(1, ...list.map((m) => m.n));
  return list.map((m) => ({ ...m, pct: Math.round((m.n / max) * 100) }));
}

/** Recorrido de venta de UNA conversación a partir de sus turnos. */
export function recorrido(conv) {
  const t = (conv && conv.turnos) || [];
  const precio = t.some((x) => x.tool === 'cotizar' || /\$\s?\d/.test(x.reply || ''));
  const revision = t.some((x) => x.tool === 'revisar_sitio');
  const pidio = t.some((x) => x.action_type === 'capture');
  const dejo = conv && (conv.lead_kind === 'lead' || conv.lead_kind === 'brief');
  const paso = conv && conv.lead_kind === 'handoff';
  return [
    { label: 'Contó qué necesita', done: t.length >= 1 },
    { label: 'Recibió precio', done: precio },
    { label: 'Revisó su web o ficha', done: revision, optional: true },
    { label: 'Le pidió el contacto', done: pidio },
    { label: paso ? 'Pidió hablar contigo' : 'Dejó su contacto', done: !!(dejo || paso) },
  ];
}

/** Dinero en dólares a partir de micro-dólares. */
export function usd(micro, digits = 2) {
  const v = (Number(micro) || 0) / 1e6;
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export const CHANNELS = { web: 'Web', telefono: 'Teléfono', whatsapp: 'WhatsApp', instagram: 'Instagram', correo: 'Correo' };
export const LANGS = { es: 'español', en: 'inglés' };

/** Enlace al registro que dejó (lead o brief) dentro de Orbit. */
export function leadHref(ref) {
  if (!ref) return '';
  if (/^MRC-/i.test(ref)) return '#/briefs/' + encodeURIComponent(ref);
  if (/^LEAD-/i.test(ref)) return '#/leads/' + encodeURIComponent(ref);
  return '';
}
