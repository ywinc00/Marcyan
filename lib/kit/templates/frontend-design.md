# Regla: Frontend / Diseño anti-genérico (SIEMPRE ACTIVA)

> Esta regla se aplica en **TODA** tarea de frontend/UI de cualquier proyecto de cliente (web nueva, rediseño, landing, automatización/chatbot con UI). Es la capa de **enforcement**: lo mínimo que se verifica siempre.
>
> - Doctrina completa y justificación → `DESIGN.md`.
> - Protocolo pre-código (qué proponer ANTES de teclear) → `.claude/skills/design-director/SKILL.md`.
> - Si algo aquí y en `DESIGN.md` parece chocar, **gana lo más estricto**.

---

## Anti-generic rules (núcleo de enforcement)

Resumen ejecutable. Detalle completo en `DESIGN.md › Anti-generic rules`.

1. **Actúa como DIRECTOR DE ARTE, no como autocompletado.** Cada color, tamaño, espaciado, radio, sombra, peso, ritmo y movimiento es defendible en una frase ligada al cliente. Sin esa frase, la decisión no existe y la pantalla no se entrega.
2. **Una decisión, una razón.** "Es el default", "se ve moderno/limpio/premium", "es tendencia" o "queda bien" NO son razones. Si encuentras >1 elemento justificado así, se rediseña.
3. **Prohibido aceptar defaults sin tokenizar.** Nada de `text-gray-*`, `bg-gray-50`, `rounded-lg`, `shadow-md`, `blue-600`/`indigo`/`violet` como acción, ni componentes shadcn/Radix con su look por defecto. shadcn/Radix = solo comportamiento + a11y; el visual se reemplaza 100% por tokens del proyecto.
4. **Deriva del brief o de la identidad, nunca de modas.** Glassmorphism, mesh/blobs, `backdrop-blur` global, dark mode por defecto, neón, 3D genérico: ninguno entra sin razón de marca escrita.
5. **Punto de vista obligatorio por página:** idea conductora en 1 frase + jerarquía medible (≥2 ejes, salto H1/body ≥2.5x) + 1 punto de tensión + espaciado en escala 4/8.
6. **Respeta la identidad existente.** En rediseño/landing-con-identidad **derivas y elevas** la marca; nunca le impones un estilo de agencia. Extrae y documenta sus tokens reales antes de tocar nada.
7. **Prueba del clon (gate verbal):** *"¿qué hace que esto solo pueda ser de ESTE cliente y no de otros mil?"*. Si la respuesta apela a algo genérico, se rehace.

---

## Forbidden UI patterns (lista de enforcement)

Prohibidos **por defecto**. Detalle, porqué y alternativa en `DESIGN.md › Forbidden UI patterns`. Los marcados ⛔ son **prohibido salvo justificación escrita** (4 campos en `/decisiones/{fecha}-{patron}.md`: razón, quién aprobó, criterio medible, fecha de revisión).

1. Hero centrado + gradiente morado→indigo + Inter por defecto.
2. Fila de 3 cards idénticas (icono + título + 2 líneas de relleno).
3. ⛔ Glassmorphism por defecto (`backdrop-filter: blur()` sobre `rgba(255,255,255,.1)`).
4. La misma sombra suave (`shadow-md`) en TODO → usar escala de elevación.
5. Mismo `border-radius` en absolutamente todo → escala de radios por función.
6. ⛔ Paleta SaaS por defecto (purple/indigo/violet `#6366F1`/`#8B5CF6`).
7. Emojis como iconos de producto.
8. "Full-width centered everything" (todo a 100% y centrado).
9. Idéntico ritmo vertical en todas las secciones.
10. Pills/badges decorativos vacíos ("New", "Trusted by thousands" sin dato).
11. ⛔ Ilustraciones genéricas tipo unDraw / blobs / corporate-Memphis.
12. Degradados arcoíris/mesh multicolor sin propósito.
13. ⛔ "Dark mode por defecto" sin razón de marca.

---

## Reglas por componente (mínimos no negociables)

Las reglas completas de **hero, cards, botones, formularios, navegación, secciones y CTA** viven en `DESIGN.md › Component-specific rules`. **Se aplican siempre.** Mínimos transversales que se verifican aquí sin excepción:

- **Tokens, no hardcodes.** Cero hex/rgb sueltos en el CSS final que dupliquen un token existente.
- **Estados completos.** Botones: 6 estados (rest/hover/focus-visible/active/disabled/loading). Inputs, cards interactivas, links, tabs: 5 estados. Falta uno = incompleto.
- **Foco visible.** `:focus-visible` con contraste ≥3:1 y grosor ≥2px. `outline:none` sin reemplazo = prohibido.
- **Targets táctiles** ≥44×44px (objetivo), separación ≥8px.
- **Contraste WCAG AA:** texto normal ≥4.5:1; texto grande (≥24px o ≥18.66px bold) ≥3:1; no-texto (bordes de input, iconos informativos, indicador de foco) ≥3:1.
- **Escalas, no valores sueltos:** spacing base 4/8, escala tipográfica con ratio, radios por función, elevación por escala.
- **Ritmo variable** entre secciones (separación entre secciones ≥2× el gap interno). Prohibido el mismo `padding` vertical en todas.
- **Un solo CTA primario** por vista; un solo `<h1>` por página; jerarquía de headings sin saltos.
- **Identidad existente manda:** si la marca define radius/color/tipo/forma, se hereda; estos números son defaults para proyectos sin identidad y criterio de auditoría para lo existente. Los mínimos de a11y nunca se relajan.

---

## Checklist de revisión visual obligatorio

> Esta es la **puerta de salida**. Antes de marcar como terminado CUALQUIER trabajo de UI (página nueva, rediseño, landing, componente, sección, vista de chatbot), Claude ejecuta este checklist item por item. Cada item es **binario (PASA / NO PASA)**. No se admiten respuestas intermedias ("más o menos", "casi", "en general sí"). Si no puedes verificarlo objetivamente con el repo abierto y el render delante, cuenta como NO PASA.

**Cómo se ejecuta:** abre el render real en navegador (no el mockup mental ni el código a ojo), inspecciona con DevTools (`computed styles`, panel de contraste, device toolbar), y responde cada pregunta con `PASA` o `NO PASA`. En items con medición, anota el valor encontrado y el umbral (ej. `contraste 3.8:1 < 4.5:1 → NO PASA`; `body 13px < 15px → NO PASA`).

### Bloque 1: Identidad / Marca

- [ ] ¿Todos los colores usados existen como tokens en el design system del cliente/proyecto, y NINGUNO es un default de framework sin override (ej. `#3B82F6` blue-500, `#6366F1` indigo-500, `#8B5CF6` violet-500, `slate-900`, `gray-50` de Tailwind)? Verificación: cada valor de color en el render mapea a un nombre de token del archivo de tokens; cero hex/rgb hardcodeados en el CSS final.
- [ ] ¿La tipografía renderizada es la familia definida en la identidad de marca? Verificación: en DevTools `computed` el `font-family` activo es la fuente de marca, NO el fallback (`system-ui`, `Arial`, `-apple-system`) por fuente que no cargó. Cero FOUT/FOIT visible en recarga.
- [ ] Si el proyecto es **rediseño / landing sobre identidad existente**: ¿se conservan logo, paleta (mismos hex), type scale y type families de la marca, sin sustituirlos por un estilo de agencia? Test de reconocimiento: tapando el nombre, la pieza se identifica como de ESA marca y no como un template intercambiable.
- [ ] ¿El logo se usa en una versión oficial del kit (sin reescalar deformando ratio, sin recolorear fuera de sus variantes, sin distorsión), respeta su clear-space mínimo (≥ el definido en el manual; si no hay manual, ≥ la altura de la "x" del logotipo a cada lado) y mantiene contraste ≥3:1 contra su fondo?
- [ ] ¿Hay al menos **un asset de identidad propietario** visible (foto/ilustración real del cliente, tratamiento gráfico de marca, motivo recurrente) y CERO placeholders, stock genérico o íconos de librería puestos como relleno por defecto en la entrega final?

### Bloque 2: Jerarquía

- [ ] ¿Existe **un único** elemento dominante por pantalla/sección? Test: al mirar el render 1 segundo, el ojo aterriza en un solo punto; no hay dos o tres elementos compitiendo con peso visual equivalente (mismo `font-size` + mismo color + misma área).
- [ ] ¿La jerarquía combina **≥ 2 variables** (size + weight, color + posición, size + espacio) y NO se apoya solo en subir `font-size`? Verificación: entre nivel primario y secundario cambia más de un atributo.
- [ ] ¿El recorrido visual (CTA primario → secundario → terciario) es deducible **sin leer el texto**, solo por contraste de peso/color/tamaño? Test: en captura emborronada (blur ~8px) el orden de prioridad sigue siendo legible.
- [ ] ¿Hay **exactamente un CTA primario** (estilo `solid`/relleno de marca) por vista, y el resto son secundarios (`outline`/`ghost`/link)? Dos botones con el mismo relleno fuerte = NO PASA.

### Bloque 3: Tipografía

- [ ] ¿El número de familias tipográficas es **≤ 2** (≤ 3 solo si la tercera es monoespaciada con función específica: código, datos tabulares)?
- [ ] ¿Cada tamaño usado pertenece a una **escala con razón definida** (ej. 1.200 Minor Third, 1.250 Major Third, 1.333 Perfect Fourth) materializada en tokens? Verificación: no hay valores sueltos fuera de escala (ej. `15px`, `17px`, `23px`) salvo que sean pasos reales de la escala.
- [ ] ¿El body de lectura está entre **16–18px** (1–1.125rem), nunca < 14px? Texto auxiliar (captions, labels) ≥ 12px.
- [ ] ¿El `line-height` del body está entre **1.4 y 1.7** y el de headings entre **1.05 y 1.25**? Verificación: los headings NO heredan el 1.5 del body.
- [ ] ¿El ancho de línea de texto corrido está entre **45 y 75 caracteres** (`max-width` ~`60ch`–`75ch`)? El texto a 100% del viewport en desktop = NO PASA.
- [ ] ¿Los headings display grandes (≥ ~40px) llevan `letter-spacing` negativo entre **-0.01em y -0.03em** en lugar del tracking 0 por defecto, y los labels en mayúsculas pequeñas llevan tracking positivo (**+0.05em a +0.1em**)?
- [ ] ¿No hay `text-align: justify` (genera ríos sin hyphenation) ni `text-transform: uppercase` en bloques de **> 3 palabras** sin `letter-spacing` compensatorio ≥ +0.05em?

### Bloque 4: Color

- [ ] ¿La paleta funcional está acotada a **1 color de marca + 1 acento + rampa de neutrales + 3–4 estados semánticos** (success/warning/error/info)? Verificación: cuenta de hues con función propia; un hue sin rol asignado = NO PASA.
- [ ] ¿Los neutrales llevan **tinte intencional** coherente con la marca (HSL con saturación 2–8% hacia la temperatura de marca), evitando `#000000` puro en texto y `#FFFFFF` puro como único fondo cuando la marca tiene temperatura definida? Texto principal ≈ `#1A1A1F`–`#222` en vez de `#000`.
- [ ] ¿El acento ocupa **≤ ~10% del área** de la pantalla y se reserva para acción/foco/dato clave, dominando el neutral? El acento tiñendo fondos amplios (>30% del viewport) = NO PASA.
- [ ] ¿Se evita el gradiente cliché indigo→violeta (`#6366F1`→`#8B5CF6`, "indigo-violet SaaS") salvo que sea literalmente la identidad documentada del cliente? Alternativa: gradiente derivado de los hues de marca o color sólido de marca.
- [ ] ¿Los estados (hover, active, disabled, error, success) se **derivan por transformación consistente** del token base (ej. hover = -8% lightness; active = -14%; disabled = 38% opacity o token `*-muted`) y NO son hex ad-hoc inventados por estado?

### Bloque 5: Espaciado / Ritmo

- [ ] ¿TODO el espaciado (padding, margin, gap) sale de una **escala base de 4px u 8px** (ej. 4/8/12/16/24/32/48/64/96), sin valores huérfanos (`7px`, `13px`, `27px`)? Verificación: cada valor en DevTools es múltiplo de la base.
- [ ] ¿El espacio entre secciones es **≥ ~2×** el espacio interno de la sección (jerarquía por proximidad)? Todo equiespaciado al mismo gap = NO PASA.
- [ ] ¿Los elementos relacionados están más cerca entre sí que de otros grupos (ej. gap label→input ≤ 8px, gap entre grupos de campos ≥ 24px)? Label flotando a la misma distancia de su input que del campo vecino = NO PASA.
- [ ] ¿Hay **whitespace intencional** alrededor del contenido clave? Test: la pantalla NO está rellena de borde a borde; el bloque protagonista tiene aire (≥ 32px desktop / ≥ 16px móvil) que lo separa del ruido.
- [ ] ¿El contenido vive en un `container`/grid con `max-width` definido (ej. 1140–1280px para texto/UI; full-bleed solo para fondos/media intencional) y NO se estira a 1920px+ en pantallas anchas?

### Bloque 6: Componentes

- [ ] ¿Cada componente interactivo (botón, link, input, card clicable, tab) tiene los **5 estados** definidos y verificados en el render: default, hover, focus-visible, active, disabled? Estado asumido pero no probado = NO PASA.
- [ ] ¿El `border-radius` viene del token del sistema, con el **mismo radio** dentro de cada familia (todos los botones igual, todos los inputs igual)? Mezcla arbitraria de `4px`/`8px`/`16px` en componentes hermanos = NO PASA.
- [ ] ¿Las `box-shadow` salen de una **escala de elevación definida** (ej. sm/md/lg con offsets y blur escalados) y NO es la sombra default difusa gris de card SaaS (`0 1px 3px rgba(0,0,0,.1)`) repetida en todo? Sombras de marca con tinte (`rgba(<hue-marca>, ...)`) preferidas sobre negro puro.
- [ ] ¿Los íconos son de **un solo set** (mismo `stroke-width`, mismo estilo line o solid, sin mezclar) y alineados ópticamente con el texto (centro del ícono al centro de la x-height, tamaño ≈ 1em–1.25em del texto adyacente)?
- [ ] ¿Se reutilizan los componentes del repo/design system compartido en vez de re-crear variantes nuevas? Verificación: antes de crear, se buscó en el repo; cero duplicados que divergen de lo que ya construyeron UI/UX.

### Bloque 7: Accesibilidad WCAG AA

- [ ] ¿El contraste de texto normal es **≥ 4.5:1** y el de texto grande (≥ 24px regular o ≥ 18.66px bold) **≥ 3:1**, medido con DevTools/contrast checker (no estimado a ojo)?
- [ ] ¿El contraste de elementos no textuales (bordes de input, íconos informativos, indicador de foco, límites de componentes) es **≥ 3:1** contra su fondo adyacente?
- [ ] ¿Todo elemento interactivo tiene indicador **`:focus-visible`** con contraste ≥ 3:1 y grosor ≥ 2px? `outline: none` sin reemplazo = NO PASA.
- [ ] ¿Los targets táctiles son **≥ 24×24px** (objetivo 44×44px) con separación ≥ 8px entre targets adyacentes?
- [ ] ¿Toda imagen informativa tiene `alt` descriptivo, las decorativas tienen `alt=""`, y los íconos-botón sin texto visible llevan `aria-label`?
- [ ] ¿La información NO depende solo del color (error = ícono + texto, no "solo rojo"; estado = forma/etiqueta además del color) y los headings usan `h1`–`h6` en orden jerárquico sin saltos (no `h1`→`h4`)?
- [ ] ¿Es navegable por teclado en orden lógico (orden visual = orden de DOM/tab) y sin trampas de foco? Verificación: recorrido completo con Tab/Shift+Tab probado.

### Bloque 8: Responsive

- [ ] ¿Se verificó el render en **360px (móvil), 768px (tablet) y ≥ 1280px (desktop)** sin overflow horizontal (cero scroll lateral; `document.scrollingElement.scrollWidth` = ancho del viewport)?
- [ ] ¿Tipografía y espaciado **escalan entre breakpoints** vía `clamp()` o pasos por media query (ej. heading `clamp(2rem, 5vw, 4rem)`)? El mismo `64px` de heading en 360px que en 1280px = NO PASA.
- [ ] ¿En móvil real los targets táctiles cumplen ≥ 44×44px, los botones no están pegados (gap ≥ 8px) y el menú es operable con el pulgar (zona alcanzable, no solo top-bar)?
- [ ] ¿Las imágenes usan `srcset`/`sizes` o tamaños adecuados al contenedor? Cargar un asset de 2000px en una columna de 360px = NO PASA.
- [ ] ¿No hay contenido cortado, solapado, ni texto que desborda su contenedor en NINGUNO de los 3 breakpoints probados?

### Bloque 9: Anti-genérico

- [ ] ¿La pieza **NO** reproduce el layout default "AI-generated SaaS": hero centrado + subtítulo gris + dos botones + tres cards con ícono lineal arriba? Si el layout es ese, debe justificarse por brief; por inercia = NO PASA.
- [ ] Test de competidores: ¿puesta junto a 5 landings del mismo sector, **se distingue** por al menos un rasgo propio (composición, tratamiento de marca, foto real, sistema tipográfico)? Si es intercambiable con las otras = NO PASA.
- [ ] ¿Se evitaron los clichés concretos: gradiente indigo-violeta, ilustraciones "Corporate Memphis"/blobs genéricos, stock de gente sonriendo señalando una laptop, emojis usados como íconos, y la misma sombra default uniforme en todo? Cada uno presente = NO PASA salvo justificación de marca.
- [ ] ¿Hay **≥ 1 decisión de diseño deliberada** que demuestre intención (layout asimétrico justificado, ritmo tipográfico marcado, uso no obvio de la grilla, micro-interacción con propósito), en vez de todo centrado y simétrico por defecto?
- [ ] ¿El copy es real/del cliente (o placeholder con sentido del dominio)? "Lorem ipsum", "Your headline here" o textos de relleno en la entrega final = NO PASA.

### Bloque 10: Consistencia con el repo / departamentos

- [ ] ¿Los tokens usados (color, type, spacing, radius, shadow) son **exactamente** los del archivo de tokens compartido del repo, sin valores hardcodeados que dupliquen un token existente (ej. `#FF5A1F` escrito a mano cuando existe `--brand-accent`)?
- [ ] ¿Los nombres de clases/variables/componentes siguen la **convención del repo** ya establecida por UI/UX (mismo patrón de naming, ej. BEM o el que use el proyecto), sin introducir una nomenclatura paralela?
- [ ] ¿Los **datos** mostrados (nombres, textos, métricas, rutas de assets) provienen de la fuente compartida del proyecto y coinciden con lo que usan otros departamentos? Contenido inventado que diverge = NO PASA.
- [ ] ¿Este trabajo NO crea un componente/patrón que **ya existe** en el repo con otro nombre? Verificación: se buscó en el repo antes de crear.
- [ ] ¿Los cambios son coherentes con las decisiones documentadas en el chat "Estructura" y por los demás departamentos? Contradecir una decisión de UX ya tomada sin documentar la divergencia = NO PASA.

---

### Regla de bloqueo (innegociable)

**Si un solo item resulta `NO PASA`, el trabajo NO se entrega.** Hay exactamente dos caminos:

1. **Corregir** el item y volver a ejecutar el checklist completo de ese bloque.
2. **Documentar la excepción por escrito** con los tres campos obligatorios: (a) el item exacto que falla, (b) la justificación técnica o de negocio de por qué se acepta, (c) quién la aprueba. Si falta cualquiera de los tres, la excepción es inválida y el item sigue contando como `NO PASA`.

Las excepciones se registran en el chat "Estructura" del proyecto (no en un comentario suelto de código) para que todos los departamentos las vean. Una entrega con items `NO PASA` no documentados es **trabajo no terminado**, sin importar la percepción subjetiva de calidad. El checklist no es opcional ni se ejecuta de memoria: se corre contra el render real en cada cierre de tarea de UI.
