# Art Direction — Marcyan Home (pase correctivo 2026-06-22)

Proyecto: Marcyan Web · Página/Vista: Home `/es/` (+ espejo `/en/`, landings `clusters.ts`)
Modo: **REDISEÑO / IDENTIDAD** (la marca + DS v2 "Space-Tech" ya existen; se deriva, no se inventa)
Fuente de validación: **brief explícito del humano + imagen-guía adjunta** (lista de 10 errores de diseño, 2026-06-22). En REDISEÑO con guía provista, el humano YA fijó la dirección.

## Inventario de marca conservada
```
CONSERVADO (no se toca):
- Tokens: tokens.css (oro #c8a96e, teal #4fc3a1, fondos #080808/#141414, radios 4/8/12/20/pill)
- Tipografía: Space Grotesk (display) + DM Sans (texto) + JetBrains Mono (datos/labels)
- Acentos con MODERACIÓN: oro ~7%, teal ~3%; teal = señal IA/"en vivo"
- Mascota "Marcy" (render 3D) — sigue en la pantalla de bienvenida del chat (variant hero)
ELEVADO (mejoro dentro del marco):
- Convención de iconografía: UNA familia (Lucide outline, stroke 1.5px) + el icono de
  marca `marcyan-ai` reservado a UN solo slot insignia. Cero reuso del mismo icono para
  conceptos distintos.
- Tarjetas de ciudad: de simples a "ficha de ciudad" rica (tagline, pills estado+coords,
  ilustración line-art, sub-enlaces con icono+subtítulo, pie "CONECTADOS CON…").
PROHIBIDO en este proyecto:
- Cambiar hex de marca, sustituir tipografías, mezclar 2ª familia de iconos (filled+outline
  al azar), em-dashes "—" como muletilla en cuerpo de texto (tic de IA).
```

## 1) Dirección visual
Concepto rector: **"sala de control espacial, legible"**. Adjetivos operativos: oscuro-cálido,
monocromo+2 acentos (oro/teal), datos en mono, line-art técnico, jerarquía por contraste (no
por color saturado). Referencias de principio (no se clonan): paneles de telemetría (densidad de
datos en mono), mapas catastrales/coordenadas (pills de dato), ilustración editorial line-art de
skylines (peso de trazo uniforme). Contraste: fg-primary/bg ≥ 13:1; texto secundario sobre card
cumple AA.

## 2) Jerarquía de la página (sin cambios de orden)
Hero (titular → CTA → órbita-nav) → Servicios → IA → Proceso → Proyectos → Garantías →
Ciudades → Contacto. Una sola acción primaria por vista (CTA oro sólido). Los **nodos en
órbita del hero quedan como capa de navegación real** (su trabajo UX), y el "Caso 0" se
elimina por restar foco sin aportar a la conversión.

## 3) Intención por sección (solo lo que cambia)
- **Hero:** vender la promesa + dar navegación viva (nodos = atajos a secciones). Quitar Caso 0
  (ruido). Anillo del planeta = adorno coherente, trazo uniforme (no parecer roto).
- **Servicios / IA / Garantías:** cada capacidad necesita su icono EXACTO; un icono = un
  concepto. El robot de marca `marcyan-ai` señala la capacidad insignia "ser encontrado por IA"
  (SEO para IA), no se reparte.
- **Proyectos:** prueba social SIN exponer el dominio del cliente (privacidad) → fuera la URL.
- **Ciudades:** convertir "área de servicio" en ficha memorable y escaneable (recrear la guía).

## 4) Estilo de componentes (tokens)
- Iconos: Lucide outline, `stroke-width:1.5`, tamaños existentes (15–34px por contexto). El
  único filled permitido = `marcyan-ai` (marca), 1 sola aparición.
- FAB chat: vuelve al círculo **teal sólido** (`--accent-teal` + `--fg-inverse`) con
  `lucide:message-circle` (más jerarquía que el avatar) + punto "en vivo" pulsante; nudge =
  "Respuesta en vivo".
- Tarjeta de ciudad: `--bg-card`, borde `--border` (hover `--border-accent`), radius-lg; pills
  con radius-pill, dato en mono; ilustración line-art en oro a baja opacidad (decorativa,
  aria-hidden); sub-enlace = icono(box teal-dim)+título(display)+subtítulo(secondary)+flecha.
- Estados: hover (borde acento / flecha desplaza), focus-visible (outline teal 2px) intactos.

## 5) Errores genéricos evitados (NO → SÍ)
- NO un icono reutilizado para 3 conceptos (marcyan-ai ×4) → SÍ un icono distinto y preciso por
  concepto; marca en 1 slot.
- NO `lucide:workflow` genérico para automatizaciones → SÍ `lucide:waypoints` (flujo conectado).
- NO robot pobre en "IA conversacional" → SÍ `lucide:messages-square` (conversación real).
- NO em-dashes "—" como muletilla en el cuerpo → SÍ comas/puntos (se conservan rangos
  "Lun–Vie" y guiones decorativos en titulares).
- NO exponer el dominio del cliente en portafolio → SÍ resultado + tags, sin URL.
- NO tarjeta de ciudad plana → SÍ ficha con identidad local (skyline/palmera, coords, sub-nav).
- NO avatar de baja jerarquía como FAB → SÍ botón de mensaje teal sólido + señal en vivo.

Sub-agentes invocados: (ilustración → inline, hecha a mano: skylines + siluetas TX/FL)
Estado: **VALIDADO** por: humano (brief 2026-06-22) · Fecha: 2026-06-22

---

# Pantalla: Bienvenida del chatbot "Marcy" → Selector de canal de contacto

```
Proyecto: Marcyan Studio · Página/Vista: ChatWidget.astro — estado "welcome"
Modo: REDISEÑO/IDENTIDAD
Estado: VALIDADO por: dueño (mockup aprobado, screenshot) · Fecha: 2026-06-22
```

**Por qué:** hoy el FAB abre directo la conversación. El dueño quiere una **pantalla
previa** donde el cliente elige cómo contactar (mockup aprobado pixel a pixel). No es
estética nueva: se reusa el estado `welcome` existente (welcome → chat) y cambia su
CONTENIDO de "grid de temas + input" a "selector de canal".

Inventario de marca conservada — CONSERVADO: tokens DS v2, tipos (Space Grotesk/DM Sans),
**avatar "Marcy" como FAB y héroe** (el FAB-teal de la sección de arriba quedó REVERTIDO; el
avatar es lo aprobado y vive), glow/estrellas, y TODO el blindaje del bot (contrato /api/chat,
captura → /api/contact|/api/handoff, PII fuera del modelo, stripMarkdown, focus-trap,
VisualViewport). ELEVADO: welcome de grid 2×2 → lista de 4 tarjetas de canal con 1 acción
dominante. PROHIBIDO: tocar hex/tipos, romper el blindaje, pintar texto del modelo como HTML.

1) **Dirección visual:** "recepción espacial" — oscuro-premium, monocromo + 2 acentos (teal =
   canales, oro = la oferta gancho), táctil (tarjetas ≥56px). Referencia fuera de nicho: el
   "channel switchboard" de los messengers de soporte (Intercom/Crisp) — se toma la idea de
   rutas icono+texto+flecha; NO su azul ni su tipografía. Iconos lucide; WhatsApp/iMessage =
   glifos SVG inline monocromos teñidos teal (no hay set de marcas; sin dep nueva).
2) **Jerarquía:** avatar + "Hola, soy Marcy" → "¿Cómo prefieres contactarnos?" → 4 rutas →
   gancho oro (dominante) → pie de privacidad. Título `--text-xl`/600, tarjetas título `--text-md`.
   Una sola acción dominante: "Diagnóstico gratis" en oro; el resto en teal (secundarias).
3) **Intención por tarjeta:** Chat con Marcy → entra a la conversación. Mensaje directo →
   WhatsApp/iMessage al número de Houston. Formulario de contacto → captura inline (nombre +
   email/tel). Diagnóstico gratis (oro) → siembra el mensaje de diagnóstico. Pie: escudo +
   nota de privacidad + "Dejar mis datos" (atajo a la captura).
4) **Componentes (tokens):** tarjeta `--radius-lg`, `bg-elevated`, `1px solid --border`; icono
   en círculo 44px (teal-dim/teal-line), flecha en círculo 32px (borde fino). Variante oro =
   gold-dim/gold-line, título+flecha en oro + `--shadow-gold` en hover. La tarjeta de canales
   NO es botón (contiene 2 pills-enlace) → sin pointer; los pills sí tienen los 5 estados.
5) **Errores evitados (NO → SÍ):** NO abrir el chat de golpe → SÍ pantalla previa de canal;
   NO 2 CTAs gemelos → SÍ 1 dominante en oro; NO logos multicolor de stock → SÍ glifos teñidos
   al DS; NO radios al azar → SÍ radius-lg tarjetas/radius-md pills/círculos; NO copy de relleno
   → SÍ una frase de trabajo real por tarjeta (sin em-dash, regla de la sección de arriba).

Sub-agentes invocados: ninguno (mockup aprobado + DS existente cubren la dirección).

---

# Pantalla: FOOTER del sitio (rediseño completo)

```
Proyecto: Marcyan Web · Página/Vista: SiteFooter.astro (global, todas las páginas)
Modo: REDISEÑO/IDENTIDAD
Estado: VALIDADO por: dueño (2 imágenes-spec: handoff de desarrollo + librería SVG) · Fecha: 2026-06-26
```

**Fuente de verdad:** el dueño entregó una especificación de desarrollo COMPLETA en 2 imágenes
(estructura/tokens/tipografía/espaciado/layout/componentes + librería de activos SVG) y pidió
"rígete exactamente por las instrucciones de las imágenes". Se sigue al pie: layout de 2 secciones,
4 columnas + bloque de marca, franja inferior (misión + 3 stats + tarjeta de proyecto), barra legal
con planeta central, iconografía lineal 1.5px, capas decorativas (skyline + planeta + arco + horizonte).

**Dos conflictos resueltos con el dueño (AskUserQuestion 2026-06-26):**
1. **Métricas → NÚMEROS HONESTOS.** El spec mostraba "+150 Proyectos" y "9+ Años" → FALSO (4 clientes
   reales, agencia joven; regla de honestidad dura). Reemplazados por stats verdaderos: "24 h · propuesta
   gratis", "ES · EN · bilingües de verdad", "2 · Houston y Miami". (La de "2 ciudades" del spec sí era real.)
2. **Sistema visual → ADAPTAR AL DS.** El spec traía tokens/fuente propios (oro #D6B26A, #050505, radios
   10/14/18, Sora) que chocan con el `PROHIBIDO: cambiar hex/tipografías` del DS v2. Se MAPEA al DS vivo:
   oro #c8a96e, fondos #080808/#141414, radios 4/8/12/20, Space Grotesk/DM Sans/JetBrains Mono. Estructura,
   copy, layout, iconos y capas decorativas del spec SE RESPETAN; solo cambian los valores de token/fuente.

## Inventario de marca conservada
```
CONSERVADO: tokens.css (oro #c8a96e, teal #4fc3a1, #080808/#141414, radios 4/8/12/20/pill), tipos
  (Space Grotesk/DM Sans/JetBrains Mono), iconografía Lucide outline 1.5px (1 familia), marca planeta.
ELEVADO: el footer pasa de simple (marca+3 cols+legal) a rico (marca+hero+CTA+atajos · 4 cols ·
  franja misión/stats/proyecto · barra legal con planeta), según el spec, pero con tokens del DS.
PROHIBIDO: cambiar hex de marca, sustituir tipografías (NO Sora), inventar stats, enlaces a 404,
  iconos de redes a perfiles inexistentes.
```

1) **Dirección visual:** la del spec, traducida al DS — "sala de control espacial, legible", oscuro-cálido,
   monocromo + oro (acento) con moderación, line-art 1.5px, datos/overlines en mono. Capas decorativas
   (skyline, glow de horizonte, arco orbital, planeta divisor) a baja opacidad, detrás del contenido,
   `aria-hidden`, sin sombras pesadas (glow sutil).
2) **Jerarquía:** (1) bloque de marca con hero "Impulsa tu presencia digital." + 1 CTA oro dominante →
   (2) columnas de navegación → (3) franja de confianza (misión/stats/proyecto) → (4) barra legal. Una sola
   acción primaria por zona (CTA oro). H del footer = `.h3`/display; overlines de columna en mono.
3) **Intención por sección:** Marca+hero = recordar la promesa y dar 1 ruta a conversión (CTA + atajos).
   Columnas = mapa del sitio (servicios/empresa/ciudades/contacto). Franja = prueba/confianza honesta
   (misión + 3 datos reales + invitación a agendar). Legal = obligaciones + remate de marca (planeta).
4) **Estilo de componentes (tokens DS):** enlaces de columna con bullet chevron (lucide:chevron-right 14px
   oro) + texto `--fg-secondary` hover `--fg-primary`, item ~40px. CTA = Button primario oro existente.
   Atajos = chip icono+texto (Lucide 1.5px). Contacto = stack con iconos mail/phone/clock 18px. Stat =
   valor display + label `--fg-secondary`, separador vertical `--border`. Tarjeta proyecto = `--bg-card`,
   `1px solid --border` (hover `--border-accent`), radius-lg, icono 20px. Planeta divisor = SVG inline
   (gradiente oro + anillo + punto teal #4fc3a1, no #00E0C6 del spec → se usa el teal del DS). Estados:
   hover (color/borde acento), focus-visible (outline oro 2px del reset global).
5) **Errores genéricos evitados (NO → SÍ):** NO Sora/hex del spec → SÍ Space Grotesk + #c8a96e (consistencia
   de sitio). NO stats inflados → SÍ datos reales. NO iconos de redes a perfiles inexistentes → SÍ se omiten
   hasta tener handles. NO radios 10/14/18 mezclados → SÍ escala DS 8/12/20. NO sombras pesadas → SÍ glow
   sutil + bordes. NO enlaces a 404 → SÍ todas las rutas verificadas existen.

Sub-agentes invocados: ninguno (spec del dueño + DS existente cubren la dirección; ilustración decorativa
inline hecha a mano: skyline + arco + planeta).
