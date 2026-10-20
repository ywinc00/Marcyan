// ════════════════════════════════════════════════════════════════
//  src/components/brief/lib/steps.js — Los seis pasos del brief corto
//  (design/brief.md §3, camino 2 "expediente por pasos").
//
//  Los CAMPOS salen del esquema (momento 'inicial' de lib/brief-schema.mjs);
//  aquí solo se decide en qué paso se pregunta cada uno. Si el esquema
//  añade un campo inicial que no está en ningún paso, cae en el paso de su
//  sección (FALLBACK) y test:brief-form avisa.
//  Puro (sin DOM): lo prueba scripts/test-brief-form.mjs.
// ════════════════════════════════════════════════════════════════
import { sectionsFor, validate, fieldByKey } from '../../../../lib/brief-schema.mjs';

const L = (es, en) => ({ es, en });

export const STEPS = Object.freeze([
  {
    key: 'negocio', label: L('Tu negocio', 'Your business'),
    intro: L('Quién eres y dónde trabajas. Con esto ya sabemos a quién le escribimos la propuesta.', 'Who you are and where you work, so we know who the proposal is for.'),
    fields: ['business_name', 'industry', 'city_state', 'business_description', 'current_website'],
  },
  {
    key: 'necesitas', label: L('Qué necesitas', 'What you need'),
    intro: L('Elige uno o varios servicios. Las preguntas se ajustan a lo que elijas.', 'Pick one or more services. The questions adjust to what you pick.'),
    fields: ['services', 'main_objective', 'website_type', 'language'],
  },
  {
    key: 'marca', label: L('Tu marca', 'Your brand'),
    intro: L('Si ya tienes logo o fotos a mano, súbelos aquí. Si no, los pedimos después.', 'If you have your logo or photos handy, upload them here. If not, we will ask later.'),
    fields: ['has_logo', 'logo_files', 'has_photos', 'photo_files'],
  },
  {
    key: 'plazo', label: L('Plazo y presupuesto', 'Timeline and budget'),
    intro: L('Un rango nos basta para proponerte lo que de verdad te sirve.', 'A range is enough for us to propose what actually fits.'),
    fields: ['budget_range', 'timeline'],
  },
  {
    key: 'contacto', label: L('Cómo te contactamos', 'How to reach you'),
    intro: L('Necesitamos al menos un correo o un teléfono.', 'We need at least an email or a phone number.'),
    fields: ['owner_name', 'email', 'phone', 'preferred_contact', 'referred_by', 'additional_notes'],
  },
  {
    key: 'revisar', label: L('Revisar y enviar', 'Review and send'),
    intro: L('Revisa tus respuestas. Puedes cambiar cualquier cosa antes de enviar.', 'Check your answers. You can change anything before you send it.'),
    fields: [],
  },
]);
export const REVIEW_STEP = STEPS.length - 1;

// Sección del esquema → paso, para campos nuevos que nadie colocó.
const FALLBACK = { servicios: 1, negocio: 0, contacto: 4, proyecto: 1, material: 2, cierre: 4 };

// Todos los campos visibles del momento inicial (sin los legados ocultos).
export const INITIAL_FIELDS = sectionsFor('inicial', null).flatMap((s) => s.fields);

// stepOfField(clave) → índice del paso donde se pregunta.
export function stepOfField(key) {
  const i = STEPS.findIndex((s) => s.fields.includes(key));
  if (i >= 0) return i;
  const fd = fieldByKey(key);
  return fd && FALLBACK[fd.section] !== undefined ? FALLBACK[fd.section] : 0;
}

// Campos (definiciones del esquema) de un paso, filtrados por los servicios
// elegidos (los condicionales solo aparecen si aplican).
export function fieldsForStep(index, services) {
  const sel = Array.isArray(services) ? services : [];
  const active = sectionsFor('inicial', sel.length ? sel : null).flatMap((s) => s.fields);
  const keys = new Set(active.map((f) => f.key));
  const placed = STEPS[index] ? STEPS[index].fields : [];
  const extra = active.filter((f) => !STEPS.some((s) => s.fields.includes(f.key)) && stepOfField(f.key) === index).map((f) => f.key);
  return [...placed, ...extra].filter((k) => keys.has(k)).map((k) => fieldByKey(k));
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
export const validateAll = (data) => validate('inicial', data, { optionMode: 'keep' });
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
