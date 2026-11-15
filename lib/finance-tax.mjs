// ════════════════════════════════════════════════════════════════
//  lib/finance-tax.mjs — Reglas PURAS de impuestos (sin BD ni red)
//  Material de preparación para el contador, NUNCA consejo fiscal: todo lo que
//  sale de aquí se muestra con «Para revisión de tu contador, no es consejo
//  fiscal» y con sus supuestos a la vista.
//
//  Fuente de las cifras: _cerebro/marcyan-web/encargos/2026-11-14-investigacion-fiscal-2026.md
//  (IRS.gov, comptroller.texas.gov, floridarevenue.com; consultadas 2026-11-14).
//  Un año que no esté en TAX_YEARS NO se calcula: se avisa (nunca se inventa una
//  cifra). Al llegar 2027, añadir su bloque con su fuente.
// ════════════════════════════════════════════════════════════════

export const TAX_DISCLAIMER = 'Para revisión de tu contador, no es consejo fiscal.';

// ── Categorías de gasto → línea del Schedule C (2026) ────────────
// Los cinco ids de antes (software, hosting, marketing, legal, otro) se conservan
// para no tocar los gastos ya guardados. `pct` = parte deducible (comidas al 50 %).
export const TAX_CATEGORIES = [
  { id: 'marketing',    label: 'Publicidad y anuncios',        line: '8',   lineLabel: 'Publicidad' },
  { id: 'vehiculo',     label: 'Vehículo y millaje',           line: '9',   lineLabel: 'Coche y camión' },
  { id: 'comisiones',   label: 'Comisiones de cobro',          line: '10',  lineLabel: 'Comisiones y honorarios', cpa: 'El CPA decide si van en la 10 o en la 27b.' },
  { id: 'contratistas', label: 'Contratistas',                 line: '11',  lineLabel: 'Trabajo por contrato' },
  { id: 'equipo',       label: 'Equipo (computadoras, etc.)',  line: '27b', lineLabel: 'Otros gastos (de minimis)', cpa: 'Más de 2.500 USD por artículo va a depreciación (línea 13).' },
  { id: 'seguros',      label: 'Seguros del negocio',          line: '15',  lineLabel: 'Seguros (no de salud)' },
  { id: 'intereses',    label: 'Intereses',                    line: '16c', lineLabel: 'Otros intereses' },
  { id: 'legal',        label: 'Legal y contable',             line: '17',  lineLabel: 'Servicios legales y profesionales' },
  { id: 'oficina',      label: 'Material de oficina',          line: '18',  lineLabel: 'Gastos de oficina' },
  { id: 'alquiler',     label: 'Alquiler de local o coworking', line: '20b', lineLabel: 'Alquiler de otros bienes' },
  { id: 'reparaciones', label: 'Reparaciones',                 line: '21',  lineLabel: 'Reparaciones y mantenimiento' },
  { id: 'suministros',  label: 'Suministros',                  line: '22',  lineLabel: 'Suministros' },
  { id: 'impuestos',    label: 'Impuestos y licencias',        line: '23',  lineLabel: 'Impuestos y licencias' },
  { id: 'viajes',       label: 'Viajes de trabajo',            line: '24a', lineLabel: 'Viajes' },
  { id: 'comidas',      label: 'Comidas de trabajo',           line: '24b', lineLabel: 'Comidas (50 %)', pct: 50 },
  { id: 'telefono',     label: 'Teléfono e internet',          line: '25',  lineLabel: 'Servicios (parte de negocio)' },
  { id: 'salarios',     label: 'Salarios',                     line: '26',  lineLabel: 'Salarios' },
  { id: 'software',     label: 'Software y suscripciones',     line: '27b', lineLabel: 'Otros gastos' },
  { id: 'hosting',      label: 'Hosting y dominios',           line: '27b', lineLabel: 'Otros gastos' },
  { id: 'ia',           label: 'APIs de IA',                   line: '27b', lineLabel: 'Otros gastos' },
  { id: 'formacion',    label: 'Formación',                    line: '27b', lineLabel: 'Otros gastos', cpa: 'Línea exacta sin verificar.' },
  { id: 'banco',        label: 'Comisiones bancarias',         line: '27b', lineLabel: 'Otros gastos' },
  { id: 'otro',         label: 'Otro',                         line: '27b', lineLabel: 'Otros gastos' },
];
const TAX_CATEGORY_BY_ID = new Map(TAX_CATEGORIES.map((c) => [c.id, c]));

export const INCOME_CATEGORIES = [
  { id: 'servicios', label: 'Servicios a clientes', line: '1' },
  { id: 'intereses', label: 'Intereses',            line: '6' },
  { id: 'otros',     label: 'Otros ingresos',       line: '6' },
];

/** Línea del Schedule C de un gasto: la suya si se fijó a mano; si no, la de su categoría. */
export function taxLineOf(expense) {
  if (expense && expense.tax_line) return String(expense.tax_line);
  const cat = TAX_CATEGORY_BY_ID.get(String(expense?.category || 'otro').toLowerCase());
  return cat ? cat.line : '27b';
}

/** Parte deducible de un gasto en centavos: % de uso de negocio y, en comidas, el 50 %. */
export function deductibleCents(expense) {
  const amount = Number(expense?.amount_cents || 0);
  const biz = expense?.business_pct == null ? 100 : Number(expense.business_pct);
  const cat = TAX_CATEGORY_BY_ID.get(String(expense?.category || '').toLowerCase());
  const pct = cat?.pct ?? 100;
  return Math.round(amount * (biz / 100) * (pct / 100));
}

// ── Cifras por año fiscal (con su fuente) ────────────────────────
// Tramos: hasta `upTo` USD de base imponible al `rate` (el último sin tope).
export const TAX_YEARS = {
  // 2025 solo para los 1099 y el millaje de ese año (sin tramos: el trimestral es de 2026).
  2025: {
    ssWageBase: 176100,
    nec1099Threshold: 600,
    standardDeduction: null,
    brackets: null,
    mileage: [{ from: '2025-01-01', to: '2025-12-31', cents: 70 }],
    estimatedDue: [],
    source: 'IRS, cifras de 2025 (instrucciones 1099 de 2025, tarifa de millaje 2025)',
  },
  2026: {
    ssWageBase: 184500,
    nec1099Threshold: 2000,
    standardDeduction: { single: 16100, mfj: 32200 },
    brackets: {
      single: [[12400, 10], [50400, 12], [105700, 22], [201775, 24], [256225, 32], [640600, 35], [Infinity, 37]],
      mfj:    [[24800, 10], [100800, 12], [211400, 22], [403550, 24], [512450, 32], [768700, 35], [Infinity, 37]],
    },
    mileage: [
      { from: '2026-01-01', to: '2026-06-30', cents: 72.5 },
      { from: '2026-07-01', to: '2026-12-31', cents: 76 },
    ],
    estimatedDue: ['2026-04-15', '2026-06-15', '2026-09-15', '2027-01-15'],
    source: 'IRS: Rev. Proc. 2025-32, Form 1040-ES 2026, tarifas de millaje 2026, instrucciones 1099 (dic-2026)',
  },
};

export function yearFigures(year) {
  return TAX_YEARS[Number(year)] || null;
}

/** Umbral del 1099-NEC para pagos de ese año, o null si el año no está documentado. */
export function nec1099Threshold(year) {
  const y = yearFigures(year);
  return y ? y.nec1099Threshold : null;
}

/** Impuesto federal progresivo sobre una base imponible (USD). */
export function progressiveTax(taxable, brackets) {
  let rest = Math.max(0, taxable);
  let prev = 0;
  let tax = 0;
  for (const [upTo, rate] of brackets) {
    const slice = Math.min(rest, upTo - prev);
    if (slice <= 0) break;
    tax += slice * (rate / 100);
    rest -= slice;
    prev = upTo;
  }
  return tax;
}

/**
 * Hoja del pago trimestral estimado (federal). Todo en USD con decimales; el
 * panel redondea al mostrar. Supuestos SIEMPRE devueltos para enseñarlos.
 *   ytdNet       beneficio neto del año hasta el último mes cerrado (USD)
 *   monthsElapsed meses que cubre ese neto (1..12)
 *   filing       'single' | 'mfj'
 *   paid         estimados ya pagados este año (USD)
 *   today        'YYYY-MM-DD' (para saber qué plazos quedan)
 *   share        parte del socio (0..1) si es sociedad; 1 si es individual
 */
export function quarterlyEstimate({ year, ytdNet, monthsElapsed, filing = 'single', paid = 0, today, share = 1 }) {
  const fig = yearFigures(year);
  if (!fig || !fig.brackets) {
    return { ok: false, error: `No hay cifras verificadas para ${year}. No se calcula: que tu contador ponga las del año.` };
  }
  const months = Math.min(Math.max(Number(monthsElapsed) || 0, 1), 12);
  const ytd = Number(ytdNet || 0) * share;
  const annualNet = (ytd / months) * 12;
  const seBase = Math.max(0, annualNet) * 0.9235;
  const ssPart = Math.min(seBase, fig.ssWageBase) * 0.124;
  const medicarePart = seBase * 0.029;
  const seTax = ssPart + medicarePart;
  const adjusted = annualNet - seTax / 2;
  const std = fig.standardDeduction[filing] ?? fig.standardDeduction.single;
  const taxable = Math.max(0, adjusted - std);
  const incomeTax = progressiveTax(taxable, fig.brackets[filing] || fig.brackets.single);
  const total = seTax + incomeTax;
  const due = fig.estimatedDue;
  const left = today ? due.filter((d) => d >= today) : due;
  const remaining = Math.max(0, total - Number(paid || 0));
  const perPayment = left.length ? remaining / left.length : remaining;
  return {
    ok: true,
    year: Number(year),
    ytdNet: ytd,
    annualNet,
    seTax,
    seDeductibleHalf: seTax / 2,
    incomeTax,
    totalAnnual: total,
    paid: Number(paid || 0),
    remaining,
    nextDue: left[0] || null,
    paymentsLeft: left.length,
    perPayment,
    assumptions: [
      `Año fiscal ${year}. ${fig.source}.`,
      `Beneficio anualizado: ${months} ${months === 1 ? 'mes' : 'meses'} cerrados llevados a 12.`,
      share === 1 ? 'Negocio de una persona (Schedule C).' : `Parte del socio: ${Math.round(share * 100)} %.`,
      filing === 'mfj' ? 'Declaración conjunta de matrimonio.' : 'Declaración individual (soltero).',
      'Sin otros ingresos fuera de Marcyan, con la deducción estándar.',
      'Sin la deducción QBI ni otras deducciones personales.',
      'Sin impuesto estatal sobre la renta (Texas y Florida no lo tienen).',
      'Comprobar el safe harbor con el impuesto de 2025 (100 % o 110 % si el AGI pasó de 150.000).',
    ],
  };
}

/** Plazos fiscales de un año (para el calendario del panel). */
export function taxCalendar(year) {
  const y = Number(year);
  const fig = yearFigures(y);
  const items = [];
  if (fig) {
    fig.estimatedDue.forEach((d, i) => items.push({ date: d, label: `Pago trimestral ${i + 1} de ${y}`, kind: 'estimated' }));
  }
  if (y === 2026) {
    items.push(
      { date: '2027-01-20', label: 'Impuesto de ventas de Texas (si ya tienen permiso)', kind: 'sales_tax' },
      { date: '2027-02-01', label: '1099-NEC de los pagos de 2026', kind: '1099' },
      { date: '2027-03-01', label: '1099-MISC en papel (31-mar en electrónico)', kind: '1099' },
      { date: '2027-03-15', label: 'Form 1065 y K-1 si es sociedad', kind: 'return' },
      { date: '2027-04-15', label: 'Declaración de 2026 (1040 con Schedule C)', kind: 'return' },
      { date: '2027-05-01', label: 'Informe anual de la LLC en Florida (si existe)', kind: 'state' },
      { date: '2027-05-17', label: 'Franchise tax o PIR de Texas (si es LLC)', kind: 'state' },
    );
  }
  return items.sort((a, b) => a.date.localeCompare(b.date));
}

/** Millaje deducible por tarifa estándar (centavos). */
export function mileageDeductionCents(trips, year) {
  const fig = yearFigures(year);
  if (!fig) return null;
  let cents = 0;
  for (const t of trips || []) {
    const d = String(t.trip_date || '').slice(0, 10);
    const rate = fig.mileage.find((r) => d >= r.from && d <= r.to);
    if (rate) cents += Number(t.miles || 0) * rate.cents;
  }
  return Math.round(cents);
}

// ── Cierre de mes: detección PURA de posibles duplicados ─────────
// Mismo importe, mismo proveedor (o concepto) y menos de 5 días entre ellos.
// Es un filtro, no una garantía: lo decide el dueño.
export function findDuplicates(expenses, days = 5) {
  const norm = (s) => String(s || '').trim().toLowerCase();
  const rows = [...(expenses || [])]
    .filter((e) => e && !e.subscription_id)
    .sort((a, b) => String(a.spent_at).localeCompare(String(b.spent_at)));
  const pairs = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i];
      const b = rows[j];
      const gap = (Date.parse(String(b.spent_at).slice(0, 10)) - Date.parse(String(a.spent_at).slice(0, 10))) / 864e5;
      if (gap > days) break;
      if (Number(a.amount_cents) !== Number(b.amount_cents)) continue;
      const ka = norm(a.vendor) || norm(a.label);
      const kb = norm(b.vendor) || norm(b.label);
      if (ka && ka === kb) pairs.push([String(a.id), String(b.id)]);
    }
  }
  return pairs;
}

/**
 * Gasto puesto a mano que repite el cargo automático de una suscripción: mismo
 * importe, 5 días o menos de diferencia y el nombre de la suscripción dentro del
 * proveedor o el concepto. Contarían doble como gasto. Devuelve pares [manual, cargo].
 */
export function findSubscriptionOverlaps(expenses, days = 5) {
  const norm = (s) => String(s || '').trim().toLowerCase();
  const all = expenses || [];
  const charges = all.filter((e) => e && e.subscription_id);
  const manual = all.filter((e) => e && !e.subscription_id);
  const pairs = [];
  for (const c of charges) {
    const name = norm(c.vendor) || norm(c.label);
    if (!name) continue;
    for (const m of manual) {
      if (Number(m.amount_cents) !== Number(c.amount_cents)) continue;
      const gap = Math.abs(Date.parse(String(m.spent_at).slice(0, 10)) - Date.parse(String(c.spent_at).slice(0, 10))) / 864e5;
      if (gap > days) continue;
      const text = `${norm(m.vendor)} ${norm(m.label)}`;
      if (text.includes(name)) pairs.push([String(m.id), String(c.id)]);
    }
  }
  return pairs;
}

/** Gastos de 75 USD o más sin recibo ni marca de «no hace falta» (Pub. 463). */
export function missingReceipts(expenses, minCents = 7500) {
  return (expenses || []).filter((e) =>
    Number(e.amount_cents) >= minCents && (e.receipt_status || 'none') === 'none' && !e.subscription_id);
}
