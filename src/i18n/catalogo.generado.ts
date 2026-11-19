// ⚠️ GENERADO — no lo edites a mano.
// Sale de _cerebro/ventas/catalogo.json con `npm run sync:catalogo`.
// Para cambiar un precio: se cambia en el catálogo de Ventas y se vuelve a correr.
// `npm run check:precios` falla si este archivo y el catálogo no coinciden.

export const CATALOGO = {
  "version": "2026-11-18",
  "moneda": "USD",
  "proyectos": {
    "diagnostico": {
      "nombre": "Diagnóstico digital y de IA",
      "precio": 0
    },
    "fichaAlDia": {
      "nombre": "Ficha de Google al día",
      "precio": 199
    },
    "webPagina": {
      "nombre": "Página web de una página",
      "precio": 450
    },
    "webLanding": {
      "nombre": "Página web + ficha de Google",
      "precio": 550
    },
    "webRedesign": {
      "nombre": "Rediseño",
      "precio": 750,
      "segundoIdioma": 250
    },
    "web": {
      "nombre": "Web que vende",
      "precio": 1950
    },
    "webCiudades": {
      "nombre": "Web de servicios por ciudades",
      "desde": 3900
    },
    "iaBasic": {
      "nombre": "Asistente con IA básico",
      "precio": 650,
      "mensual": 99
    },
    "ia": {
      "nombre": "Asistente con IA completo",
      "precio": 1300,
      "mensual": 199
    },
    "reservas": {
      "nombre": "Reservas con depósito",
      "desde": 2900,
      "mensual": 149
    },
    "ecommerceEssential": {
      "nombre": "Tienda esencial",
      "precio": 1300
    },
    "ecommerce": {
      "nombre": "Tienda a medida",
      "precio": 3900
    },
    "seoInitial": {
      "nombre": "SEO inicial",
      "precio": 450
    },
    "aeoFoundations": {
      "nombre": "Cimientos de IA",
      "precio": 650
    },
    "brandingLogo": {
      "nombre": "Logo",
      "precio": 300
    },
    "branding": {
      "nombre": "Branding",
      "precio": 1050
    }
  },
  "planes": {
    "base": {
      "nivel": 1,
      "nombre": "Base",
      "en": "Base",
      "mensual": 139,
      "frase": "Tu web segura y al día"
    },
    "presencia": {
      "nivel": 2,
      "nombre": "Presencia",
      "en": "Presence",
      "mensual": 399,
      "frase": "Que te encuentren"
    },
    "crecimiento": {
      "nivel": 3,
      "nombre": "Crecimiento",
      "en": "Growth",
      "mensual": 699,
      "frase": "Que te llamen",
      "recomendado": true
    },
    "dominio": {
      "nivel": 4,
      "nombre": "Dominio",
      "en": "Lead",
      "mensual": 949,
      "frase": "Que la IA te recomiende"
    }
  },
  "anadidos": {
    "aeoMonitoring": {
      "nombre": "Seguimiento en IA",
      "mensual": 199
    }
  },
  "paquetes": [
    {
      "plan": "dominio",
      "proyecto": "webCiudades",
      "orden": 1,
      "papel": "ancla"
    },
    {
      "plan": "crecimiento",
      "proyecto": "web",
      "orden": 2,
      "papel": "recomendado"
    },
    {
      "plan": "presencia",
      "proyecto": "webLanding",
      "orden": 3,
      "papel": "entrada"
    }
  ],
  "desdePorServicio": [
    {
      "servicio": "Página web",
      "ref": "webPagina",
      "desde": 450,
      "mensual": "base"
    },
    {
      "servicio": "Ficha de Google",
      "ref": "fichaAlDia",
      "desde": 199,
      "mensual": "presencia"
    },
    {
      "servicio": "Rediseño",
      "ref": "webRedesign",
      "desde": 750,
      "mensual": "base"
    },
    {
      "servicio": "Tienda en línea",
      "ref": "ecommerceEssential",
      "desde": 1300,
      "mensual": "base"
    },
    {
      "servicio": "Asistente con IA",
      "ref": "iaBasic",
      "desde": 650,
      "cuotaMensual": 99
    },
    {
      "servicio": "Reservas con depósito",
      "ref": "reservas",
      "desde": 2900,
      "cuotaMensual": 149
    },
    {
      "servicio": "Aparecer en Google",
      "ref": "presencia",
      "desdeMensual": 399
    },
    {
      "servicio": "Aparecer en ChatGPT y Gemini",
      "ref": "aeoFoundations",
      "desde": 650,
      "mensual": "dominio"
    },
    {
      "servicio": "Logo y marca",
      "ref": "brandingLogo",
      "desde": 300
    }
  ]
} as const;

export type ProyectoId = keyof typeof CATALOGO.proyectos;
export type PlanId = keyof typeof CATALOGO.planes;

/** Precio de arranque de un proyecto: su `desde` si lo tiene, si no su `precio`. */
export function desde(id: ProyectoId): number {
  const p = CATALOGO.proyectos[id] as { precio?: number; desde?: number };
  const v = p.desde ?? p.precio;
  if (typeof v !== 'number') throw new Error(`El proyecto "${id}" no tiene precio.`);
  return v;
}

/** Cuota mensual de un proyecto (los que la tienen). */
export function mensualDe(id: ProyectoId): number {
  const p = CATALOGO.proyectos[id] as { mensual?: number };
  if (typeof p.mensual !== 'number') throw new Error(`El proyecto "${id}" no tiene mensualidad.`);
  return p.mensual;
}

/** Cuota mensual de un plan. */
export function mensualPlan(id: PlanId): number {
  return CATALOGO.planes[id].mensual;
}

/** "$1,950" a partir de 1950. */
export function usd(n: number): string {
  return '$' + n.toLocaleString('en-US');
}

/** "$199/mes" (es) · "$199/mo" (en). */
export function usdMes(n: number, lang: 'es' | 'en' = 'es'): string {
  return usd(n) + (lang === 'en' ? '/mo' : '/mes');
}
