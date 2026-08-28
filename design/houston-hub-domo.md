# Art Direction — Hubs de Houston · piel "El Domo" (página completa)

Proyecto: Marcyan Web    Página/Vista: /es/houston + /en/houston (secciones bajo el hero)
Modo: REDISEÑO/IDENTIDAD (la dirección la fija el hero "El Domo" del dueño, ya construido)

## Inventario de marca conservada

CONSERVADO (no se toca):
- Todo el CONTENIDO y estructura: silo de 19 enlaces, servicios con precio, ficha,
  directorio, AnswerBlock/FAQ verbatim, CtaBand + reassure + Contact. Cero cambios de copy.
- Tokens globales (`tokens.css`) intactos; el resto del sitio NO ve esta piel.
- Motion existente de las secciones (E-02): hovers y transiciones actuales siguen.
- SpaceBackdrop tone="gold" (atmósfera global de landings).
- Política de CTAs por dispositivo (CtaBand form/wa/call) y contratos del panel.
ELEVADO (la piel, por scope de página `main.hst`):
- Acento oro del hub: los tokens `--accent-gold*` se REDEFINEN a la familia del domo
  (#BDA36E) dentro de `main.hst`: kickers, hovers, numerales y `em` de toda la página
  se re-pielan como SISTEMA (E-14), sin tocar selectores de componentes.
- Superficies: tarjetas de primer nivel pasan al lenguaje glass del hero (translúcido
  oscuro + hairline `rgba(240,237,232,0.09)` + radius 14). blur SOLO donde ya existía
  (nav y card del hero): el resto es glass "seco" (cero coste de composición).
- Eco salvia: radiales sutilísimos (≤0.10) en 2 superficies (ficha, demo del teaser),
  como eco del domo. Nunca compitiendo con oro en el mismo elemento (E-14).
- CTA de conversión de CtaBand (form) → pill claro del hero (#f0ede8/#0a0c0a, radius 99,
  halo): la excepción de CTA aprobada por el dueño para ESTE hub se extiende a la página
  para que el cierre rime con la apertura.
PROHIBIDO en este proyecto:
- Tocar copy, estructura, schema o el silo. Añadir efectos nuevos (E-08). Halos teal
  (E-03). Guiones decorativos (E-12). Copy temático espacial (E-13).

## 1. Dirección visual
Concepto rector: "la calma del domo continúa al aterrizar" — la página baja hereda la luz
verde-noche y el oro suave del hero. Adjetivos operativos: translúcido (superficies glass
secas), hairline (bordes 1px rgba blanca 0.09, no cajas), oro-desaturado (#BDA36E manda,
un acento por zona), radios 14 (tarjetas nivel 1), fotográfico-atmosférico (la atmósfera
la da SpaceBackdrop + ecos salvia, no losas negras — E-01).
Referencias: los propios artboards 11a/12a del dueño (mandan); patrón nav-glass ya
aprobado; DESIGN.md §1/§3.

## 2. Jerarquía
Sin cambios de orden ni de escala tipográfica (la página ya la tiene aprobada). La piel
solo unifica temperatura: acento único #BDA36E, superficies translúcidas escalonadas.

## 3. Intención por sección
Sin cambios (cada sección conserva su trabajo). El cierre (CtaBand) gana el pill claro
del hero para que el primer y el último CTA de la página sean el mismo gesto.

## 4. Estilo de componentes (tokens de la piel)
`main.hst { --accent-gold:#BDA36E; --accent-gold-deep:#8f7845; --accent-gold-dim:
rgba(189,163,110,0.15); --accent-gold-line:rgba(189,163,110,0.30); --accent-gold-glow:
rgba(189,163,110,0.25); --hst-line:rgba(240,237,232,0.09); --hst-surface:rgba(10,12,10,0.66);
--hst-sage:118,152,138; }`
Tarjetas nivel 1 (pcard, ficha__panel, answer__card, gost__demo): fondo --hst-surface,
borde --hst-line, radius 14px. Hover: borde --accent-gold-line (ya existente, re-tintado
por token). Filas/hover: rgba(240,237,232,0.04). Pill claro: #f0ede8 sobre #0a0c0a,
radius 99, halo 0 0 0 3px rgba(240,237,232,0.16).

## 5. Errores genéricos evitados (NO → SÍ)
- NO losas de negro crudo bajo el hero (E-01) → SÍ superficies translúcidas escalonadas
  + ecos salvia ≤0.10 sobre la atmósfera existente.
- NO oro y salvia compitiendo en el mismo bloque (E-14) → SÍ salvia solo en radiales de
  fondo; el acento de contenido es siempre el oro del hub.
- NO efectos nuevos apilados (E-08) → SÍ solo temperatura, superficie y radios.
- NO tocar copy ni añadir texto temático (E-12/E-13) → SÍ cero cambios de contenido.
- NO restyle global accidental → SÍ todo bajo `main.hst` (piel por página, esqueleto
  global: la decisión de nav del plan maestro, generalizada).

Sub-agentes invocados: ninguno (dirección dada por el hero del dueño; sin material nuevo).
Estado: VALIDADO por: el dueño (orden directa 2026-08-28: "vas a tomar el resto de la
landing y vas a adaptar el diseño para que encaje con el hero"). Fecha: 2026-08-28
