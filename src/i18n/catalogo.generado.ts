// ⚠️ GENERADO — no lo edites a mano.
// Sale de _cerebro/ventas/catalogo.json (bloque preciosPublicos) con `npm run sync:catalogo`.
// Son los precios PÚBLICOS: el mínimo que se cobra por cada servicio, siempre con «desde».
// Para cambiar uno: se cambia en el catálogo de Ventas y se vuelve a correr.
// `npm run check:precios` falla si este archivo y el catálogo no coinciden.

export const CATALOGO = {
  "version": "2026-11-19",
  "moneda": "USD",
  "vigenteDesde": "2026-11-19",
  "anclas": {
    "webLanding": 400,
    "webRedesign": 500,
    "web": 1500,
    "iaBasic": 500,
    "ia": 900,
    "aeoFoundations": 500,
    "aeoMonitoring": 200,
    "ecommerceEssential": 900,
    "ecommerce": 2900,
    "seoInitial": 300,
    "seoLocal": 399,
    "brandingLogo": 150,
    "branding": 750,
    "maintenance": 120
  },
  "mensuales": [
    "aeoMonitoring",
    "seoLocal",
    "maintenance"
  ],
  "desdePorCategoria": [
    {
      "categoria": "Diseño web",
      "ref": "webLanding",
      "desde": 400
    },
    {
      "categoria": "IA conversacional",
      "ref": "iaBasic",
      "desde": 500
    },
    {
      "categoria": "SEO para IA",
      "ref": "aeoFoundations",
      "desde": 500
    },
    {
      "categoria": "E-commerce y tiendas",
      "ref": "ecommerceEssential",
      "desde": 900
    },
    {
      "categoria": "SEO local",
      "ref": "seoInitial",
      "desde": 300,
      "desdeMensual": 399
    },
    {
      "categoria": "Branding e identidad",
      "ref": "brandingLogo",
      "desde": 150
    },
    {
      "categoria": "Mantenimiento",
      "ref": "maintenance",
      "desdeMensual": 120
    }
  ]
} as const;

export type AnclaId = keyof typeof CATALOGO.anclas;

/** Precio público de un nivel. En el sitio se enseña siempre con «desde». */
export function desde(id: AnclaId): number {
  const v = CATALOGO.anclas[id];
  if (typeof v !== 'number') throw new Error(`"${id}" no es un precio público.`);
  return v;
}

/** true si ese nivel se cobra mes a mes. */
export function esMensual(id: AnclaId): boolean {
  return (CATALOGO.mensuales as readonly string[]).includes(id);
}

/** "$1,500" a partir de 1500. */
export function usd(n: number): string {
  return '$' + n.toLocaleString('en-US');
}

/** "$399/mes" (es) · "$399/mo" (en). */
export function usdMes(n: number, lang: 'es' | 'en' = 'es'): string {
  return usd(n) + (lang === 'en' ? '/mo' : '/mes');
}
