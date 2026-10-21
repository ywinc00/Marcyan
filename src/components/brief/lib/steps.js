// ════════════════════════════════════════════════════════════════
//  src/components/brief/lib/steps.js — Los cinco pasos del brief corto
//  (design/brief.md §3, camino 2 "expediente por pasos").
//
//  Los CAMPOS salen del esquema (momento 'inicial' de lib/brief-schema.mjs);
//  aquí solo se decide en qué paso se pregunta cada uno. Si el esquema
//  añade un campo inicial que no está en ningún paso, cae en el paso de su
//  sección (FALLBACK) y test:brief-form avisa.
//  Puro (sin DOM): lo prueba scripts/test-brief-form.mjs.
// ════════════════════════════════════════════════════════════════
import { sectionsFor, validate, fieldByKey, isActive, isSkipped, SERVICE_IDS } from '../../../../lib/brief-schema.mjs';

const L = (es, en) => ({ es, en });

export const STEPS = Object.freeze([
  {
    key: 'negocio', label: L('Tu negocio', 'Your business'),
    intro: L('Quién eres y dónde trabajas. Con esto ya sabemos a quién le escribimos la propuesta.', 'Who you are and where you work, so we know who the proposal is for.'),
    fields: ['business_name', 'industry', 'city_state', 'business_description', 'current_website'],
  },
  {
    // Después de lo general, los bloques de cada servicio elegido (por_servicio).
    key: 'necesitas', label: L('Qué necesitas', 'What you need'),
    intro: L('Elige uno o varios servicios. Las preguntas se ajustan a lo que elijas.', 'Pick one or more services. The questions adjust to what you pick.'),
    fields: ['services', 'main_objective', 'language', 'timeline', 'website_type', 'web_extras', 'seo_scope', 'seo_areas', 'aeo_scope', 'aeo_tested',
      'bot_channels', 'bot_tasks', 'product_count', 'shipping', 'brand_scope', 'brand_uses'],
  },
  {
    key: 'marca', label: L('Tu marca', 'Your brand'),
    intro: L('Cómo está tu marca hoy. Si tienes logo o fotos a mano, súbelos aquí; si no, los pedimos después.', 'Where your brand stands today. If you have your logo or photos handy, upload them here; if not, we will ask later.'),
    fields: ['has_logo', 'logo_files', 'brand_status', 'brand_color_list', 'brand_colors_none', 'has_photos', 'photo_files'],
  },
  {
    key: 'contacto', label: L('Cómo te contactamos', 'How to reach you'),
    intro: L('Necesitamos al menos un correo o un teléfono.', 'We need at least an email or a phone number.'),
    fields: ['owner_name', 'email', 'phone', 'preferred_contact', 'contact_language', 'referred_by', 'additional_notes'],
  },
  {
    key: 'revisar', label: L('Revisar y enviar', 'Review and send'),
    intro: L('Revisa tus respuestas. Puedes cambiar cualquier cosa antes de enviar.', 'Check your answers. You can change anything before you send it.'),
    fields: [],
  },
]);
export const REVIEW_STEP = STEPS.length - 1;

// Sección del esquema → paso, para campos nuevos que nadie colocó.
const FALLBACK = { servicios: 1, negocio: 0, contacto: 3, proyecto: 1, por_servicio: 1, material: 2, cierre: 3 };

// Todos los campos visibles del momento inicial (sin los legados ocultos).
export const INITIAL_FIELDS = sectionsFor('inicial', null).flatMap((s) => s.fields);

// stepOfField(clave) → índice del paso donde se pregunta.
export function stepOfField(key) {
  const i = STEPS.findIndex((s) => s.fields.includes(key));
  if (i >= 0) return i;
  const fd = fieldByKey(key);
  return fd && FALLBACK[fd.section] !== undefined ? FALLBACK[fd.section] : 0;
}

// Servicio bajo el que se agrupa un campo condicional: el primero de su
// condición que el cliente eligió (sin servicios elegidos, el primero de la
// condición). null = campo general, sin bloque.
export function groupOf(fd, services) {
  if (!fd || !fd.when || !Array.isArray(fd.when.services) || !fd.when.services.length) return null;
  const sel = Array.isArray(services) ? services : [];
  return fd.when.services.find((id) => sel.includes(id)) || fd.when.services[0];
}

// Campos (definiciones del esquema) de un paso, filtrados por los servicios
// elegidos (los condicionales solo aparecen si aplican). Los condicionales van
// después de los generales, agrupados por servicio en el orden del catálogo.
export function fieldsForStep(index, services) {
  const sel = Array.isArray(services) ? services : [];
  const active = sectionsFor('inicial', sel.length ? sel : null).flatMap((s) => s.fields);
  const keys = new Set(active.map((f) => f.key));
  const placed = STEPS[index] ? STEPS[index].fields : [];
  const extra = active.filter((f) => !STEPS.some((s) => s.fields.includes(f.key)) && stepOfField(f.key) === index).map((f) => f.key);
  // Sin servicios elegidos (lista vacía) no se muestra ningún bloque; null = todo (errores).
  const list = [...placed, ...extra].filter((k) => keys.has(k)).map((k) => fieldByKey(k))
    .filter((f) => !(Array.isArray(services) && !services.length && f.when));
  const plain = list.filter((f) => !groupOf(f, sel));
  const grouped = list.filter((f) => groupOf(f, sel));
  const rank = (f) => SERVICE_IDS.indexOf(groupOf(f, sel));
  // sort estable: dentro de cada servicio se conserva el orden del paso.
  return [...plain, ...grouped.slice().sort((a, b) => rank(a) - rank(b))];
}

// Campos de un paso con la marca de inicio de bloque: { fd, head } donde
// head es el id del servicio cuando ahí empieza su bloque (null si no).
export function itemsForStep(index, services) {
  let prev = null;
  return fieldsForStep(index, services).map((fd) => {
    const g = groupOf(fd, services);
    const head = g && g !== prev ? g : null;
    prev = g;
    return { fd, head };
  });
}

// Preguntas que dependen de otra respuesta del mismo paso. Ocultas no se
// borran (nada se pierde si el cliente cambia de idea), pero no se validan
// ni se envían.
// La regla vive en el esquema (SKIP_IF): la misma para el kit, la ficha del
// panel, el documento y BRIEF.md. Sin logo no se pregunta si la marca está
// cerrada; con "No tengo colores definidos" no se pide la lista.
export const isHidden = (key, data) => isSkipped(key, data);

// Minutos estimados del brief con los servicios elegidos: unos 20 s por
// pregunta visible, nunca menos de 5. Con un servicio sale ~6-7 min y con
// todos ~12: el raíl dice la verdad en vez de un "10 minutos" fijo.
export function estimateMinutes(services, data = {}) {
  let n = 0;
  for (let i = 0; i < REVIEW_STEP; i++) {
    n += fieldsForStep(i, services).filter((f) => !isSkipped(f.key, data)).length;
  }
  return Math.max(5, Math.round(n / 3));
}

// Lo que de verdad se valida y se envía: sin lo oculto y sin las respuestas
// de servicios que el cliente ya no eligió.
export function effectiveData(data) {
  const d = { ...(data || {}) };
  const services = Array.isArray(d.services) ? d.services : [];
  for (const key of Object.keys(d)) {
    const fd = fieldByKey(key);
    if (isHidden(key, d) || (fd && services.length && !isActive(fd, services))) delete d[key];
  }
  return d;
}

// Errores del esquema que caen en un paso (claves 'campo' o 'campo.i.sub').
export function errorsForStep(index, errors) {
  const keys = new Set(fieldsForStep(index, null).map((f) => f.key));
  for (const k of STEPS[index] ? STEPS[index].fields : []) keys.add(k);
  const out = {};
  for (const [path, msg] of Object.entries(errors || {})) {
    if (keys.has(path.split('.')[0])) out[path] = msg;
  }
  return out;
}

// Validación completa (como la del servidor) y por paso.
export const validateAll = (data) => validate('inicial', effectiveData(data), { optionMode: 'keep' });
export function validateStep(index, data) {
  const v = validateAll(data);
  return errorsForStep(index, v.errors);
}

// Primer paso con errores (o -1).
export function firstStepWithErrors(errors) {
  let min = -1;
  for (const path of Object.keys(errors || {})) {
    const i = stepOfField(path.split('.')[0]);
    if (min === -1 || i < min) min = i;
  }
  return min;
}
