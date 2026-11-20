// ⚠️ GENERADO — no lo edites a mano.
// Sale de _cerebro/ventas/catalogo.json (bloque preciosPublicos) con `npm run sync:catalogo`.
// Gemelo de src/i18n/catalogo.generado.ts, para lo que corre en el servidor.

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
};

/** Precio público de un nivel. Se enseña siempre con «desde». */
export function desde(id) {
  const v = CATALOGO.anclas[id];
  if (typeof v !== 'number') throw new Error(`"${id}" no es un precio público.`);
  return v;
}

/** true si ese nivel se cobra mes a mes. */
export function esMensual(id) {
  return CATALOGO.mensuales.includes(id);
}

/** "$1,500" a partir de 1500. */
export function usd(n) {
  return '$' + n.toLocaleString('en-US');
}
