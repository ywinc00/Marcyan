// ─────────────────────────────────────────────────────────────
// P11 · "Del concepto al lanzamiento" (design/rediseno-workos-v2.md §2 P11).
// Tipos, adaptador de content.process y copy de las escenas (ES/EN nativo).
// Los textos de las FASES no viven aquí: llegan verbatim de content.process.
// ─────────────────────────────────────────────────────────────
import { PRICE_ANCHORS } from '../../../i18n/pricing';

export type Lang = 'es' | 'en';

/** Una fase de la línea (props de LineaFases). */
export interface Fase { n: string; titulo: string; texto: string }

/** content.process.steps → fases (sin tocar el texto: verbatim). */
export const fasesDe = (steps: { n: string; title: string; desc: string }[]): Fase[] =>
  steps.map((s) => ({ n: s.n, titulo: s.title, texto: s.desc }));

/** Nombre del evento que emite la línea cuando se activa la última fase (lo escucha el cohete de G01). */
export const EVENTO_FIN = 'w2:fases-fin';
/** detail del evento: origen = centro del punto de la última fase, en px relativos a la sección. */
export interface DetalleFin { origen: { x: number; y: number }; lang: Lang }

const usd = (n: number) => '$' + n.toLocaleString('en-US');

export const copy = {
  es: {
    fase: 'Fase',
    correo: {
      aviso: 'Nuevo correo', titulo: 'Tu propuesta', hace: 'hace 1 min', para: 'Para: Tu Negocio',
      cuerpo: 'Hola, aquí tienes tu propuesta: alcance, precio y plazos.',
      idx: [['Alcance', 'Sitio a medida, en español e inglés'], ['Precio', `Desde ${usd(PRICE_ANCHORS.web)}`], ['Plazos', 'Fechas por fase']],
      pie: 'Propuesta en 24 horas', reloj: '24 h',
    },
    alcance: {
      lab: 'Tu plan', producto: 'Sitio a medida completo',
      items: ['Páginas a medida', 'En español e inglés', 'SEO base', 'Lista para la IA'],
      total: 'Total', desde: `Desde ${usd(PRICE_ANCHORS.web)}`, aprobar: 'Aprobar', aprobado: 'Aprobado',
      mes: 'Cada mes', mensual: [['SEO local', `Desde ${usd(PRICE_ANCHORS.seoLocal)}/mes`], ['Mantenimiento', `Desde ${usd(PRICE_ANCHORS.maintenance)}/mes`]],
    },
    bilingue: { es: 'ES', en: 'EN' },
    encontrar: { lab: 'Te encuentran en', pregunta: '¿Un buen plomero en Houston que atienda en español?', pasos: ['Buscando en la web', 'Leyendo fuentes'],
      antes: 'Una buena opción es ', despues: ': web bilingüe, responde rápido y enseña su trabajo.',
      cat: 'Plomero · Houston', abierto: 'Abierto', cierra: 'cierra 6:00 p. m.', llamar: 'Llamar', llegar: 'Cómo llegar' },
    publicada: { estado: 'Publicada', titular: 'Te atendemos hoy.', bajada: 'Plomería en Houston, en español e inglés.', boton: 'Llamar',
      asis: 'Tu asistente', linea: 'en línea', msg: 'Hola, ¿en qué te ayudo?' },
    sr: [
      'Ejemplo: te llega el correo con tu propuesta, con alcance, precio y plazos.',
      `Ejemplo: el plan con su alcance y un precio desde ${usd(PRICE_ANCHORS.web)}, listo para aprobar.`,
      'Ejemplo: la misma web cambia del español al inglés.',
      'Ejemplo: un asistente de IA recomienda a Tu Negocio y aparece su ficha en el mapa.',
      'Ejemplo: la web queda publicada y su asistente atiende en línea.',
    ],
  },
  en: {
    fase: 'Phase',
    correo: {
      aviso: 'New email', titulo: 'Your proposal', hace: '1 min ago', para: 'To: Your Business',
      cuerpo: "Hi, here's your proposal: scope, price and timeline.",
      idx: [['Scope', 'Custom site, in Spanish and English'], ['Price', `From ${usd(PRICE_ANCHORS.web)}`], ['Timeline', 'Dates for each phase']],
      pie: 'Proposal in 24 hours', reloj: '24 h',
    },
    alcance: {
      lab: 'Your plan', producto: 'Complete custom site',
      items: ['Custom pages', 'In Spanish and English', 'Core SEO', 'Ready for AI'],
      total: 'Total', desde: `From ${usd(PRICE_ANCHORS.web)}`, aprobar: 'Approve', aprobado: 'Approved',
      mes: 'Every month', mensual: [['Local SEO', `From ${usd(PRICE_ANCHORS.seoLocal)}/mo`], ['Maintenance', `From ${usd(PRICE_ANCHORS.maintenance)}/mo`]],
    },
    bilingue: { es: 'ES', en: 'EN' },
    encontrar: { lab: 'They find you on', pregunta: 'A good plumber in Houston who speaks Spanish?', pasos: ['Searching the web', 'Reading sources'],
      antes: 'A good option is ', despues: ': bilingual website, quick to reply and shows its work.',
      cat: 'Plumber · Houston', abierto: 'Open', cierra: 'closes 6:00 PM', llamar: 'Call', llegar: 'Directions' },
    publicada: { estado: 'Live', titular: 'We can help today.', bajada: 'Plumbing in Houston, in Spanish and English.', boton: 'Call',
      asis: 'Your assistant', linea: 'online', msg: 'Hi, how can I help?' },
    sr: [
      'Example: your proposal arrives by email, with scope, price and timeline.',
      `Example: the plan with its scope and a price from ${usd(PRICE_ANCHORS.web)}, ready to approve.`,
      'Example: the same website switches from Spanish to English.',
      'Example: an AI assistant recommends Your Business and its map listing shows up.',
      'Example: the website is live and its assistant is online.',
    ],
  },
} as const;

/** Copy de la web de ejemplo del salón (escena 03), en los dos idiomas: la escena enseña los dos.
 *  titular y boton = textos canónicos de negocios.ts (salon.textos.titular / accion). */
export const salon = {
  es: { nav: ['Servicios', 'Reservar'], titular: 'Tu cita, sin esperar.', bajada: 'Corte, color y uñas en Houston.', boton: 'Reservar',
    servicios: ['Corte', 'Color', 'Uñas'], horario: 'Mar a sáb · 10:00 a. m. a 7:00 p. m.' },
  en: { nav: ['Services', 'Book'], titular: 'Your appointment, no waiting.', bajada: 'Cuts, color and nails in Houston.', boton: 'Book',
    servicios: ['Cut', 'Color', 'Nails'], horario: 'Tue to Sat · 10:00 AM to 7:00 PM' },
} as const;

// ─────────────────────────────────────────────────────────────
// Asistentes que nombra el paso 04 (content.process), uno por reproducción, con su logo en la
// cabecera de la respuesta (E-56-5, §1.4).
// PROVISIONAL hasta que P06 (LogoMarca, src/components/w/marcas/) esté integrado en la rama: entonces
// esta tabla se sustituye por <LogoMarca id="googlegemini" | "meta" | "chatgpt-texto"> y se borra.
// TRAZADOS: simple-icons 16.36.0, licencia CC0 1.0 del trazado (mismo origen y mismos datos que
// registra P06 en marcas/datos.ts y marcas/LICENCIAS.md). CC0 cubre el dibujo, no la marca: uso
// nominativo ("Te encuentran en"), nunca aval ni alianza. Gemini es multicolor en su guía: va en la
// tinta del objeto, nunca con un solo hex. Meta con su azul oficial. ChatGPT: palabra (no se dibuja
// el logo de OpenAI, decisión §5-2 del dueño pendiente).
// ─────────────────────────────────────────────────────────────
export interface Asistente { nombre: string; d?: string; hex?: string; optico?: number }
export const ASISTENTES: readonly Asistente[] = [
  { nombre: 'Gemini', optico: 1.08,
    d: 'M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.96 4.68-.93 2.19-2.55 3.81a12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.96 2.19.93 3.81 2.55t2.55 3.81' },
  { nombre: 'ChatGPT' },
  { nombre: 'Meta AI', hex: '0467DF', optico: 1.12,
    d: 'M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.121.196.183.3l2.152 3.595c.724 1.21 1.665 2.556 2.47 3.314 1.046.987 1.992 1.22 3.06 1.22 1.075 0 1.876-.355 2.455-.843a3.743 3.743 0 0 0 .81-.973c.542-.939.861-2.127.861-3.745 0-2.72-.681-5.357-2.084-7.45-1.282-1.912-2.957-2.93-4.716-2.93-1.047 0-2.088.467-3.053 1.308-.652.57-1.257 1.29-1.82 2.05-.69-.875-1.335-1.547-1.958-2.056-1.182-.966-2.315-1.303-3.454-1.303zm10.16 2.053c1.147 0 2.188.758 2.992 1.999 1.132 1.748 1.647 4.195 1.647 6.4 0 1.548-.368 2.9-1.839 2.9-.58 0-1.027-.23-1.664-1.004-.496-.601-1.343-1.878-2.832-4.358l-.617-1.028a44.908 44.908 0 0 0-1.255-1.98c.07-.109.141-.224.211-.327 1.12-1.667 2.118-2.602 3.358-2.602zm-10.201.553c1.265 0 2.058.791 2.675 1.446.307.327.737.871 1.234 1.579l-1.02 1.566c-.757 1.163-1.882 3.017-2.837 4.338-1.191 1.649-1.81 1.817-2.486 1.817-.524 0-1.038-.237-1.383-.794-.263-.426-.464-1.13-.464-2.046 0-2.221.63-4.535 1.66-6.088.454-.687.964-1.226 1.533-1.533a2.264 2.264 0 0 1 1.088-.285z' },
];
/** viewBox 24×24 con el factor óptico centrado (f > 1 agranda el glifo sin mover la caja). */
export const vbOptico = (f = 1) => { const s = 24 / f, o = (24 - s) / 2; return `${o.toFixed(3)} ${o.toFixed(3)} ${s.toFixed(3)} ${s.toFixed(3)}`; };


// ─────────────────────────────────────────────────────────────
// Salón de EJEMPLO de la escena 03, ALINEADO con el canónico de P02a mientras WebEjemplo no esté
// integrado en la rama (revisión P11 r2, I-A/M-4). Datos copiados TAL CUAL de la rama
// w2/ejemplos-contrato @ 859c8f8: paleta, nombre, dominio, titular y acción de
// src/components/w/objetos/ejemplos/negocios.ts (salon) y el logotipo contorneado de
// src/components/w/objetos/ejemplos/LogoEjemplo.astro (TRAZOS.salon). Logotipo: Cormorant Garamond
// 500 italic de @fontsource 5.2.5, licencia SIL OFL 1.1, contorneado a trazados con opentype.js 1.3.4
// (MIT), según LICENCIAS.md de esa misma carpeta. Cuando entre la ola B, esto se borra y la escena
// monta <WebEjemplo marca="salon" frame="tarjeta" /> (P02).
// ─────────────────────────────────────────────────────────────
export const SALON_PALETA = { bg: "#D5DACB", ink: "#1E2420", ink2: "#46504A", accent: "#7A4A3B", onAccent: "#F6EFEA" } as const;
/** Logotipo del salón: [ancho, alto, trazado] por idioma; cap = alto de la mayúscula en unidades. La marca sale del idioma de la PÁGINA (E-24). */
export const SALON_LOGO = { cap: 63, es: [302,64,"M6 63Q6 63 6 62Q6 61 6 61L6 61Q9 61 11 61Q13 60 14 59Q14 57 15 54L15 54L23 8Q23 6 23 5L23 5Q23 3 22 3Q21 2 19 2L19 2L17 2Q6 2 1 17L1 17Q1 17 1 17L1 17Q0 17 0 17Q0 17 0 16L0 16Q1 14 2 8Q4 1 5-2L5-2Q5-2 5-2Q6-2 6-2L6-2Q5 0 10 0L10 0Q17 0 28 0L28 0Q33 0 39 0L39 0L46 0Q49 0 50 0Q52-1 52-2L52-2Q52-3 53-3Q53-3 53-2L53-2Q52 1 51 7Q50 14 49 16L49 16Q49 17 48 17Q48 17 48 16L48 16Q48 14 48 12L48 12Q48 7 46 4Q44 2 39 2L39 2L37 2Q33 2 32 3Q31 4 30 8L30 8L22 54Q22 57 22 58L22 58Q22 60 23 61Q25 61 29 61L29 61Q29 61 29 62Q29 63 29 63L29 63Q26 63 24 62L24 62L17 62L11 62Q9 63 6 63L6 63ZM52 64Q45 64 45 56L45 56Q45 54 46 51L46 51L49 33Q50 31 50 30L50 30Q50 27 48 27L48 27Q46 27 42 32L42 32Q41 32 41 32L41 32Q41 32 41 31Q40 31 41 31L41 31Q44 27 47 25Q49 23 52 23L52 23Q56 23 56 28L56 28Q56 30 55 33L55 33L52 49Q52 52 52 54L52 54Q52 59 56 59L56 59Q59 59 62 55Q66 51 68 43Q71 36 73 25L73 25L75 25Q73 37 69 45Q66 54 61 59Q57 64 52 64L52 64ZM72 63Q70 63 69 62Q68 61 68 59L68 59Q68 57 68 54L68 54L73 25Q74 24 75 24Q76 23 77 23L77 23Q80 23 80 24L80 24L80 26Q79 30 78 31L78 31L74 54Q74 55 74 56L74 56Q74 59 76 59L76 59Q77 59 79 58Q81 57 83 55L83 55Q83 55 83 55L83 55Q83 55 83 55Q84 55 83 56L83 56Q80 60 77 62Q74 63 72 63L72 63ZM125 64Q122 64 119 63Q115 62 112 60L112 60Q111 60 111 58L111 58L113 45Q113 44 114 44Q114 44 114 45L114 45Q115 53 118 57Q122 62 128 62L128 62Q133 62 136 59Q140 56 141 51L141 51Q141 49 141 48L141 48Q141 43 138 40Q135 36 130 33L130 33Q126 30 124 28Q122 26 120 23Q119 21 119 17L119 17Q119 16 119 14L119 14Q121 7 127 3Q133-1 140-1L140-1Q146-1 151 1L151 1Q152 2 152 3L152 3L151 15Q151 15 150 15Q150 15 150 15L150 15Q149 8 146 5Q143 1 138 1L138 1Q134 1 131 3Q129 5 128 8Q126 11 126 14L126 14Q126 17 128 19Q129 22 131 23Q133 25 137 28L137 28Q143 32 146 35Q149 39 149 44L149 44Q149 46 149 47L149 47Q147 54 141 59Q135 64 125 64L125 64ZM160 64Q157 64 156 62Q154 60 154 56L154 56Q154 55 154 53L154 53Q155 47 160 39Q164 32 170 27Q176 23 181 23L181 23Q184 23 187 24Q189 26 190 30L190 30L185 27Q186 27 188 25Q190 24 190 22L190 22Q191 22 191 22L191 22Q191 22 191 22Q192 22 192 22L192 22L186 54Q186 55 186 56L186 56Q186 59 187 59L187 59Q189 59 193 55L193 55Q194 55 194 55L194 55Q194 55 194 55Q194 55 194 56L194 56Q191 60 188 61Q186 63 183 63L183 63Q181 63 180 62Q179 61 179 58L179 58Q179 57 180 54L180 54L182 40L184 38Q181 46 177 51Q173 57 169 61Q164 64 160 64L160 64ZM165 58Q168 58 172 55Q176 51 179 46Q182 41 183 36L183 36Q183 34 183 33L183 33Q183 30 182 28Q180 27 177 27L177 27Q174 27 171 29Q167 32 165 37Q162 42 161 48L161 48Q161 51 161 52L161 52Q161 58 165 58L165 58ZM204 63Q202 63 201 62Q200 61 200 59L200 59Q200 57 201 54L201 54L211 2Q211 1 211-1L211-1Q211-4 209-4L209-4Q207-4 204-2L204-2L204-2Q204-2 203-3Q203-3 204-3L204-3L217-10L218-10Q218-10 218-10Q219-9 219-9L219-9L207 54Q207 55 207 56L207 56Q207 59 209 59L209 59Q210 59 215 55L215 55Q215 55 215 55L215 55Q215 55 216 55Q216 55 216 56L216 56Q212 60 209 62Q207 63 204 63L204 63ZM234 64Q227 64 224 60Q221 55 221 49L221 49Q221 46 221 43L221 43Q222 37 225 33Q229 28 233 25Q238 23 243 23L243 23Q249 23 252 27Q256 31 256 38L256 38Q256 40 255 43L255 43Q254 50 251 54Q247 59 243 61Q238 64 234 64L234 64ZM237 61Q241 61 244 58Q247 54 248 48L248 48Q249 44 249 41L249 41Q249 34 246 30Q244 25 239 25L239 25Q236 25 232 29Q229 32 228 39L228 39Q228 42 228 45L228 45Q228 52 230 57Q233 61 237 61L237 61ZM242 15Q242 16 241 15Q240 15 241 15L241 15L249-9Q250-10 252-10Q254-11 256-11L256-11Q257-11 257-10L257-10L242 15ZM291 63Q289 63 288 62Q287 61 287 59L287 59Q287 57 288 54L288 54L290 38Q291 35 291 33L291 33Q291 27 287 27L287 27Q284 27 281 31Q277 35 274 43Q271 51 269 62L269 62L268 62Q270 50 273 41Q277 32 281 27Q286 23 291 23L291 23Q294 23 296 25Q298 26 298 30L298 30Q298 33 297 36L297 36L294 54Q293 55 293 56L293 56Q293 59 295 59L295 59Q297 59 301 55L301 55Q302 55 302 55L302 55Q302 55 302 55Q302 55 302 56L302 56Q299 60 296 62Q293 63 291 63L291 63ZM265 63Q263 63 263 63L263 63L263 61Q264 56 264 55L264 55L268 33Q269 31 269 30L269 30Q269 27 267 27L267 27Q266 27 264 28Q262 30 260 32L260 32Q260 32 260 32L260 32Q259 32 259 31Q259 31 259 31L259 31Q263 27 266 25Q268 23 271 23L271 23Q273 23 274 24Q275 25 275 28L275 28Q275 29 274 32L274 32L269 62Q269 62 268 63Q267 63 265 63L265 63Z"], en: [372,64,"M23 36L21 35L38 10Q40 7 40 4L40 4Q40 3 39 2Q38 1 36 1L36 1Q36 1 36 1Q36 0 36 0L36 0L40 0Q44 0 47 0L47 0Q48 0 50 0L50 0L53 0Q54 0 54 1Q54 1 53 1L53 1Q47 1 40 11L40 11L23 36ZM6 63Q5 63 5 62Q5 61 6 61L6 61Q9 61 11 61Q12 60 13 59Q14 57 15 54L15 54L19 32L26 31L22 54Q21 57 21 58L21 58Q21 60 23 61Q24 61 28 61L28 61Q28 61 28 62Q28 63 28 63L28 63Q25 63 23 62L23 62L17 62L10 62Q9 63 6 63L6 63ZM8 8Q6 5 5 3Q3 1 0 1L0 1Q0 1 0 1Q0 0 0 0L0 0L4 0Q7 0 8 0L8 0Q11 0 15 0L15 0L20 0Q20 0 20 0L20 0Q20 1 20 1Q20 1 20 1L20 1Q17 1 16 2Q15 2 15 3L15 3Q15 4 15 5L15 5L26 31L20 35L8 8ZM51 64Q45 64 41 60Q38 55 38 49L38 49Q38 46 38 43L38 43Q40 37 43 33Q46 28 50 25Q55 23 60 23L60 23Q66 23 70 27Q73 31 73 38L73 38Q73 40 73 43L73 43Q71 50 68 54Q65 59 60 61Q56 64 51 64L51 64ZM54 61Q58 61 61 58Q64 54 66 48L66 48Q66 44 66 41L66 41Q66 34 64 30Q61 25 57 25L57 25Q53 25 50 29Q47 32 45 39L45 39Q45 42 45 45L45 45Q45 52 47 57Q50 61 54 61L54 61ZM87 64Q81 64 81 56L81 56Q81 54 81 51L81 51L85 33Q85 31 85 30L85 30Q85 27 84 27L84 27Q82 27 77 32L77 32Q77 32 77 32L77 32Q77 32 76 31Q76 31 77 31L77 31Q80 27 83 25Q85 23 88 23L88 23Q92 23 92 28L92 28Q92 30 91 33L91 33L88 49Q87 52 87 54L87 54Q87 59 91 59L91 59Q95 59 98 55Q101 51 104 43Q107 36 109 25L109 25L111 25Q109 37 105 45Q102 54 97 59Q92 64 87 64L87 64ZM107 63Q105 63 104 62Q104 61 104 59L104 59Q104 57 104 54L104 54L109 25Q109 24 110 24Q111 23 113 23L113 23Q116 23 116 24L116 24L115 26Q114 30 114 31L114 31L110 54Q110 55 110 56L110 56Q110 59 112 59L112 59Q113 59 115 58Q116 57 118 55L118 55Q118 55 119 55L119 55Q119 55 119 55Q119 55 119 56L119 56Q116 60 113 62Q110 63 107 63L107 63ZM131 62Q133 53 136 44Q138 35 142 29Q146 23 149 23L149 23Q152 23 153 25Q155 26 155 28L155 28Q155 30 154 31Q153 32 152 32L152 32Q151 32 150 31Q149 31 148 30L148 30Q148 30 147 29Q147 29 146 29L146 29Q144 29 141 34Q138 40 136 48Q133 56 132 62L132 62L131 62ZM128 63Q126 63 126 63L126 63Q126 62 126 60Q127 57 127 55L127 55L131 35Q131 33 131 31L131 31Q131 27 129 27L129 27Q127 27 123 31L123 31Q123 31 123 31L123 31Q122 31 122 31Q122 30 122 30L122 30Q125 27 128 25Q131 23 133 23L133 23Q135 23 136 24Q137 26 137 29L137 29Q137 31 137 35L137 35L132 62Q132 62 131 63Q130 63 128 63L128 63ZM195 64Q191 64 188 63Q185 62 181 60L181 60Q180 60 180 58L180 58L182 45Q182 44 183 44Q183 44 184 45L184 45Q184 53 188 57Q191 62 197 62L197 62Q202 62 205 59Q209 56 210 51L210 51Q210 49 210 48L210 48Q210 43 207 40Q204 36 199 33L199 33Q195 30 193 28Q191 26 190 23Q188 21 188 17L188 17Q188 16 188 14L188 14Q190 7 196 3Q202-1 209-1L209-1Q215-1 220 1L220 1Q222 2 222 3L222 3L220 15Q220 15 220 15Q219 15 219 15L219 15Q218 8 216 5Q213 1 207 1L207 1Q203 1 201 3Q198 5 197 8Q196 11 196 14L196 14Q196 17 197 19Q199 22 201 23Q203 25 206 28L206 28Q212 32 215 35Q218 39 218 44L218 44Q218 46 218 47L218 47Q217 54 210 59Q204 64 195 64L195 64ZM230 64Q227 64 225 62Q223 60 223 56L223 56Q223 55 224 53L224 53Q225 47 229 39Q233 32 239 27Q245 23 250 23L250 23Q254 23 256 24Q259 26 259 30L259 30L254 27Q256 27 257 25Q259 24 260 22L260 22Q260 22 260 22L260 22Q260 22 261 22Q261 22 261 22L261 22L255 54Q255 55 255 56L255 56Q255 59 256 59L256 59Q259 59 263 55L263 55Q263 55 263 55L263 55Q263 55 264 55Q264 55 264 56L264 56Q260 60 258 61Q255 63 252 63L252 63Q250 63 249 62Q248 61 248 58L248 58Q248 57 249 54L249 54L251 40L253 38Q250 46 246 51Q243 57 238 61Q234 64 230 64L230 64ZM234 58Q238 58 241 55Q245 51 248 46Q251 41 252 36L252 36Q252 34 252 33L252 33Q252 30 251 28Q249 27 247 27L247 27Q243 27 240 29Q237 32 234 37Q231 42 230 48L230 48Q230 51 230 52L230 52Q230 58 234 58L234 58ZM274 63Q272 63 271 62Q270 61 270 59L270 59Q270 57 270 54L270 54L280 2Q280 1 280-1L280-1Q280-4 278-4L278-4Q276-4 273-2L273-2L273-2Q273-2 273-3Q273-3 273-3L273-3L287-10L287-10Q287-10 288-10Q288-9 288-9L288-9L276 54Q276 55 276 56L276 56Q276 59 278 59L278 59Q280 59 284 55L284 55Q284 55 284 55L284 55Q285 55 285 55Q285 55 285 56L285 56Q281 60 279 62Q276 63 274 63L274 63ZM303 64Q297 64 293 60Q290 55 290 49L290 49Q290 46 290 43L290 43Q292 37 295 33Q298 28 302 25Q307 23 312 23L312 23Q318 23 322 27Q325 31 325 38L325 38Q325 40 325 43L325 43Q323 50 320 54Q317 59 312 61Q308 64 303 64L303 64ZM306 61Q310 61 313 58Q316 54 318 48L318 48Q318 44 318 41L318 41Q318 34 316 30Q313 25 309 25L309 25Q305 25 302 29Q299 32 297 39L297 39Q297 42 297 45L297 45Q297 52 299 57Q302 61 306 61L306 61ZM360 63Q358 63 357 62Q356 61 356 59L356 59Q356 57 357 54L357 54L360 38Q360 35 360 33L360 33Q360 27 356 27L356 27Q353 27 350 31Q346 35 343 43Q340 51 339 62L339 62L337 62Q339 50 343 41Q346 32 351 27Q355 23 360 23L360 23Q364 23 365 25Q367 26 367 30L367 30Q367 33 366 36L366 36L363 54Q363 55 363 56L363 56Q363 59 365 59L365 59Q366 59 371 55L371 55Q371 55 371 55L371 55Q371 55 372 55Q372 55 372 56L372 56Q368 60 365 62Q363 63 360 63L360 63ZM335 63Q332 63 332 63L332 63L332 61Q333 56 333 55L333 55L338 33Q338 31 338 30L338 30Q338 27 336 27L336 27Q335 27 333 28Q331 30 329 32L329 32Q329 32 329 32L329 32Q329 32 329 31Q328 31 329 31L329 31Q332 27 335 25Q338 23 340 23L340 23Q342 23 343 24Q344 25 344 28L344 28Q344 29 344 32L344 32L339 62Q338 62 337 63Q336 63 335 63L335 63Z"] } as const;
