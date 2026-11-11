// Nombres de negocios clientes que NUNCA se traducen (E-24): el traductor del navegador
// convertía "Julio's Landscape TX" en "Paisajes…". Cuando el nombre llega por dato, el
// componente lo pinta dentro de un elemento translate="no"; cuando va embebido en un
// texto, se envuelve al pintar con estas dos funciones.
//
// Solo tocan el HTML visible: los datos (y por tanto el JSON-LD) no cambian.
// La puntuación pegada al nombre ("Remove.", "(Rosy") entra en el mismo <span> para que
// el texto visible, leído con las etiquetas como espacios, siga siendo idéntico.

const NOMBRE = String.raw`(?:Texas Rush Remove|Move Junk Away|Julio(?:'|’|&#39;|&#x27;|&apos;)s(?: Landscape(?: TX)?)?|Rosy Nails(?: (?:&amp;|&) Care)?)`;
const PEGADO_ANTES = String.raw`(?:[(«"“¿¡]|&quot;)*`;
const PEGADO_DESPUES = String.raw`(?:[.,;:!?)»"”]|&quot;)*`;
const RE = new RegExp(`${PEGADO_ANTES}${NOMBRE}${PEGADO_DESPUES}`, 'g');

const escapar = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const envolver = (html: string) => html.replace(RE, (m) => `<span translate="no">${m}</span>`);

/** Texto plano (se escapa) → HTML con los nombres de clientes protegidos. Úsese con set:html. */
export function protegerNombres(texto: string | null | undefined): string {
  return envolver(escapar(String(texto ?? '')));
}

const VACIOS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const CRUDOS = new Set(['script', 'style', 'textarea', 'title', 'template']);

/**
 * HTML ya formado → mismo HTML con los nombres protegidos. Solo toca nodos de texto:
 * nunca atributos, ni el interior de script/style, ni lo que ya está bajo translate="no".
 */
export function protegerNombresHtml(html: string | null | undefined): string {
  const partes = String(html ?? '').split(/(<!--[\s\S]*?-->|<[^>]+>)/);
  const pila: { tag: string; libre: boolean }[] = [];
  const libre = () => pila.every((p) => p.libre);
  return partes
    .map((parte) => {
      if (!parte) return parte;
      if (parte.startsWith('<!--')) return parte;
      const tag = /^<\s*(\/)?\s*([a-zA-Z][\w-]*)/.exec(parte);
      if (parte.startsWith('<') && tag) {
        const nombre = tag[2].toLowerCase();
        if (tag[1]) {
          const i = pila.map((p) => p.tag).lastIndexOf(nombre);
          if (i >= 0) pila.length = i;
        } else if (!VACIOS.has(nombre) && !/\/\s*>$/.test(parte)) {
          const protegido = /\stranslate\s*=\s*["']?no\b/i.test(parte) || CRUDOS.has(nombre);
          pila.push({ tag: nombre, libre: !protegido });
        }
        return parte;
      }
      return libre() ? envolver(parte) : parte;
    })
    .join('');
}
