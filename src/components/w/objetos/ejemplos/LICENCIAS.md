# Licencias de los ejemplos (marcas inventadas)

Los logotipos de las 6 marcas de ejemplo son **trazados SVG** obtenidos contorneando una sola vez una
palabra con una fuente OFL distinta por marca (`LogoEjemplo.astro`, constante `TRAZOS`). La web no carga
ninguna de estas fuentes: solo lleva los trazados resultantes (obra derivada permitida por la OFL 1.1, que
no restringe el uso de los contornos en logotipos ni exige reproducir la licencia junto a una imagen).

| Marca | Palabra (ES / EN) | Fuente | Estilo aplicado | Origen | Licencia |
|---|---|---|---|---|---|
| plomeria | TU PLOMERÍA / YOUR PLUMBING | Archivo 700 | mayúsculas, tracking .14em | `@fontsource/archivo@5.2.5` (`archivo-latin-700-normal.woff`) · Omnibus-Type | SIL OFL 1.1 |
| salon | Tu Salón / Your Salon | Cormorant Garamond 500 cursiva | caja mixta, tracking -.01em | `@fontsource/cormorant-garamond@5.2.5` (`…-latin-500-italic.woff`) · Christian Thalmann | SIL OFL 1.1 |
| restaurante | tu restaurante / your restaurant | Fraunces 600 | minúsculas, tracking -.005em | `@fontsource/fraunces@5.2.5` (`fraunces-latin-600-normal.woff`) · Undercase Type | SIL OFL 1.1 |
| tienda | tu tienda / your shop | Bricolage Grotesque 800 | minúsculas, tracking -.045em | `@fontsource/bricolage-grotesque@5.2.5` (`…-latin-800-normal.woff`) · Mathieu Triay | SIL OFL 1.1 |
| inmobiliaria | TU INMOBILIARIA / YOUR REALTY | Jost 300 | mayúsculas, tracking .30em | `@fontsource/jost@5.2.5` (`jost-latin-300-normal.woff`) · indestructible type* | SIL OFL 1.1 |
| marca | Tu Marca / Your Brand | Unbounded 600 | caja mixta, tracking -.03em | `@fontsource/unbounded@5.2.5` (`unbounded-latin-600-normal.woff`) · NaN | SIL OFL 1.1 |

- Descarga: `npm pack` en la carpeta de trabajo de la tarea (fuera del repo); no se tocó `package.json`.
- Contorneado: `opentype.js@1.3.4` (MIT), a 100 unidades de cuerpo, coordenadas redondeadas a la unidad,
  origen en la línea de mayúsculas. Script: `tools/logos.mjs` de la tarea P02a (rediseño WorkOS v2).
  Para cambiar una palabra o una fuente se regenera, no se edita a mano.
- Voces distintas (ninguna marca comparte familia, peso, caja y tracking): grotesca ancha pesada en
  mayúsculas espaciadas · serif cursiva fina · serif display de cuerpo blando en minúsculas · grotesca
  condensada negra en minúsculas apretadas · geométrica fina en mayúsculas muy abiertas · display ancha
  semipesada en caja mixta.

## Signos e ilustraciones

`Ilustracion.astro` y el signo del logotipo de plomería (codo de tubería y gota) son geometría dibujada
por nosotros (arcos y rectas); sin licencia de terceros.

## Fotos

Ninguna. La foto por marca depende de la decisión §5-12 del plan v2 (por defecto: sin foto). Si el dueño
la aprueba, cada foto se anota aquí con su fuente, autor y licencia libre.
