// ─────────────────────────────────────────────────────────────
// Copy NUEVO de las landings v3 de tienda en línea (design/rediseno-workos.md §4.15,
// ola 2). Solo textos libres: eyebrow, bajada, tríada, títulos de sección, textos de
// objetos y nota de precio. Lo congelado (H1, answer, faq, local.paragraphs, service,
// meta, breadcrumb) se pinta tal cual desde clusters.ts, que no se toca.
// Reglas de copy: sin guiones como conector, "dominamos" la IA, nada inventado (lo de
// ejemplo va en objetos rotulados "Ejemplo" y la marca de ejemplo "Tu Tienda" nunca se
// traduce), precios solo de pricing.ts. Los impuestos son los datos reales que ya
// citan las páginas (Texas 6.25 % + local = 8.25 % en Houston; Florida 6 % + 1 % de
// Miami-Dade = 7 %).
// Sin cola en el H1: "Diseño de tienda en línea en Houston" ya ocupa 2 líneas a 1440 en
// la columna del hero partido; la idea de la cola ("vende mientras duermes") va en la
// bajada (regla de longitud, §2.14).
// ─────────────────────────────────────────────────────────────

export type ShopCity = 'houston' | 'miami';

export interface TileCopy { icon: string; name: string; sub: string }
export interface ShopCopy {
  chip: string;
  cityName: string;
  eyebrow: string;
  lead: string;
  primary: string;
  link: string;
  triada: [
    { tone1: string; tone2: string; text: string },
    { tone1: string; tone2: string; text: string },
    { tone1: string; tone2: string; text: string },
  ];
  pasos: {
    label: string; title: string; lead: string;
    steps: [{ label: string; title: string; text: string }, { label: string; title: string; text: string }, { label: string; title: string; text: string }];
  };
  conectado: {
    label: string; title: string; lead: string; app: string; platforms: string;
    tabs: { id: string; label: string; tiles: TileCopy[] }[];
    more: string; moreSub: string; sr: string;
  };
  dia: {
    tone1: string; tone2: string; sub: string; title: string; text: string;
    rows: { icon: string; label: string; chip: string; tone: 'ok' | 'pass' | 'off' }[];
  };
  incluye: {
    label: string; title: string; lead: string;
    cells: { icon: string; label: string; titleHtml: string; text: string; ui: MiniKind }[];
  };
  /** Datos del impuesto para los objetos de ejemplo (datos reales de la página). */
  tax: { state: string; stateRate: string; localLabel: string; localRate: string; total: string; rate: number };
  prosa: { tone1: string; tone2: string };
  precio: { eyebrow: string; title: string; cta: string };
  proyectos: { label: string; title: string; lead: string; more: string; addCell: string };
  franja: { queEs: string; desdeTitle: string; tiempoTitle: string; tiempo: string; verQue: string; verPrecios: string; pedir: string };
  hermanas: { title: string; lead: string; guia: { title: string; text: string }; diag: { title: string; text: string }; precios: { title: string; text: string } };
  cierre: { proof: string; warmTitle: string; warmText: string; warmCta: string };
}

export type MiniKind = 'catalogo' | 'pago' | 'pedido' | 'idiomas' | 'variantes' | 'recibo' | 'plataforma' | 'busqueda';

const triada: ShopCopy['triada'] = [
  { tone1: 'Vende.', tone2: 'A cualquier hora.', text: 'Tu catálogo abierto día y noche, pensado primero para el celular.' },
  { tone1: 'Cobra.', tone2: 'Sin complicarte.', text: 'Tarjeta y PayPal con pasarelas confiables como Stripe. Te guiamos con la cuenta.' },
  { tone1: 'Avisa.', tone2: 'A ti y a tu cliente.', text: 'Cada pedido te llega con aviso y tu cliente recibe su confirmación.' },
];

const plataforma = {
  icon: 'lucide:settings', label: 'Plataforma', titleHtml: 'La plataforma correcta para ti',
  text: 'Shopify, WooCommerce o a medida, según tu producto y tu presupuesto. Te explicamos por qué antes de elegir.',
  ui: 'plataforma' as MiniKind,
};

const mensajeria: TileCopy[] = [
  { icon: 'lucide:mail', name: 'Confirmación', sub: 'Correo al cliente' },
  { icon: 'lucide:bell', name: 'Pedido nuevo', sub: 'Aviso para ti' },
  { icon: 'lucide:message-circle', name: 'WhatsApp', sub: 'Botón en tu tienda' },
  { icon: 'lucide:languages', name: 'En su idioma', sub: 'Español o inglés' },
  { icon: 'lucide:bot', name: 'Marcy', sub: 'Servicio aparte' },
];

const franja: ShopCopy['franja'] = {
  queEs: 'Qué es',
  desdeTitle: 'Desde cuánto',
  tiempoTitle: 'En cuánto tiempo',
  tiempo: 'Propuesta en 24 horas. Te damos un calendario realista desde el inicio.',
  verQue: 'Ver qué incluye',
  verPrecios: 'Ver precios',
  pedir: 'Pedir propuesta',
};

const warm = {
  warmTitle: '¿Aún no sabes qué necesitas?',
  warmText: 'Revisa gratis si tu negocio está perdiendo clientes online.',
  warmCta: 'Hacer el diagnóstico',
};

const precio: ShopCopy['precio'] = { eyebrow: 'Inversión', title: 'Tu tienda, con el precio a la vista', cta: 'Cotizar mi tienda' };

const proyectos = (lead: string): ShopCopy['proyectos'] => ({
  label: 'Trabajo real',
  title: 'Construimos a medida. Tu tienda puede ser la primera.',
  lead,
  more: 'Webs y apps nuestras, en uso',
  addCell: 'Tu tienda aquí',
});

export const shopCopy: Record<ShopCity, ShopCopy> = {
  houston: {
    chip: 'Houston, TX',
    cityName: 'Houston',
    eyebrow: 'Tienda',
    lead: 'Tu tienda a medida, en español e inglés, que vende mientras duermes: catálogo, pagos seguros y entrega en Houston o recogida en tu negocio.',
    primary: 'Quiero mi tienda',
    link: 'Ver precios',
    triada,
    pasos: {
      label: 'Del carrito al pago',
      title: 'Así te compra tu cliente',
      lead: 'Tres pasos, desde el celular y en su idioma. Tú recibes el pedido ya pagado.',
      steps: [
        { label: 'Paso 01', title: 'Elige en tu catálogo', text: 'Fotos, variantes y precios claros, en español y en inglés.' },
        { label: 'Paso 02', title: 'Paga seguro', text: 'Con tarjeta o PayPal. El impuesto de Texas se calcula solo.' },
        { label: 'Paso 03', title: 'Pedido listo', text: 'Te llega con todo: qué compró, cómo pagó y cómo lo recibe.' },
      ],
    },
    conectado: {
      label: 'Todo conectado',
      title: 'Pagos, entregas y avisos, en tu tienda',
      lead: 'Lo dejamos todo funcionando desde el primer día, en la plataforma que elijamos contigo.',
      app: 'Tu Tienda',
      platforms: 'Shopify, WooCommerce o a medida',
      tabs: [
        { id: 'pagos', label: 'Pagos', tiles: [
          { icon: 'lucide:credit-card', name: 'Tarjeta', sub: 'Crédito y débito' },
          { icon: 'lucide:wallet', name: 'Stripe', sub: 'Pasarela de pago' },
          { icon: 'lucide:wallet', name: 'PayPal', sub: 'Pago con su cuenta' },
          { icon: 'lucide:lock', name: 'Pago seguro', sub: 'Conexión cifrada' },
          { icon: 'lucide:tag', name: 'Cupones', sub: 'Para tus ofertas' },
        ] },
        { id: 'entregas', label: 'Entregas', tiles: [
          { icon: 'lucide:truck', name: 'Entrega local', sub: 'Por zonas de Houston' },
          { icon: 'lucide:map-pin', name: 'Zonas', sub: 'Cada una con su costo' },
          { icon: 'lucide:store', name: 'Recogida', sub: 'En tu negocio' },
          { icon: 'lucide:package', name: 'Paquetería', sub: 'Fuera de tu zona' },
          { icon: 'lucide:receipt', name: 'Costo claro', sub: 'Antes de pagar' },
        ] },
        { id: 'mensajes', label: 'Mensajería', tiles: mensajeria },
      ],
      more: 'A medida',
      moreSub: 'Lo que necesites',
      sr: 'Ejemplo: tu tienda conectada con pagos (tarjeta, Stripe, PayPal, cupones), entregas (entrega local, zonas, recogida, paquetería) y mensajería (confirmación al cliente, aviso de pedido nuevo, botón de WhatsApp).',
    },
    dia: {
      tone1: 'Abrir la tienda es el principio.',
      tone2: 'Lo que cuenta es cada día.',
      sub: 'Así se ve un día normal con tu tienda funcionando: pedidos, cobros y entregas en orden.',
      title: 'El día de tu tienda',
      text: 'Los pedidos entran pagados, el inventario se descuenta solo y tu cliente sabe cuándo recibe. Tú preparas y entregas.',
      rows: [
        { icon: 'lucide:mail', label: 'Confirmación a Luis M.', chip: 'Enviada', tone: 'pass' },
        { icon: 'lucide:package', label: 'Inventario de velas', chip: 'Al día', tone: 'pass' },
        { icon: 'lucide:shopping-bag', label: 'Pedido de Ana R.', chip: 'Pagado', tone: 'ok' },
        { icon: 'lucide:truck', label: 'Entrega local en tu zona', chip: 'Preparada', tone: 'pass' },
        { icon: 'lucide:store', label: 'Recogida en tu negocio', chip: 'Lista', tone: 'pass' },
      ],
    },
    incluye: {
      label: 'Qué incluye',
      title: 'Una tienda lista para vender en Houston',
      lead: 'Lo que llevas desde el primer día, con el precio claro antes de empezar.',
      cells: [
        { icon: 'lucide:languages', label: 'Idiomas', titleHtml: 'Bilingüe, español e inglés', text: 'La misma tienda en los dos idiomas: tu comunidad en español y todo Houston en inglés.', ui: 'idiomas' },
        { icon: 'lucide:shopping-bag', label: 'Catálogo', titleHtml: 'Catálogo y carrito', text: 'Tallas, colores y precios claros, y un carrito que no se pierde en el celular.', ui: 'variantes' },
        { icon: 'lucide:receipt', label: 'Impuesto', titleHtml: 'Impuesto de Texas configurado', text: 'La tienda cobra lo que corresponde: 6.25 % estatal más la parte local, 8.25 % en Houston.', ui: 'recibo' },
        plataforma,
      ],
    },
    tax: { state: 'Texas', stateRate: '6.25 %', localLabel: 'Parte local', localRate: '2 %', total: '8.25 %', rate: 0.0825 },
    prosa: { tone1: 'Por qué en Houston.', tone2: 'Una tienda pensada para vender en Texas.' },
    precio,
    proyectos: proyectos('Todavía no publicamos una tienda propia. Estas son webs y apps a medida que hicimos y ya están en uso.'),
    franja,
    hermanas: {
      title: "<span class='w-tone'>Tu tienda vende.</span> Lo demás le trae clientes.",
      lead: 'Servicios de Marcyan en Houston que se conectan con tu tienda.',
      guia: { title: 'Guía de precios de una web', text: 'Cuánto cuesta una página web en Houston.' },
      diag: { title: 'Diagnóstico gratis', text: 'Revisa si tu negocio pierde clientes online.' },
      precios: { title: 'Precios', text: 'Todos los precios de entrada, a la vista.' },
    },
    cierre: { proof: 'Elegimos contigo la plataforma y te guiamos con la cuenta de pagos, paso a paso.', ...warm },
  },
  miami: {
    chip: 'Miami, FL',
    cityName: 'Miami',
    eyebrow: 'Tienda',
    lead: 'Tu tienda a medida, en español e inglés, que vende mientras duermes: pagos seguros para tu cliente de Miami y para el que te compra desde fuera.',
    primary: 'Quiero mi tienda',
    link: 'Ver precios',
    triada,
    pasos: {
      label: 'Del carrito al pago',
      title: 'Así te compra tu cliente',
      lead: 'Tres pasos, desde el celular y en su idioma. Tú recibes el pedido ya pagado.',
      steps: [
        { label: 'Paso 01', title: 'Elige en tu catálogo', text: 'Fotos, variantes y precios claros, en español y en inglés.' },
        { label: 'Paso 02', title: 'Paga seguro', text: 'Con tarjeta o PayPal, también desde fuera. El impuesto de Florida se calcula solo.' },
        { label: 'Paso 03', title: 'Pedido listo', text: 'Te llega con todo: qué compró, cómo pagó y a dónde se envía.' },
      ],
    },
    conectado: {
      label: 'Todo conectado',
      title: 'Pagos, envíos y avisos, en tu tienda',
      lead: 'Lo dejamos todo funcionando desde el primer día, en la plataforma que elijamos contigo.',
      app: 'Tu Tienda',
      platforms: 'Shopify, WooCommerce o a medida',
      tabs: [
        { id: 'pagos', label: 'Pagos', tiles: [
          { icon: 'lucide:credit-card', name: 'Tarjeta', sub: 'Crédito y débito' },
          { icon: 'lucide:wallet', name: 'Stripe', sub: 'Pasarela de pago' },
          { icon: 'lucide:wallet', name: 'PayPal', sub: 'Pago con su cuenta' },
          { icon: 'lucide:globe', name: 'Tarjetas de fuera', sub: 'También de Latinoamérica' },
          { icon: 'lucide:tag', name: 'Cupones', sub: 'Para tus ofertas' },
        ] },
        { id: 'envios', label: 'Envíos', tiles: [
          { icon: 'lucide:truck', name: 'Miami', sub: 'Entrega en la ciudad' },
          { icon: 'lucide:package', name: 'Otros estados', sub: 'Tarifa por destino' },
          { icon: 'lucide:globe', name: 'Latinoamérica', sub: 'Si tu producto lo permite' },
          { icon: 'lucide:map-pin', name: 'Tarifas por país', sub: 'Cada una con su costo' },
          { icon: 'lucide:receipt', name: 'Costo claro', sub: 'Antes de pagar' },
        ] },
        { id: 'mensajes', label: 'Mensajería', tiles: mensajeria },
      ],
      more: 'A medida',
      moreSub: 'Lo que necesites',
      sr: 'Ejemplo: tu tienda conectada con pagos (tarjeta, Stripe, PayPal, tarjetas de fuera, cupones), envíos (Miami, otros estados, Latinoamérica) y mensajería (confirmación al cliente, aviso de pedido nuevo, botón de WhatsApp).',
    },
    dia: {
      tone1: 'Abrir la tienda es el principio.',
      tone2: 'Lo que cuenta es cada día.',
      sub: 'Así se ve un día normal con tu tienda funcionando: pedidos, cobros y envíos en orden.',
      title: 'El día de tu tienda',
      text: 'Los pedidos entran pagados, el inventario se descuenta solo y tu cliente sabe cuándo recibe, aquí o fuera. Tú preparas y envías.',
      rows: [
        { icon: 'lucide:mail', label: 'Confirmación a Luis M.', chip: 'Enviada', tone: 'pass' },
        { icon: 'lucide:package', label: 'Inventario de velas', chip: 'Al día', tone: 'pass' },
        { icon: 'lucide:shopping-bag', label: 'Pedido de Ana R.', chip: 'Pagado', tone: 'ok' },
        { icon: 'lucide:truck', label: 'Envío dentro de Miami', chip: 'Preparado', tone: 'pass' },
        { icon: 'lucide:globe', label: 'Envío a Latinoamérica', chip: 'En camino', tone: 'pass' },
      ],
    },
    incluye: {
      label: 'Qué incluye',
      title: 'Una tienda para vender en Miami y más allá',
      lead: 'Lo que llevas desde el primer día, con el precio claro antes de empezar.',
      cells: [
        { icon: 'lucide:languages', label: 'Idiomas', titleHtml: 'Catálogo en dos idiomas', text: 'Fichas escritas en español y en inglés, no traducidas a máquina, para la comunidad de aquí y la de fuera.', ui: 'idiomas' },
        { icon: 'lucide:search', label: 'Búsquedas', titleHtml: 'Lista para Google y la IA', text: 'Que tu tienda salga cuando buscan tu producto en Miami, en Google y en asistentes de IA.', ui: 'busqueda' },
        { icon: 'lucide:receipt', label: 'Impuesto', titleHtml: 'Impuesto de Florida configurado', text: 'La tienda cobra lo que toca: 6 % estatal y 1 % de Miami-Dade, un 7 % en total.', ui: 'recibo' },
        plataforma,
      ],
    },
    tax: { state: 'Florida', stateRate: '6 %', localLabel: 'Miami-Dade', localRate: '1 %', total: '7 %', rate: 0.07 },
    prosa: { tone1: 'Por qué Miami.', tone2: 'Vende aquí y vende fuera.' },
    precio,
    proyectos: proyectos('Todavía no publicamos una tienda propia ni un caso en Miami. Estas son webs y apps a medida que hicimos en Florida (Orlando) y en Houston, y ya están en uso.'),
    franja,
    hermanas: {
      title: "<span class='w-tone'>Tu tienda vende.</span> Lo demás le trae clientes.",
      lead: 'Servicios de Marcyan que se conectan con tu tienda.',
      guia: { title: 'Guía de precios de una web', text: 'Cuánto cuesta una página web, con precios reales.' },
      diag: { title: 'Diagnóstico gratis', text: 'Revisa si tu negocio pierde clientes online.' },
      precios: { title: 'Precios', text: 'Todos los precios de entrada, a la vista.' },
    },
    cierre: { proof: 'Elegimos contigo la plataforma y te guiamos con la cuenta de pagos, paso a paso.', ...warm },
  },
};
