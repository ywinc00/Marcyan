// ─────────────────────────────────────────────────────────────
// NEGOCIOS DE EJEMPLO · datos de las 6 marcas inventadas (design/rediseno-workos-v2.md §1.6 y §2, P02a)
//
// Marcas INVENTADAS por nosotros ("Tu …"), nunca de un cliente (E-32, E-47). Sin precios, sin
// estrellas, sin número de reseñas, sin teléfonos reales: el número es del rango 555-01xx
// reservado para ficción. Horas en 12 h ("6 p. m." / "6 PM").
//
// Paletas: { bg, ink, ink2, accent, onAccent }. Todas MEDIDAS (WCAG 2.x):
//   ink/bg ≥ 7 · ink2/bg ≥ 4.5 · accent/bg ≥ 4.5 (el acento también se usa como texto)
//   · onAccent/accent ≥ 4.5. Ver la tabla de contraste al final del archivo.
// `paletaNoche` es la misma marca en oscuro (control "Modo" de P01). Cada `alternativa` es una
// paleta COMPLETA con nombre propio de la marca y su propia versión de noche.
//
// Estado (P02a): `plomeria` TERMINADA (textos de las 3 páginas). El resto lleva logotipo y paleta
// finales y el contenido mínimo (titular + una acción); P02b las termina.
// ─────────────────────────────────────────────────────────────

export type NegocioId = 'plomeria' | 'salon' | 'restaurante' | 'tienda' | 'inmobiliaria' | 'marca';
export type Lang = 'es' | 'en';
export type Paleta = { bg: string; ink: string; ink2: string; accent: string; onAccent: string };
export type Alternativa = Paleta & { id: string; nombre: Record<Lang, string>; noche: Paleta };
export type Boton = 'fill' | 'outline' | 'pill';

/** Textos de una página de ejemplo. Solo `titular` y `accion` son obligatorios (contenido mínimo). */
export interface TextosNegocio {
  /** Rótulo mono sobre el titular. `{city}` se sustituye. */
  antetitulo?: string;
  titular: string;
  bajada?: string;
  /** Texto de la acción principal (siempre un `span`, nunca un enlace). */
  accion: string;
  /** La acción es una llamada: lleva el glifo de teléfono y el número de ficción. */
  accionTel?: boolean;
  /** "Abierto · cierra 6 p. m." */
  abierto?: string;
  nav?: [string, string, string];
  garantias?: [string, string, string];
  /** Segunda franja de la vista `completa` y página `servicios`. */
  servicios?: { rotulo: string; titulo: string; intro: string; filas: { t: string; d: string }[]; accionFila: string };
  /** Página `contacto`. */
  contacto?: { titulo: string; intro: string; horario: { d: string; h: string }[]; campos: [string, string, string]; enviar: string; zona: string };
  /** Estado `antes`: la misma marca con una web anticuada pero digna. */
  antes?: { bienvenida: string; texto: string; llamada: string; nav: string[]; pie: string };
}

export interface Negocio {
  id: NegocioId;
  nombre: Record<Lang, string>;
  dominio: string;
  paleta: Paleta;
  paletaNoche: Paleta;
  alternativas: [Alternativa, Alternativa, Alternativa];
  /** Clave de los trazados del logotipo en LogoEjemplo.astro (palabra contorneada + signo). En una web
   *  de ejemplo se pinta como <use> del symbol `ej-s-logo-<logo>-<lang>` del sprite de la página. */
  logo: NegocioId;
  /** Id de Ilustracion.astro (signo grande del hero), si la marca lo lleva. */
  ilustracion?: string;
  /** Foto AVIF ≤ 30 KB: SOLO con el OK del dueño (decisión §5-12). Por defecto, ninguna. */
  foto?: string;
  /** Botón por defecto de la marca (el personalizador lo cambia con data-ej-btn). */
  boton: Boton;
  /** Radio base en px (Marcos: rectas 2 · suaves 10 · redondas 24). */
  radio: number;
  /** Teléfono de ficción (rango 555-01xx). */
  telefono: string;
  textos: Record<Lang, TextosNegocio>;
}

const NO_FOTO = undefined;

export const negocios: Record<NegocioId, Negocio> = {
  plomeria: {
    id: 'plomeria',
    nombre: { es: 'Tu Plomería', en: 'Your Plumbing' },
    dominio: 'tuplomeria.example',
    // Cobre del plan (#B5652F) oscurecido a #A3561F: con el papel daba 3,9 (no AA como texto).
    paleta:      { bg: '#F3EFE6', ink: '#14232B', ink2: '#4E5A5F', accent: '#A3561F', onAccent: '#FFF8F0' },
    paletaNoche: { bg: '#121A1F', ink: '#EEE7DB', ink2: '#A9B0B0', accent: '#E0935C', onAccent: '#1A0F07' },
    alternativas: [
      { id: 'pino', nombre: { es: 'Pino', en: 'Pine' },
        bg: '#F2EFE7', ink: '#1F3A2E', ink2: '#4F5F55', accent: '#2F6B4F', onAccent: '#F4F1EA',
        noche: { bg: '#101A15', ink: '#E8EFE7', ink2: '#A3B3A8', accent: '#7FC3A0', onAccent: '#0D1A13' } },
      { id: 'pizarra', nombre: { es: 'Pizarra', en: 'Slate' },
        bg: '#EEF0F1', ink: '#2B3440', ink2: '#56606B', accent: '#3E5E7E', onAccent: '#F5F7F8',
        noche: { bg: '#14181D', ink: '#E6EAEE', ink2: '#A2ABB5', accent: '#8FB2D6', onAccent: '#0E141B' } },
      { id: 'mostaza', nombre: { es: 'Mostaza', en: 'Mustard' },
        bg: '#F6F0E1', ink: '#2A2316', ink2: '#5E5442', accent: '#8F6414', onAccent: '#FFF9EC',
        noche: { bg: '#1A160D', ink: '#F3EBDA', ink2: '#B9AE97', accent: '#D9A441', onAccent: '#1A1305' } },
    ],
    logo: 'plomeria',
    ilustracion: 'codo-gota',
    foto: NO_FOTO,
    boton: 'pill',
    radio: 10,
    telefono: '(281) 555-0142',
    textos: {
      es: {
        antetitulo: 'Plomeros en {city}',
        titular: 'Plomería sin sorpresas.',
        bajada: 'Fugas, drenajes y calentadores. Vamos hoy mismo.',
        accion: 'Llamar',
        accionTel: true,
        abierto: 'Abierto · cierra 6 p. m.',
        nav: ['Servicios', 'Urgencias', 'Contacto'],
        garantias: ['Presupuesto antes de empezar', 'Urgencias', 'Español e inglés'],
        servicios: {
          rotulo: 'Qué arreglamos',
          titulo: 'Servicios',
          intro: 'Lo que arreglamos en {city} y alrededores.',
          filas: [
            { t: 'Fugas', d: 'Agua en paredes, techos y patios' },
            { t: 'Drenajes', d: 'Fregaderos, baños y desagües' },
            { t: 'Calentadores', d: 'Reparación y cambio' },
          ],
          accionFila: 'Pedir presupuesto',
        },
        contacto: {
          titulo: 'Hablemos.',
          intro: 'Cuéntanos qué pasa y te decimos el precio antes de ir.',
          horario: [
            { d: 'Lunes a viernes', h: '8:00 a. m. a 6:00 p. m.' },
            { d: 'Sábado', h: '9:00 a. m. a 1:00 p. m.' },
            { d: 'Urgencias', h: 'Todos los días' },
          ],
          campos: ['Nombre', 'Teléfono', '¿Qué pasa?'],
          enviar: 'Enviar',
          zona: '{city} y alrededores',
        },
        antes: {
          bienvenida: 'Bienvenidos a Tu Plomería',
          texto: 'Somos una empresa de plomería con servicio en {city}. Ofrecemos reparación de fugas, destape de drenajes, instalación de calentadores y mucho más. Nuestro equipo está listo para ayudarle. No dude en contactarnos para cualquier consulta.',
          llamada: '¡Llámenos hoy!',
          nav: ['Inicio', 'Nosotros', 'Servicios', 'Galería', 'Contacto'],
          pie: '© Tu Plomería. Todos los derechos reservados.',
        },
      },
      en: {
        antetitulo: '{city} plumbers',
        titular: 'Plumbing, no surprises.',
        bajada: 'Leaks, drains and water heaters. We come out today.',
        accion: 'Call',
        accionTel: true,
        abierto: 'Open · closes 6 PM',
        nav: ['Services', 'Emergencies', 'Contact'],
        garantias: ['Upfront quotes', 'Emergencies', 'Spanish and English'],
        servicios: {
          rotulo: 'What we fix',
          titulo: 'Services',
          intro: 'What we fix in and around {city}.',
          filas: [
            { t: 'Leaks', d: 'Water in walls, ceilings and yards' },
            { t: 'Drains', d: 'Sinks, toilets and floor drains' },
            { t: 'Water heaters', d: 'Repair and replacement' },
          ],
          accionFila: 'Get a quote',
        },
        contacto: {
          titulo: "Let's talk.",
          intro: "Tell us what's going on and we'll quote it before we come out.",
          horario: [
            { d: 'Monday to Friday', h: '8:00 AM to 6:00 PM' },
            { d: 'Saturday', h: '9:00 AM to 1:00 PM' },
            { d: 'Emergencies', h: 'Every day' },
          ],
          campos: ['Name', 'Phone', "What's going on?"],
          enviar: 'Send',
          zona: '{city} and nearby',
        },
        antes: {
          bienvenida: 'Welcome to Your Plumbing',
          texto: 'We are a plumbing company serving {city}. We offer leak repair, drain cleaning, water heater installation and much more. Our team is ready to help you. Please do not hesitate to contact us with any questions.',
          llamada: 'Call us today!',
          nav: ['Home', 'About', 'Services', 'Gallery', 'Contact'],
          pie: '© Your Plumbing. All rights reserved.',
        },
      },
    },
  },

  // ── Contenido mínimo (P02b las termina) ──────────────────────
  salon: {
    id: 'salon',
    nombre: { es: 'Tu Salón', en: 'Your Salon' },
    dominio: 'tusalon.example',
    paleta:      { bg: '#D5DACB', ink: '#1E2420', ink2: '#46504A', accent: '#7A4A3B', onAccent: '#F6EFEA' },
    paletaNoche: { bg: '#171B18', ink: '#E7EBE0', ink2: '#A7AFA4', accent: '#D69C88', onAccent: '#1E120D' },
    alternativas: [
      { id: 'arcilla', nombre: { es: 'Arcilla', en: 'Clay' },
        bg: '#EFE3D8', ink: '#2B1E18', ink2: '#5C4B41', accent: '#8A4B32', onAccent: '#FBF3EC',
        noche: { bg: '#1B1410', ink: '#F2E6DB', ink2: '#B7A595', accent: '#E0A07F', onAccent: '#1E100A' } },
      { id: 'ciruela', nombre: { es: 'Ciruela', en: 'Plum' },
        bg: '#EDE6EA', ink: '#2A1C26', ink2: '#5D4C57', accent: '#6E3A5E', onAccent: '#FAF2F7',
        noche: { bg: '#18121A', ink: '#F0E6EC', ink2: '#B3A2AD', accent: '#D29BC0', onAccent: '#1E0F19' } },
      { id: 'lino', nombre: { es: 'Lino', en: 'Linen' },
        bg: '#F3EFE7', ink: '#22201C', ink2: '#57524A', accent: '#5E5A3A', onAccent: '#F8F6EE',
        noche: { bg: '#161512', ink: '#EFEBE2', ink2: '#ABA697', accent: '#C3BD8E', onAccent: '#17150A' } },
    ],
    logo: 'salon', boton: 'pill', radio: 24, telefono: '(281) 555-0117',
    textos: {
      es: { titular: 'Tu cita, sin esperar.', accion: 'Reservar', abierto: 'Abierto · cierra 7 p. m.' },
      en: { titular: 'Your appointment, no waiting.', accion: 'Book', abierto: 'Open · closes 7 PM' },
    },
  },

  restaurante: {
    id: 'restaurante',
    nombre: { es: 'Tu Restaurante', en: 'Your Restaurant' },
    dominio: 'turestaurante.example',
    // Campo pleno terracota (lección de Monte, plan #B5532F): con crema encima daba 4,6 / 3,6, así que
    // se oscurece a #8E3A1E (ladrillo) para que tinta, tinta 2 y acento pasen la misma regla que el resto.
    // El acento es un mantequilla claro (texto sobre el campo) y el botón es de contorno en crema.
    paleta:      { bg: '#8E3A1E', ink: '#FFF6EC', ink2: '#F2D8C4', accent: '#F7D9A0', onAccent: '#3A1A0C' },
    paletaNoche: { bg: '#1C120D', ink: '#F6EBDD', ink2: '#BFA997', accent: '#E58A62', onAccent: '#200F07' },
    alternativas: [
      { id: 'oliva', nombre: { es: 'Oliva', en: 'Olive' },
        bg: '#F1EEE2', ink: '#23251A', ink2: '#555848', accent: '#56622F', onAccent: '#F7F6EE',
        noche: { bg: '#15160F', ink: '#EEEEE2', ink2: '#A9AB98', accent: '#B5C27F', onAccent: '#161A08' } },
      { id: 'azafran', nombre: { es: 'Azafrán', en: 'Saffron' },
        bg: '#FAF1DE', ink: '#2B2010', ink2: '#5F5137', accent: '#8C5A0E', onAccent: '#FFF8E9',
        noche: { bg: '#1B150A', ink: '#F7EEDA', ink2: '#BBAE92', accent: '#E3AE4F', onAccent: '#1D1404' } },
      { id: 'carbon', nombre: { es: 'Carbón', en: 'Charcoal' },
        bg: '#EFEDEA', ink: '#1A1A1A', ink2: '#4F4D4A', accent: '#8C3B2B', onAccent: '#FBF4F2',
        noche: { bg: '#121212', ink: '#EDEBE8', ink2: '#A7A4A0', accent: '#E39482', onAccent: '#200D09' } },
    ],
    logo: 'restaurante', boton: 'outline', radio: 2, telefono: '(305) 555-0163',
    // v8 (2026-11-08): textos completos para que diseño web en Miami tenga su propio negocio (no la plomería de Houston).
    textos: {
      es: {
        antetitulo: 'Cocina de casa en {city}', titular: 'Cocina de casa, hoy.', bajada: 'Almuerzo y cena con receta de familia. Para comer aquí o llevar.',
        accion: 'Ver la carta', abierto: 'Hoy desde 11 a. m.',
        nav: ['Carta', 'Encargos', 'Contacto'],
        servicios: { rotulo: 'La carta', titulo: 'Lo de siempre', intro: 'Lo que más piden en {city}.', filas: [
          { t: 'Ropa vieja', d: 'Con arroz, frijoles y maduros' },
          { t: 'Pollo asado', d: 'Al mojo, con yuca' },
          { t: 'Encargos', d: 'Bandejas para fiestas y oficinas' },
        ], accionFila: 'Pedir' },
        contacto: { titulo: 'Reserva o encarga.', intro: 'Dinos para cuántos y a qué hora, y te lo tenemos listo.', horario: [
          { d: 'Lunes a jueves', h: '11:00 a. m. a 10:00 p. m.' }, { d: 'Viernes y sábado', h: '11:00 a. m. a 11:00 p. m.' }, { d: 'Domingo', h: '11:00 a. m. a 9:00 p. m.' },
        ], campos: ['Nombre', 'Teléfono', '¿Para cuántos?'], enviar: 'Enviar', zona: '{city}' },
        antes: { bienvenida: 'Bienvenidos a Tu Restaurante', texto: 'Somos un restaurante familiar en {city}. Ofrecemos comida casera, almuerzos, cenas y servicio de encargos para eventos. Nuestro menú tiene platos para todos los gustos. Visítenos o llámenos para más información.', llamada: '¡Visítenos hoy!', nav: ['Inicio', 'Nosotros', 'Menú', 'Galería', 'Contacto'], pie: '© Tu Restaurante. Todos los derechos reservados.' },
      },
      en: {
        antetitulo: 'Home cooking in {city}', titular: 'Home cooking, today.', bajada: 'Lunch and dinner from family recipes. Dine in or take out.',
        accion: 'See the menu', abierto: 'Today from 11 AM',
        nav: ['Menu', 'Catering', 'Contact'],
        servicios: { rotulo: 'The menu', titulo: 'The usuals', intro: 'What {city} orders most.', filas: [
          { t: 'Ropa vieja', d: 'With rice, beans and plantains' },
          { t: 'Roast chicken', d: 'Mojo style, with yuca' },
          { t: 'Catering', d: 'Trays for parties and offices' },
        ], accionFila: 'Order' },
        contacto: { titulo: 'Book or order ahead.', intro: 'Tell us how many and what time, and we will have it ready.', horario: [
          { d: 'Monday to Thursday', h: '11:00 AM to 10:00 PM' }, { d: 'Friday and Saturday', h: '11:00 AM to 11:00 PM' }, { d: 'Sunday', h: '11:00 AM to 9:00 PM' },
        ], campos: ['Name', 'Phone', 'How many?'], enviar: 'Send', zona: '{city}' },
        antes: { bienvenida: 'Welcome to Your Restaurant', texto: 'We are a family restaurant in {city}. We offer home cooking, lunch, dinner and catering for events. Our menu has dishes for every taste. Visit us or call us for more information.', llamada: 'Visit us today!', nav: ['Home', 'About', 'Menu', 'Gallery', 'Contact'], pie: '© Your Restaurant. All rights reserved.' },
      },
    },
  },

  tienda: {
    id: 'tienda',
    nombre: { es: 'Tu Tienda', en: 'Your Shop' },
    dominio: 'tutienda.example',
    // Papel kraft (velas y café), más oscuro y cálido que el crema común; acento salvia oscurecido para AA.
    paleta:      { bg: '#E6DBC8', ink: '#2A211B', ink2: '#574E46', accent: '#4E5A3D', onAccent: '#F8F5EE' },
    paletaNoche: { bg: '#17150F', ink: '#F1EBE0', ink2: '#ADA594', accent: '#A9B78F', onAccent: '#141A0C' },
    alternativas: [
      { id: 'cera', nombre: { es: 'Cera', en: 'Wax' },
        bg: '#F7F1E4', ink: '#2C2416', ink2: '#5F5543', accent: '#7D5A1E', onAccent: '#FFF8EA',
        noche: { bg: '#1A150B', ink: '#F5EDDC', ink2: '#B8AC93', accent: '#DDB06A', onAccent: '#1C1404' } },
      { id: 'tueste', nombre: { es: 'Tueste', en: 'Roast' },
        bg: '#F2EBE5', ink: '#271B15', ink2: '#5A4A41', accent: '#6E4231', onAccent: '#FAF2EC',
        noche: { bg: '#18110D', ink: '#F1E7DF', ink2: '#B3A195', accent: '#D59D85', onAccent: '#1E100A' } },
      { id: 'humo', nombre: { es: 'Humo', en: 'Smoke' },
        bg: '#EDEDEA', ink: '#1F2020', ink2: '#51524F', accent: '#4A5A5E', onAccent: '#F5F7F7',
        noche: { bg: '#131414', ink: '#ECECE9', ink2: '#A6A7A3', accent: '#9DB3B8', onAccent: '#0F1617' } },
    ],
    logo: 'tienda', boton: 'fill', radio: 10, telefono: '(281) 555-0188',
    textos: {
      es: { titular: 'Velas y café, hechos a mano.', accion: 'Ver la tienda' },
      en: { titular: 'Candles and coffee, made by hand.', accion: 'Shop now' },
    },
  },

  inmobiliaria: {
    id: 'inmobiliaria',
    nombre: { es: 'Tu Inmobiliaria', en: 'Your Realty' },
    dominio: 'tuinmobiliaria.example',
    // Piedra fría (gris azulado), separada del crema común de plomería y marca.
    paleta:      { bg: '#E3E6E8', ink: '#111316', ink2: '#4D5358', accent: '#34507A', onAccent: '#F7F8FA' },
    paletaNoche: { bg: '#111315', ink: '#EEECE8', ink2: '#A6A39E', accent: '#93B2DA', onAccent: '#0D1520' },
    alternativas: [
      { id: 'piedra', nombre: { es: 'Piedra', en: 'Stone' },
        bg: '#ECEAE5', ink: '#1C1B19', ink2: '#53504A', accent: '#5B5446', onAccent: '#F6F5F2',
        noche: { bg: '#141412', ink: '#ECEAE5', ink2: '#A8A59D', accent: '#C6BCA6', onAccent: '#18150D' } },
      { id: 'bosque', nombre: { es: 'Bosque', en: 'Forest' },
        bg: '#EEF0EA', ink: '#17201A', ink2: '#4B564E', accent: '#2E5640', onAccent: '#F3F6F2',
        noche: { bg: '#101511', ink: '#E9EEE8', ink2: '#A1ADA4', accent: '#86BC9C', onAccent: '#0B1810' } },
      { id: 'teja', nombre: { es: 'Teja', en: 'Tile' },
        bg: '#F4EEE9', ink: '#211814', ink2: '#584A43', accent: '#8E4A30', onAccent: '#FCF4EF',
        noche: { bg: '#18120F', ink: '#F2E9E3', ink2: '#B5A399', accent: '#E19A7C', onAccent: '#200F08' } },
    ],
    logo: 'inmobiliaria', boton: 'outline', radio: 2, telefono: '(281) 555-0129',
    textos: {
      es: { titular: 'Casas con calma.', accion: 'Ver casas' },
      en: { titular: 'Homes, calmly.', accion: 'See homes' },
    },
  },

  marca: {
    id: 'marca',
    nombre: { es: 'Tu Marca', en: 'Your Brand' },
    dominio: 'tumarca.example',
    paleta:      { bg: '#F0EDE8', ink: '#0E0E0D', ink2: '#4A4743', accent: '#6B4FA0', onAccent: '#FAF7FF' },
    paletaNoche: { bg: '#121113', ink: '#F0EDE8', ink2: '#AAA6A0', accent: '#B9A3E6', onAccent: '#160E26' },
    alternativas: [
      { id: 'indigo', nombre: { es: 'Índigo', en: 'Indigo' },
        bg: '#EEEFF4', ink: '#14162A', ink2: '#4A4D63', accent: '#3B47A0', onAccent: '#F5F6FD',
        noche: { bg: '#11121B', ink: '#ECEDF5', ink2: '#A3A6BA', accent: '#A3ADF0', onAccent: '#0E1230' } },
      { id: 'coral', nombre: { es: 'Coral', en: 'Coral' },
        bg: '#F7EEEA', ink: '#2A1714', ink2: '#5E4844', accent: '#A63F2E', onAccent: '#FFF5F2',
        noche: { bg: '#1B110F', ink: '#F5E9E5', ink2: '#B9A29C', accent: '#F09A86', onAccent: '#260C07' } },
      { id: 'menta', nombre: { es: 'Menta', en: 'Mint' },
        bg: '#ECF2EE', ink: '#13221A', ink2: '#47584E', accent: '#2C6A4C', onAccent: '#F2F8F4',
        noche: { bg: '#0F1612', ink: '#E7F0EA', ink2: '#9FB2A6', accent: '#7FCCA4', onAccent: '#0A1A11' } },
    ],
    logo: 'marca', boton: 'fill', radio: 10, telefono: '(281) 555-0101',
    textos: {
      es: {
        titular: 'Una marca que se reconoce.', accion: 'Conócenos',
        // `pagina` servicios y contacto (contrato: al menos plomería y marca), contenido mínimo.
        servicios: { rotulo: 'Lo que hacemos', titulo: 'Servicios', intro: 'Todo lo que hace tu marca, en un sitio.', filas: [
          { t: 'Identidad', d: 'Logo, colores y letra' }, { t: 'Papelería', d: 'Tarjetas y facturas' }, { t: 'Redes', d: 'Plantillas listas' } ], accionFila: 'Saber más' },
        contacto: { titulo: 'Hablemos.', intro: 'Cuéntanos tu idea.', horario: [{ d: 'Lunes a viernes', h: '9:00 a. m. a 5:00 p. m.' }],
          campos: ['Nombre', 'Correo', 'Tu idea'], enviar: 'Enviar', zona: '{city}' },
      },
      en: {
        titular: 'A brand people recognize.', accion: 'Meet us',
        servicios: { rotulo: 'What we do', titulo: 'Services', intro: 'Everything your brand does, in one place.', filas: [
          { t: 'Identity', d: 'Logo, colors and type' }, { t: 'Stationery', d: 'Cards and invoices' }, { t: 'Social', d: 'Ready-made templates' } ], accionFila: 'Learn more' },
        contacto: { titulo: "Let's talk.", intro: 'Tell us your idea.', horario: [{ d: 'Monday to Friday', h: '9:00 AM to 5:00 PM' }],
          campos: ['Name', 'Email', 'Your idea'], enviar: 'Send', zona: '{city}' },
      },
    },
  },
};

/** Alias de compatibilidad: el antiguo `kind` de WebEjemplo usaba estos mismos ids. */
export const esNegocio = (v: unknown): v is NegocioId => typeof v === 'string' && v in negocios;

/** Sustituye `{city}` en un texto de ejemplo. */
export const conCiudad = (t: string | undefined, city: string) => (t ?? '').replaceAll('{city}', city);

/** Prefijo de ficción de cada ciudad: el teléfono del ejemplo sale de la ciudad de la página (281 = Houston). */
const PREFIJO: Record<string, string> = { Miami: '(305)' };
/** Teléfono del ejemplo con el prefijo de `city` (Houston y desconocidas conservan el suyo). */
export const telEnCiudad = (t: string, city: string) => (PREFIJO[city] ? t.replace(/^\(\d{3}\)/, PREFIJO[city]) : t);

/* Contraste medido (tools/aa.mjs en la carpeta de la tarea, 2026-11-05):
   plomeria       ink 14.02 · ink2 6.20 · accent 4.68 · onAccent 5.10 | noche 14.32 · 7.98 · 7.12 · 7.62
   pino           10.73 · 5.89 · 5.48 · 5.58 | noche 15.19 · 8.11 · 8.65 · 8.70
   pizarra        11.01 · 5.60 · 5.91 · 6.29 | noche 14.74 · 7.66 · 8.07 · 8.38
   mostaza        13.68 · 6.54 · 4.62 · 5.00 | noche 15.21 · 8.21 · 8.02 · 8.20
   salon          11.08 · 5.87 · 5.13 · 6.43 | noche 14.39 · 7.72 · 7.44 · 7.82
   restaurante    7.08 · 5.55 · 5.55 · 11.54 (campo terracota, ronda 1) | noche 15.63 · 8.18 · 7.13 · 7.19
   tienda         11.51 · 5.93 · 5.37 · 6.76 (kraft, ronda 1) | noche 15.38 · 7.46 · 8.57 · 8.33
   inmobiliaria   14.84 · 6.22 · 6.51 · 7.68 (piedra fría, ronda 1) | noche 15.78 · 7.41 · 8.53 · 8.40
   marca          16.54 · 7.91 · 5.53 · 6.09 | noche 16.12 · 7.77 · 8.47 · 8.40
   Las alternativas de salón, restaurante, tienda, inmobiliaria y marca se miden en el mismo
   script (todas pasan; ver el informe de la tarea). */
