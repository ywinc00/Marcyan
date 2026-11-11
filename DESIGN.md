# DESIGN.md · Marcyan Studio · Doctrina visual (sistema v3, en producción desde 2026-11-10)

> **Autoridad.** Este archivo MANDA sobre cualquier decisión de UI del sitio. Describe el diseño que
> está EN VIVO tras el rediseño WorkOS (PR #65, 2026-11-10). Todo cambio nuevo debe salir con la misma
> forma de contar los productos, la misma estética y el mismo nivel de oficio. Si una pieza nueva se ve
> más pobre, más plana o más genérica que sus vecinas, está mal por definición.
>
> Punto de vuelta al diseño anterior: etiqueta git `prod-antes-rediseno-2026-11-10`.
> La versión vieja de este archivo ("Space-Tech", jul-2026) vive en el historial de git.
>
> Se usa junto a: skill `design-director` (gate + `errores-ledger.md`), skill `design-catalog`
> (piezas nombradas), skill `refero-design` (referencias mirando la imagen), `design/frontend-design.md`
> (checklist de salida). Detalle histórico y valores originales: `design/rediseno-workos.md` (v1) y
> `design/rediseno-workos-v2.md` (v2). Si chocan con este archivo, manda este.

---

## 0) La idea en una frase

**Marcyan no enseña decoración: enseña el producto funcionando.** Cada página vende un servicio
mostrando QUÉ hacemos, CÓMO funciona y QUÉ gana el cliente, con objetos de producto reales y
premium (webs, fichas de Maps, chats, pedidos, consolas) que se mueven sobre la noche de la marca.
Referencia madre: **workos.com** (composición, ritmo, objetos vivos, celdas de 1 px, coreografía).
Refero es apoyo para lo que WorkOS no cubre, y se dice cuando se usa.

---

## 1) Identidad conservada (nunca se cambia)

Fuente de tokens base: `src/styles/tokens.css` (NO se edita). Breakpoints: `src/styles/media.css`.

- **Noche:** `--bg-base #080808` (nunca negro puro). Elevado `--bg-elevated #1c1c1c`.
- **Acentos:** oro `--accent-gold #c8a96e` (primario, escaso) · teal `--accent-teal #4fc3a1`
  (señal IA y "en vivo"). Una página tiene UN acento (`--w-accent`): oro por defecto, teal en
  páginas de IA con `data-w-tone="teal"`.
- **Tinta:** `--fg-primary #f0ede8` (crema). En v3 se gradúa con `--w-ink-80/70/60` (60 % es el
  mínimo para texto de 14-16 px); `--w-ink-30` solo decoración, nunca texto.
- **Tipos:** Space Grotesk (títulos, pesos 400/500) · DM Sans (texto) · JetBrains Mono (etiquetas,
  datos, rótulos "Ejemplo").
- **Logos (no unificar):** navbar = texto `BrandType` · logo de empresa = marca ilustrada (schema) ·
  favicon = isotipo propio. Tres piezas separadas.
- **Avatar de Marcy:** colorway blanco; el encuadre es un contrato (`scripts/build-marcy-avatar.mjs`).

---

## 2) Dos mundos en el mismo sitio

| Mundo | Páginas | Regla |
|---|---|---|
| **Espacio estricto** | Portada `/es` `/en` y hubs de ciudad (Houston, Miami) | Fondo de estrellas `StarField`/`SpaceBackdrop`, planeta, viaje de ciudad (`components/city`). **Intocables**: solo se cambia el CONTENIDO de sus secciones permitidas, nunca hero, animación, orden, `data-fx` ni `data-atmo`. |
| **Sistema v3** | Todo lo demás: servicios, precios, portafolio, sobre nosotros, blog, diagnóstico, herramientas, landings servicio × ciudad, sectores, barrios | `<Layout ds="v3">` carga `WStyles.astro` → `w-tokens-v3.css` + `w.css` (todo bajo `:root[data-ds="v3"]`). Cada landing puede tener SU fondo temático en el hero (§5.3). |

Los tokens `--w-*` compartidos viven en `src/styles/w-tokens.css` (solo variables, entra en todas
las páginas sin pintar nada). Los que solo usa v3, en `w-tokens-v3.css`. Las clases `.w-*`, en
`src/styles/w.css`. Un componente que se monte fuera de v3 lleva TODO su CSS dentro y solo lee `--w-*`.

---

## 3) Sistema v3 (valores)

### 3.1 Tipografía (Space Grotesk 500 en títulos)

| Token | Tamaño | Uso |
|---|---|---|
| `--w-h1` | 36 → 58 px, lh 1.02, tracking -0.04em | H1 de landing (`.w-h1`) |
| `--w-h1-hub` | 32 → 52 px | H1 de hubs de venta |
| `--w-h1-night` | 40 → 72 px | H1 de IA y SEO para IA |
| `--w-h2-chapter` | 30 → 52 px, tracking -0.045em | H2 de capítulo: 1.ª frase en `--w-ink-45` (`.w-tone`), 2.ª en crema |
| `--w-h2` / `--w-h2-small` | 28 → 40 / 24 → 32 px | H2 normal / FAQ y demos |
| `--w-h3` / `--w-h4` | 24 / 20 px | Títulos de celda y objeto |
| `--w-eyebrow` | 18 → 28 px | Cola o antetítulo grande (no mono) |
| `--w-lead` | 17 → 20 px, lh 1.5 | Bajada |
| `--w-micro` | 12 px mono, tracking 0.1em | Etiquetas, rótulos, `CabeceraNumerada` |

`.w-h1 em` = la palabra en acento. H1 verbatim de cada página (SEO): no se reescriben sin decisión.

### 3.2 Superficies (rampa H-06)
`--w-s0` noche · `--w-s1 #121211` bandeja opaca (texto sobre patrón) · `--w-s2 #181817` objeto ·
`--w-s3 #1f1f1d` objeto activo · objetos de producto en CLARO: `--w-p-bg #f0ede8` con tinta
`--w-p-ink #0e0e0d`. Filo de luz `--w-edge` (inset 1 px blanco 8 %). Capítulos de contraste:
`--w-contrast-bg` (elevado) o `--w-dawn` (amanecer oro abajo; `--w-dawn-teal` en IA).

### 3.3 Radios (4, sin mezclar)
celda 8 · objeto 12 · bandeja 22 · pieza destacada 44 · píldora 999.

### 3.4 Líneas y raíles
`--w-line` (oro 9 %) y `--w-line-strong` (18 %, hover/activo). Rejillas de **celdas de 1 px**
(`.w-cells`) como WorkOS. **Los raíles verticales solo enmarcan rejillas de celdas**: nunca en heros,
nunca encima de piezas; si cruzan algo, se cortan.

### 3.5 Acento y degradado
Un acento por página. **Un solo degradado por página** (`--w-grad` oro → teal), en un elemento.
Nunca un elemento de acento sobre fondo del mismo acento (E-35).

### 3.6 Botones
Variantes de `ui/Button.astro` (primary oro relleno · secondary · teal · ghost · link). No se crean
variantes nuevas ni se copian botones de una referencia. Un botón mide lo que pide su texto: flex que
reparte y baja de línea, nunca columnas fijas con `nowrap`, nunca más ancho que su sitio. Una acción
dominante por vista; en móvil, llamar; en escritorio, formulario (política de CTAs).

### 3.7 Iconos y logos (tres familias, cada una a lo suyo)
- **Lucide** outline 1.5 px vía `ui/Icon.astro`: SOLO UI funcional (flechas, teléfono, check, menú).
- **Iconos-objeto** (`w/IconoObjeto.astro` + sprite `w/objects/`): uno por producto de `pricing.ts`,
  cuadrado en relieve con glifo propio. Representan PRODUCTOS.
- **Logos de plataformas** (`w/marcas/LogoMarca.astro`, trazados simple-icons CC0, licencias en
  `w/marcas/LICENCIAS.md`): a color dentro de interfaces dibujadas; crema sólido en listados; siempre
  dentro de algo, nunca un muro suelto. Uso nominativo ("dónde te encuentran", "con qué trabajamos"),
  nunca "partner" ni "construido con". Modelo que usamos = Claude. ChatGPT y Bing en palabra, sin
  logo; Apple fuera.

---

## 4) Cómo contamos los productos (lo que hace que el sitio funcione)

### 4.1 La portada de cada landing enseña el MECANISMO
El hero de una landing de servicio no es la web del cliente ni una foto bonita: es **el servicio
funcionando** (E-67, E-34). Heros en `src/components/w/heroes/`, uno por tipo:

| Tipo | Hero | Qué cuenta |
|---|---|---|
| Diseño web | `HeroWeb` | Tu web se construye y se personaliza (consola + web que aparece) |
| Tienda en línea | `HeroEcommerce` | Producto, pedido y cobro moviéndose |
| SEO local | `HeroSeoLocal` | Te buscan cerca y llegan a ti (ficha de Maps, ruta) |
| IA conversacional / IA pymes | `HeroIaChat` / `HeroIaPymes` | Marcy contesta y captura, conectada a tus canales |
| Branding | `HeroBranding` | La marca construida en su plano |
| Sectores | `HeroSector` → `HeroContratista`, `HeroRestaurante` | El día del negocio resuelto ("mientras cocinas" llega el pedido, sin comisión) |
| Barrios | `HeroBarrio` | El negocio del barrio con su web, en su sitio |

Regla para un hero nuevo: buscar inspiración en cómo OTROS productos explican un mecanismo
(cualquier sector, E-61), al menos dos de tres direcciones de fuera del sector, bocetos low-fi y el
dueño elige. Las webs del sector solo sirven para los ejemplos que van DENTRO.

### 4.2 Objetos de producto, no esqueletos
Lo que vendemos se dibuja como **producto real premium** (minimalista, tipografía y detalle de
verdad), nunca como bloques grises, barras de relleno ni tarjeta con iconos en cajita. Piezas en
`w/objetos/` (WebEjemplo, ChatMarcy, FichaMapaEjemplo, ListaPedidos, SolicitudOficio, Escaner,
RespuestaAsistente, AbanicoWebs…), `w/demos/` (ConsolaConstruye, Personalizador), `w/mac/`
(portátil que abre apps, portafolio laptop ↔ iPhone), `w/heroes/webs/` (webs de barrio),
`w/objetos/barrios/` (mapas). Antes de crear una pieza, buscar si ya existe una que resuelva esa
SITUACIÓN (abrir, elegir, construir, conectar): las piezas se eligen por situación, no por su texto.

### 4.3 Ejemplos con marcas inventadas, cada página el suyo
- Marcas "Tu …" (`w/objetos/ejemplos/negocios.ts`): logotipo en trazos, paleta propia de 3 tonos AA,
  voz propia. Marco Marcyan por fuera, la marca del ejemplo por dentro.
- **Cada página enseña SU negocio con su propio diseño.** Dos páginas hermanas (Houston/Miami, los
  cuatro barrios) no comparten ejemplo ni mapa. Ninguna marca en más de 3 páginas ni dos veces en la
  misma vista (E-65).
- Un solo rótulo "Ejemplo" por objeto (barra del navegador o pie, mono 10-12 px).
- Sin precios, estrellas, número de reseñas ni teléfonos reales (rango ficticio 555-01xx). Horas en
  12 h ("4:00 p. m." / "4:00 PM").
- Contrato de accesibilidad de todo ejemplo: sin `h1`-`h6` dentro, raíz `aria-hidden` +
  `data-nosnippet` + resumen `sr-only`, sin `tel:`, `wa.me` ni `data-track`, ids SVG con sufijo.

### 4.4 Fotos: reales, nítidas y del tema
- Productos, platos, locales y escenas llevan foto (un rectángulo vacío "parece PowerPoint", E-57).
- Fuente: bancos libres (Unsplash con licencia libre), anotadas en `design/ejemplos-v8.md` con su id.
  Se recortan al hueco y se guardan en WebP en `public/fotos/ejemplos/<nombre>-<ancho>.webp`.
- Escalera de anchos (160/320/640 o según uso) y `sizes` igual a la caja REAL en pantalla; una foto
  que llena su caja lleva `sizes` de la caja, no del tamaño nominal (E-58, E-68). Se comprueba a tamaño
  real que no pixela.
- Nunca capturas del trabajo de clientes como arte de hero (E-32); los proyectos reales van en
  portafolio y casos.

### 4.5 Mapas que dicen dónde están
Cada mapa de ejemplo dibuja el lugar de su página (agua, autopista, naves, cuadrícula, canal) y la
ruta usa los mismos puntos que el eje de las calles que recorre, nunca curvas libres por encima de
las manzanas (E-68, E-41). Datos en `w/sections/servicios/ObjMapaLocal.astro` (`MAPAS`) y
`w/objetos/barrios/FichaMapa.astro` (`MAPAS_F`); el color de ruta y pin es el acento del negocio.

### 4.6 Marcy (el chat)
El widget es el de producción: avatar blanco, selector de canal, "Equipo Marcyan" cuando contesta
una persona, tres puntos al escribir, "Hablar con una persona". Diseño en `design/chat-marcy.md`.
Campos a 16 px en táctil (E-68): nunca bloquear el zoom.

---

## 5) Composición de una página v3

### 5.1 Plantilla de landings
`w/landing/WLanding.astro` + `registry.ts` + `kinds/<tipo>.ts` (web, ecommerce, seo-local, ia-chat,
ia-pymes, branding, sector, barrio). Una landing nueva = un `kind` que reutiliza secciones de
`w/sections/<tipo>/` y piezas de `w/`. No se monta una página a mano si un `kind` la cubre.

### 5.2 Ritmo
Hero (≈ una pantalla, sin encoger el producto) → capítulos con `CabeceraNumerada` (mono, número +
nombre) → rejillas de celdas / bandejas / demos → capítulo de contraste (elevado o amanecer) →
prueba (casos, `FichaProyecto`, `TarjetasCaso`) → precio (`TarjetaPrecio`, `PrecioPuntos`) → FAQ
(`PreguntasFrecuentes`) → cierre (`CierreDosTarjetas`). Separación de sección `--w-section-y`
(80 → 120 px). Una idea fuerte por sección.

### 5.3 Fondos
Espacio estricto solo en portada y hubs. Cada landing puede llevar UN motivo de fondo que cuente su
tema, en el hero (fundido a la noche abajo) y como mucho un eco en el capítulo de contraste. Nunca
dos motivos a la vez, nunca detalle corriendo detrás del texto (E-37, E-57). Donde hay fondo
temático no se monta `SpaceBackdrop`.

---

## 6) Movimiento

- **Contrato de vida:** demo con guion = se reproduce una vez al entrar (35 %), se queda en un final
  con micro-vida (cursor, punto en línea) y se repite tras ≥ 8 s fuera. Pantalla viva = bucle a la
  vista, pausa fuera de vista y con pestaña oculta; > 5 s de bucle lleva botón de pausa 44 × 44.
  Interactivo = responde al visitante; cursor fantasma solo si nadie toca (máx. 3 ajustes).
- **Una pieza que en la referencia es interactiva, aquí también** (teclado, foco oro, `radiogroup`).
- **Animaciones de scroll** (portátil, fases, viajes): se revisan en tira de fotogramas en escritorio
  y móvil, también volviendo hacia atrás; una apertura se QUEDA abierta al volver (E-66); empiezan
  cuando la pieza ya está encuadrada.
- El hover nunca pausa ni retira una animación (E-58).
- Solo `transform` y `opacity` (más `stroke-dashoffset`); sin `backdrop-filter` nuevo, sin canvas
  nuevos, sin capas de efecto a pantalla completa.
- Coreografía de entrada única (`w/reveal.ts`, curvas `--w-ease-*`, duraciones `--w-dur-*`), gated
  por `html.w-anim`. `prefers-reduced-motion` = estado final quieto y completo.
- Las estrellas fugaces siguen dibujándose mientras se hace scroll si hay una en vuelo.

---

## 7) Pantallas y tamaños

- Un componente se adapta a SU ancho (container queries): reordena o apila; nunca corta, parte
  palabras ni esconde. `display:none` por tamaño prohibido salvo que la información siga visible de
  otra forma (E-62).
- **Nunca se encoge una portada ni su producto con zoom para que quepa**: se recorta en el borde o se
  reordena, y la portada crece si hace falta (E-64, E-65).
- Lo que en escritorio va junto, en móvil va junto (apilado y solapado, no separado, E-60).
- Conmutadores de vista arrancan en la vista principal; "ver en móvil" cambia el dispositivo
  dibujado por un iPhone (E-66).
- Verificación con captura real a 320, 360, 390, 768, 1440 y 2560. Scroll, sticky y animaciones en el
  Chrome real.

---

## 8) Copy visible

- Español natural y EN nativo; sin guiones ni em-dash como conector.
- "Dominamos" la IA, nunca "construimos con IA".
- Nada de cifras, reseñas ni testimonios inventados. Plazos: contacto "1 hora hábil", propuesta "en
  24 horas". Formularios sin precios; las páginas mantienen sus anclas "desde $X" de `pricing.ts`.

---

## 9) Cómo se hace un cambio a partir de hoy

1. Invocar `design-director` (y de nuevo tras cada compactación) y leer `errores-ledger.md`.
2. Nombrar 2 o 3 piezas de `design-catalog` por su código.
3. Inventariar lo que el sitio YA tiene (este archivo §4 y §5): reutilizar piezas y gramática antes
   de inventar. Referencia madre WorkOS; Refero mirando imágenes para lo demás.
4. Pieza grande (hero, sección nueva, página): 2 o 3 bocetos de verdad distintos, el dueño elige.
5. Construir con los tokens `--w-*` y las clases `.w-*`; nada hardcodeado salvo dentro de ejemplos.
6. Capturas reales en todos los anchos de §7 + crítica adversarial independiente; corregir y repetir
   hasta que no queden fallos graves.
7. Vista previa de Vercel y OK del dueño sobre el render antes de fusionar. Sus correcciones van al
   ledger en la misma sesión.

---

## 10) NO TOCAR sin decisión del dueño

- Portada y hubs de ciudad (hero, planeta, órbita, viaje de ciudad, animaciones, orden, `data-fx`,
  `data-atmo`). Cualquier cambio de animación o "feel" del hero se enseña renderizado antes de fusionar.
- Gramática del sitio: `SiteNav` + megamenú, `SiteFooter` ("El Arribo"), variantes de `Button`,
  `tokens.css`, `base.css`, `media.css`.
- Formularios y su lógica (puerta técnica), `pricing.ts`, JSON-LD, canonical, hreflang, H1 verbatim,
  trío de contacto, widget de Marcy y su blindaje.
- Diseños descartados que no se reconstruyen: Miami "Aproximación", hero Houston "El Domo",
  footer v3.

---

## 11) Puerta de salida (bloqueante)

Un solo punto que falle = no se entrega.

- [ ] Captura real en 320 / 360 / 768 / 1440 / 2560; nada cortado, partido, escondido ni encogido.
- [ ] Animaciones revisadas en tira de fotogramas, hacia delante y hacia atrás, escritorio y móvil.
- [ ] Objetos de producto con oficio premium; ejemplos propios de la página, con foto nítida.
- [ ] Un acento, un degradado y un motivo de fondo por página; raíles solo en rejillas.
- [ ] Contraste AA (texto ≥ `--w-ink-60`), foco visible, objetivos táctiles ≥ 44 px, campos ≥ 16 px.
- [ ] `prefers-reduced-motion` deja un estado final completo.
- [ ] Copy según §8; ningún dato inventado.
- [ ] `npx astro build` limpio (70 páginas) y pruebas del repo en verde.
- [ ] Crítica adversarial pasada y OK del dueño sobre la vista previa.

---

## 12) Mapa de documentos de diseño

| Documento | Qué tiene |
|---|---|
| `design/rediseno-workos.md` · `-v2.md` | Plan y valores originales del sistema v3 (histórico) |
| `design/ejemplos-v8.md` | Fotos de bancos libres usadas (ids) y referencias de los ejemplos |
| `design/chat-marcy.md` | Diseño del chat |
| `design/houston.md` · `design/miami.md` | Hubs de ciudad "el viaje" |
| `design/frontend-design.md` | Checklist de revisión visual |
| `design/art-direction.md` | Registro del gate por encargo |
| `~/.claude/skills/design-director/errores-ledger.md` | Memoria de gusto del dueño (E-01…E-69) |
