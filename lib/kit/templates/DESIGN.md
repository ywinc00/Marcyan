---
# ═══════════════════════════════════════════════════════════════════════════
# PLANTILLA DESIGN.md (Marcyan): NO es para un cliente concreto.
# Es la plantilla maestra del sistema de diseño. Flujo de uso:
#   1) Cópiala al repo del cliente.
#   2) Declara el modo (DESDE-CERO | REDISEÑO-IDENTIDAD).
#   3) Rellena cada <...> derivándolo del brief/identidad real del cliente.
#   4) Valídala en el Art Director Gate (.claude/skills/design-director/SKILL.md).
# Reglas de relleno: tokens NUNCA genéricos ni SaaS por defecto; salen de la marca real.
# NO se edita por cliente: Anti-generic rules, Forbidden UI patterns, Visual QA checklist.
# ═══════════════════════════════════════════════════════════════════════════
name: "<CLIENTE> · Sistema de diseño · Marcyan"
description: "<sector / qué hace> · <personalidad en 1 frase> · modo: <DESDE-CERO | REDISEÑO-IDENTIDAD>"

# ── COLORS ──────────────────────────────────────────────────────────────────
# Deriva del logo/identidad. Neutros TINTADOS hacia la temperatura de marca (nunca slate/gray
# puros), nunca #000/#fff puros. Cada color con un rol; sin hues sin función. El acento es la
# ÚNICA señal de acción y ocupa ≤10% del área. PROHIBIDO por defecto: purple/indigo/violet SaaS.
colors:
  ink:          "<#hex>"   # texto principal, neutro oscuro tintado
  surface-dark: "<#hex>"   # marca oscura: header/footer/bandas
  paper:        "<#hex>"   # fondo base (NO #fff puro)
  surface:      "<#hex>"   # superficie elevada sobre paper
  accent:       "<#hex>"   # ACCIÓN (CTAs, foco, dato clave). DEBE venir del logo/identidad
  accent-hover: "<#hex>"   # accent −8% de luz
  accent-ink:   "<#hex>"   # texto SOBRE accent (verificar ≥4.5:1, o ≥3:1 si grande/bold)
  text:         "<#hex>"
  text-muted:   "<#hex>"   # ≥4.5:1 sobre paper
  border:       "<#hex>"   # ≥3:1 (non-text)
  success:      "<#hex>"
  warning:      "<#hex>"
  error:        "<#hex>"

# ── TYPOGRAPHY ──────────────────────────────────────────────────────────────
# CERO Inter/Roboto/Open Sans por defecto: la pareja sale de la identidad. Máx 2 familias
# (la 3ª solo monoespaciada con función: datos/precios/código). Salto H1/body ≥ 2.5×.
typography:
  display: { family: "<display de marca>", weights: [<...>], tracking: "<-0.01em..-0.03em>", line_height: "<1.0..1.2>" }
  body:    { family: "<texto>",            weights: [<...>], line_height: "<1.4..1.7>" }
  mono:    { family: "<opcional>",         weights: [<...>] }
  scale:   { ratio: "<1.2..1.333>", base_px: "<16..18>", steps_px: [<...>] }

# ── SPACING ─────────────────────────────────────────────────────────────────
# Default universal sano. Ajustable a la densidad de la marca, pero SIEMPRE escala (sin huérfanos).
spacing:
  base: 4
  scale_px: [4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 160]
  section_block_px: { compact: "clamp(48px, 8vh, 80px)", airy: "clamp(96px, 18vh, 200px)" }
  grid_columns: 12
  container_max_px: 1240   # ajustable por cliente
  gutter: "clamp(1rem, 5vw, 4rem)"
  text_measure_ch: [60, 72]

# ── ROUNDED ─────────────────────────────────────────────────────────────────
# El lenguaje de forma es decisión de marca: duro/industrial ↔ suave/cálido. Coherente en familias.
rounded:
  sm:   "<2px..6px>"    # inputs, chips, tags
  md:   "<4px..12px>"   # botones, cards pequeñas
  lg:   "<6px..24px>"   # contenedores, modales
  full: "9999px"        # SOLO pills de estado y avatares
  philosophy: "<hard-corners | soft | mixed>"

# ── COMPONENTS ──────────────────────────────────────────────────────────────
# Estructura fija (estados, a11y, jerarquía). Los valores referencian los tokens de arriba.
components:
  button:  { height_px: "<44..52>", radius: "rounded.md", primary: "fill=accent / text=accent-ink", states: ["rest","hover","focus-visible","active","disabled","loading"] }
  card:    { radius: "rounded.md", separation: "<border | shadow | fill, elige UNA>" }
  input:   { height_px: "<44..52>", radius: "rounded.sm", focus: "2px solid accent + ring offset 2px" }
  nav:     { bg: "<sólido de marca, NO glassmorphism>", active_marker: "<subrayado 2px accent | peso | color ≥4.5:1>" }
  section: { archetypes_min: 4, bg_alternation: ["paper", "surface-dark", "surface"] }
  cta:     { primary_per_view: 1, style: "fill=accent / text=accent-ink", copy: "verbo + objeto" }
---

# DESIGN.md · Plantilla de sistema de diseño · Marcyan

> **Esto es una PLANTILLA, no el diseño de un cliente.** Define *cómo* construimos un sistema de diseño en cualquier proyecto. Para usarla: cópiala al repo del cliente y rellena los tokens (`<...>`) desde su brief/identidad. La capa de **tokens cambia por cliente**; las **reglas humanas de fondo** (`Anti-generic rules`, `Forbidden UI patterns`, `Visual QA checklist`) son guardarraíl de agencia y **no se editan**.
>
> Formato estilo **Google `DESIGN.md`**: front matter YAML (tokens, legible por máquina) + secciones humanas. El YAML es el contrato que consumen los componentes; las secciones explican el porqué y las reglas de uso.

---

## Cómo usar esta plantilla

1. **Copiar** este `DESIGN.md` (y `CLAUDE.md`, `.claude/rules/`, `.claude/skills/`) al repo del cliente.
2. **Declarar el modo** en `description`:
   - `DESDE-CERO`: no hay identidad previa → se propone dirección de arte completa y justificada.
   - `REDISEÑO-IDENTIDAD`: la marca ya existe → se **deriva y eleva** su identidad; primero se rellena el "Inventario de marca conservada" del SKILL y los tokens salen de su brandbook (hex, tipografías, radios exactos).
3. **Rellenar los tokens** del YAML derivándolos del cliente. Regla de oro: *cada token se justifica en una frase ligada a la marca* ("uso X PORQUE …"). Si falta un dato, propón un valor razonable y márcalo `# EDITAR`.
4. **Validar en el Art Director Gate** (`.claude/skills/design-director/SKILL.md`) antes de escribir código: dirección visual, jerarquía, intención por sección, estilo de componentes, errores genéricos a evitar.
5. **Cerrar con el QA** (`Visual QA checklist` de abajo + el gate completo de `.claude/rules/frontend-design.md`).

> No metas valores aquí "porque sí". Una plantilla rellena con defaults de framework es exactamente lo que estas reglas existen para impedir.

---

## Overview

**Qué es este archivo (por cliente).** La fuente de verdad del diseño del proyecto. Cada cambio de UI debe seguirlo (ver `CLAUDE.md` y `.claude/rules/frontend-design.md`).

**Cómo opera Marcyan (contexto, igual en todo proyecto).** Cada proyecto entra con un **brief** y/o **sistema de marca** + datos (fotos, logos, referencias). El chat **"Estructura"** (cerebro central / director) planifica y delega; los **departamentos** (UI, UX, Diseño, Seguridad…) comparten el **mismo repo y datos**. Cada departamento tiene un **agente jefe** que crea **sub‑agentes on‑demand** (investigar, ilustrar, crear componentes).

**Se rellena por cliente:** personalidad de marca, idea conductora (1 frase), audiencia, y el modo. Plantilla de arranque:

```
Personalidad: <3–5 adjetivos operativos derivados de la marca>
Idea conductora (1 frase): <qué hace que esta UI solo pueda ser de este cliente>
Audiencia: <quién + implicaciones de legibilidad/target/contraste>
Modo: <DESDE-CERO | REDISEÑO-IDENTIDAD>
Antídoto: <qué NO es este cliente, p.ej. "no es SaaS: nada de morado/glass/dashboard">
```

---

## Colors

Paleta funcional acotada: **1 neutro oscuro de marca + 1 acento de acción + fondo + rampa de neutros tintados + 3 estados semánticos**. El acento ocupa **≤10%** del área (acción/foco/dato clave); domina el neutro.

| Rol | Token | Cómo se rellena |
|---|---|---|
| Texto / oscuro marca | `ink`, `surface-dark` | Neutro oscuro **tintado** hacia la temperatura de marca. Nunca `#000` puro. |
| Fondo / superficie | `paper`, `surface` | Fondo base (NO `#fff` puro) + superficie elevada. |
| **Acción** | `accent`, `accent-hover`, `accent-ink` | Acento del **logo/identidad**. Texto sobre acento verificado ≥4.5:1 (o ≥3:1 si grande). |
| Texto atenuado | `text-muted` | ≥4.5:1 sobre `paper`. |
| Borde | `border` | ≥3:1 (non‑text). |
| Semánticos | `success`/`warning`/`error` | ≥4.5:1; derivados de la paleta, no hex sueltos. |

**Reglas de color (fijas)**
- Neutros **tintados en la temperatura de marca**, nunca `slate/gray/zinc` ni `#000`/`#fff` puros.
- **Estados derivados por transformación** del token base (hover −8% luz, active −14%, disabled 38% opacidad o `*-muted`), nunca hex inventados por estado.
- **Prohibido** el gradiente indigo→violeta y cualquier paleta SaaS por defecto (ver `Forbidden UI patterns`).
- Cada color con un **rol**; un hue sin función no entra.

---

## Typography

- **Display + Texto** = una pareja (o superfamilia) derivada de la identidad. **Cero Inter/Roboto/Open Sans** por defecto.
- **Máximo 2 familias** (la 3ª solo monoespaciada con función: datos, precios, código).
- **Escala con ratio explícito** (1.2–1.333) y base 16–18px; salto **H1/body ≥ 2.5×**.

**Reglas tipográficas (fijas)**
- Jerarquía por **≥2 ejes** (tamaño + peso/color), no solo subiendo `font-size`.
- `line-height`: body 1.4–1.7; titulares 1.0–1.2 (no heredar el del body).
- Medida de línea **60–72ch**; nunca texto a 100% del viewport en desktop.
- Display ≥40px con `letter-spacing` negativo (−0.01 a −0.03em); labels en mayúsculas con tracking +0.05 a +0.1em.
- Sin `text-align: justify`.

---

## Layout & Spacing

- **Grid 12 columnas**, `container_max` ajustable (≈1240px), gutter `clamp(1rem, 5vw, 4rem)`.
- **Escala de espaciado base 4/8:** `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96 · 128 · 160 px`. Sin valores huérfanos (`7px`, `13px`).
- **Ritmo vertical VARIABLE, no fijo:** secciones densas `clamp(48px, 8vh, 80px)`; respiro/hero `clamp(96px, 18vh, 200px)`. Separación entre secciones **≥2×** el gap interno; entre vecinas, cambiar ≥1 escalón.
- **Composición con tensión:** rompe la simetría central por defecto (asimetría, foto a sangre, número grande junto a label pequeño, ≥40% de aire en el hero). El centrado total es decisión puntual, no el default.
- **Responsive:** en móvil reduce cada paso ~33% (128→80, 96→64, 64→40). Verificar en 360 / 768 / ≥1280.

---

## Components

> Reglas por componente: **estructura y mínimos fijos**; los valores referencian los **tokens** del front matter (`accent`, `ink`, `rounded.md`, `spacing.scale`…). Nunca relajes los mínimos WCAG aunque la marca lo pida: se documenta y se negocia, no se asume. Detalle transversal de enforcement en `.claude/rules/frontend-design.md`.

### HERO
- **Un solo trabajo:** propuesta de valor + 1 acción primaria; un punto focal.
- **Composición:** rejilla 12, texto en 5–7 cols + asset real a sangre. El centrado simétrico se justifica o se descarta.
- **EXIGIDO:** headline ≤12 palabras con beneficio concreto; `text-wrap: balance`; subhead `max-width: 60ch`; sobre imagen, overlay que garantice ≥4.5:1 (cuerpo) y ≥3:1 (headline grande), medido con herramienta.
- **PROHIBIDO:** gradiente/blob morado, mockup 3D inventado, headline vago, stock de "equipo sonriendo".
- **Tokens:** H1 `clamp()` con `display`, lh `typography.display.line_height`; CTA primaria = fill `accent`, texto `accent-ink`.

### CARDS
- **Una unidad de información**, anatomía fija y repetida.
- **Separación: elige UNA**: borde `1px` (≥3:1) **o** sombra **o** fill; nunca las tres. Radio = `rounded.md`.
- **PROHIBIDO:** la "card SaaS" (blanco + radius grande + sombra difusa + icono lineal en círculo pastel) repetida idéntica; misma sombra en todo.
- **Si interactiva:** 5 estados; hover sutil (sin escalar texto); skeleton con misma geometría (CLS < 0.1).
- **A11y:** cuerpo y meta ≥4.5:1; target ≥44×44px; respeta `prefers-reduced-motion`.

### BOTONES
- **Jerarquía estricta, 1 primario por vista:** primary → secondary → ghost → link.
- **Tokens:** `height components.button.height_px`, radio `rounded.md`; primary = fill `accent` / texto `accent-ink`; hover `accent-hover`; focus‑visible anillo 2px `accent` + offset; disabled `*-muted` + `aria-disabled`.
- **6 estados obligatorios** por variante. Loading mantiene ancho y bloquea reenvío.
- **PROHIBIDO:** `outline:none` sin reemplazo; gradiente/glow morado; cambiar de tamaño en hover; copy vago.
- **Copy = verbo + objeto.**

### FORMULARIOS
- Una columna; `<label>` visible y persistente ligada por `for`/`id`; pide lo imprescindible.
- **Tokens:** input `height components.input.height_px`, radio `rounded.sm`, borde `border` (≥3:1), `font-size ≥16px`, focus `2px accent` + ring.
- **EXIGIDO:** `type`/`inputmode`/`autocomplete` correctos; error específico junto al campo con `aria-invalid` + `aria-describedby`; foco al primer error tras submit.
- **PROHIBIDO:** placeholder como label; validación solo por color; validar al primer carácter.
- En chatbots/automatizaciones con formulario embebido aplican las mismas reglas.

### NAVEGACIÓN
- Vehículo de marca, no patrón importado. **Test:** si quitas el logo y podría ser de cualquiera, está mal.
- **Tokens:** fondo **sólido** (`surface-dark` u otro de marca, NO glassmorphism), o transparente sobre hero con transición a sólido en scroll; altura `components.nav`.
- **EXIGIDO:** estado de página actual visible y distinto del hover; `<nav aria-label="Principal">`; foco visible; menú mobile con `aria-expanded`, focus trap, cierre con `Esc`.
- **PROHIBIDO:** combo pill morado "Get Started"; hamburguesa visible en ≥1024px si los links caben; hairline‑sombra genérica.

### SECCIONES (ritmo y composición)
- **≥4 arquetipos distintos** entre secciones (hero asimétrico, split 2‑col, banda full‑bleed, stepper, galería, stat gigante). **Prohibido** apilar 3 secciones idénticas.
- **Alternancia de fondo** deliberada (`paper` ↔ `surface-dark` ↔ `surface`) para separar sin líneas.
- Texto a la izquierda si >2 líneas; centrado reservado a hero/citas cortas/CTA final.
- Un solo H2 al peso máximo por sección; jerarquía de headings sin saltos.

### CTA
- **1 acción primaria evidente por viewport;** el resto secundario/terciario.
- **Tokens:** fill `accent` + texto `accent-ink`, radio `rounded.md`, hover ≥8% de cambio de luz; área ≥44×44px aunque el texto sea corto.
- **Copy:** verbo + objeto orientado a conversión. **PROHIBIDO** "Get Started", pill morado, dos primarios gemelos, glow genérico.
- **A11y:** `:focus-visible` ≥3:1/2px; `<button>` vs `<a>` correcto; jerarquía no solo por color.

---

## Do's and Don'ts

| ✅ DO | ❌ DON'T |
|---|---|
| Definir intención, jerarquía y patrones genéricos a evitar **antes** de codear | Crear UI solo para rellenar espacio |
| Derivar cada decisión del brief/identidad ("uso X PORQUE…") | Aceptar defaults de Tailwind/shadcn sin tokenizar |
| Cards con contenido real (número, foto, beneficio cuantificado) | **Generic cards** (icono + título + 2 líneas de relleno) |
| Un set único de iconos con función (o ilustración propia) | **Random icons** / emojis como iconos / mezcla de sets |
| Headlines con beneficio concreto y medible | **Vague headlines** ("Soluciones innovadoras") |
| Color sólido de marca; acento ≤10% del área | **Decorative gradients** / mesh / glow sin propósito |
| ≥4 arquetipos de sección, ritmo variable | **Repeated section layouts** apilados idénticos |
| Espaciado en escala 4/8, separación ≥2× el gap interno | **Inconsistent spacing** (valores huérfanos) |
| CTA verbo+objeto orientado a conversión | **Weak CTA text** ("Enviar", "Get Started") |
| Foto/ilustración real del cliente | Stock genérico, unDraw, blobs, dashboards inventados |

**Cada sección debe tener:** `purpose` (qué pregunta/objeción resuelve) · `hierarchy` (orden de lectura medible) · `clear copy` (real, del cliente) · `responsive behavior` (360/768/1280 sin overflow) · `conversion logic` (qué acción provoca y su métrica). Si una sección no tiene un trabajo distinto del de sus vecinas, se fusiona o se elimina.

---

## Anti-generic rules

> **No editable.** Guardarraíl de agencia: idéntico para cualquier cliente.

Claude opera como **DIRECTOR DE ARTE**: cada decisión de color, tamaño, espaciado, radio, sombra, peso, ritmo y movimiento es defendible en una frase ligada al cliente, nunca un default heredado. Si no hay una razón ligada al cliente detrás de una elección, esa elección no existe todavía y la pantalla no se entrega.

### 1. Rechaza los defaults por sistema
- **Defaults de Tailwind sin tokenizar** (`text-gray-500`, `bg-gray-50`, `rounded-lg`, `shadow-md`, `blue-600`/`indigo`/`violet` como acción, `max-w-7xl mx-auto` universal, escala `slate/gray/zinc` como color de marca). → Define tokens semánticos derivados de la identidad **antes** de escribir una clase. Cero `*-gray-*`/`*-slate-*`/`*-zinc-*` sin token intermedio en el output final.
- **Componentes shadcn/ui pegados sin reescribir.** → shadcn/Radix solo como capa de comportamiento + a11y; el visual (radios, sombras, espaciados, tipografía, los 5 estados) se reemplaza 100% por tokens del proyecto.
- **Estructuras de landing copiadas** (hero centrado → bento de 3 → logos grises → pricing de 3 con "Popular"). → Cada bloque y su orden se justifican desde el contenido y el objetivo de conversión.
- **Iconografía/tipografía por defecto** (`lucide` outline 24px a todo; Inter/Geist por inercia; emojis como iconos). → Deriva de la identidad; fija stroke‑width y tamaño por jerarquía.

### 2. Deriva del brief o de la identidad, nunca de modas
Prohibido por tendencia: glassmorphism, mesh/blobs, `backdrop-blur` global, dark mode por defecto, neón, 3D genérico, bordes con gradiente animado. Antes de proponer un tratamiento, cita: *"Uso [decisión] PORQUE [dato del brief / token de identidad / objetivo de negocio]"*. Si termina en "se ve moderno/tendencia/queda bien", se descarta. Si hay brand system, sus tokens son la fuente de verdad. Si el brief contradice una moda, gana el brief.

### 3. Exige un punto de vista por página
- **Idea conductora** explícita en 1 frase. · **Jerarquía medible** (ratio explícito, salto H1/body ≥2.5×, ≥2 ejes). · **Tensión deliberada** (asimetría, ruptura de retícula, contraste de escala fuerte, o ≥40% de aire en hero). · **Espaciado con sistema** (escala 4/8; sección:componente ≥4:1).

### 4. Trata distinto REDISEÑO/IDENTIDAD vs DESDE‑CERO
- **Con identidad existente:** la marca manda; **deriva y eleva** (extrae y documenta sus tokens reales antes de tocar nada). Prohibido sustituir tipografía corporativa, recolorear fuera de paleta o redondear radios si la marca es angular. Defecto medible de a11y → repórtalo con la medición y propón corrección mínima, no lo cambies unilateralmente.
- **Desde cero:** propón dirección de arte completa, justificada bloque a bloque. Prohibido que el "desde cero" sea el preset de Tailwind+shadcn con otro acento.

### 5. Una decisión, una razón
Cada elección visible se justifica en UNA frase ligada al cliente. Válido: *"Radio duro porque la marca es industrial y debe sentirse sólida"*. Inválido: *"`rounded-lg` porque es el default"*, *"Inter porque es legible"*. Si encuentras >1 elemento justificado con "es el default" o "se ve bien", la pantalla se rediseña.

### Forbidden UI patterns
> **No editable.** Prohibidos por defecto. Los ⛔ exigen registro escrito en `/decisiones/{fecha}-{patron}.md` (razón, quién aprobó, criterio medible, fecha de revisión) ANTES de construir.

1. Hero centrado + gradiente morado→indigo + Inter por defecto.
2. Fila de 3 cards idénticas (icono + título + 2 líneas de relleno).
3. ⛔ Glassmorphism por defecto (`backdrop-filter: blur()` sobre `rgba(255,255,255,.1)`).
4. La misma sombra suave (`shadow-md`) en TODO → usar escala de elevación.
5. Mismo `border-radius` en absolutamente todo → escala de radios por función.
6. ⛔ Paleta SaaS por defecto (purple/indigo/violet `#6366F1`/`#8B5CF6`).
7. Emojis como iconos de producto.
8. "Full‑width centered everything".
9. Idéntico ritmo vertical en todas las secciones.
10. Pills/badges decorativos vacíos ("New", "Trusted by thousands" sin dato).
11. ⛔ Ilustraciones genéricas tipo unDraw / blobs / corporate‑Memphis.
12. Degradados arcoíris/mesh multicolor sin propósito.
13. ⛔ "Dark mode por defecto" sin razón de marca.

**Prueba del clon:** antes de aprobar una pantalla, responde por escrito: *"¿qué hace que esto solo pueda ser de ESTE cliente y no de otros mil?"*. Con identidad previa la prueba se invierte: *"¿esto respeta y eleva la identidad existente, o le impone un estilo de agencia ajeno?"*.

---

## Visual QA checklist

> **No editable** (guardarraíl). Versión de bolsillo. El gate exhaustivo de 10 bloques con regla de bloqueo vive en `.claude/rules/frontend-design.md`. **Córrelo siempre** contra el render real al cerrar cualquier tarea de UI.

**Identidad / tokens**
- [ ] Cero hex/rgb hardcodeados que dupliquen un token del front matter; todos los colores mapean a `colors:`.
- [ ] Fuente activa = familia de marca del YAML (no fallback `system-ui`, no Inter por inercia).
- [ ] `accent` ≤10% del área, solo en acción/foco/dato; texto sobre `accent` verificado ≥4.5:1 (o ≥3:1 si grande).
- [ ] Neutros tintados; cero `#000`/`#fff` puros, cero `slate/gray`.
- [ ] Radios = escala `rounded` por función; cero `rounded-2xl` por inercia.

**Anti‑SaaS / anti‑genérico**
- [ ] Sin gradiente morado, glassmorphism, dashboard inventado, emojis‑icono ni "dark mode techy" sin razón.
- [ ] Hay fotografía/ilustración real del cliente; cero stock genérico.
- [ ] No reproduce el layout "AI‑SaaS" (hero centrado + subtítulo gris + 2 botones + 3 cards con icono). Junto a 5 competidores, se distingue por ≥1 rasgo propio.
- [ ] ≥1 decisión deliberada de composición (asimetría, número grande, ritmo variable), no todo centrado/simétrico.

**Fundamentos**
- [ ] Jerarquía por ≥2 ejes; 1 solo CTA primario por vista; 1 solo `<h1>`.
- [ ] Espaciado en escala 4/8; separación entre secciones ≥2× el gap interno; ≥4 arquetipos de sección.
- [ ] Contraste WCAG AA (texto ≥4.5:1, grande ≥3:1, non‑text ≥3:1); `:focus-visible` ≥3:1/2px; targets ≥44px.
- [ ] Responsive en 360/768/1280 sin overflow; tipografía/espaciado escalan (`clamp`).
- [ ] Cada sección tiene purpose · hierarchy · clear copy · responsive · conversion logic.

**Regla de bloqueo:** un solo item en NO PASA → no se entrega. Se corrige, o se documenta la excepción (item, justificación, quién aprueba) en el chat "Estructura". Detalle en `.claude/rules/frontend-design.md`.
