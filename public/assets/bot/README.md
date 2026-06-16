# Avatar de "Marcy" (asistente del sitio)

Avatar = **render 3D aprobado** (robot negro glossy, ojos teal con glow, acentos
oro, audífonos, anillo de Saturno sobre la cabeza + planeta en el pecho). Se sirve
como imagen optimizada con **fondo transparente**.

## Archivos (los consume `src/components/chat/MarcyAvatar.astro`)

| Archivo            | Uso                                   | Tamaño aprox |
|--------------------|---------------------------------------|--------------|
| `marcy-hero.webp`  | pose completa — pantalla de bienvenida | 364×512, ~53KB |
| `marcy-hero.png`   | fallback PNG del héroe                  | 364×512, ~270KB |
| `marcy-mini.webp`  | busto (cabeza+cascos+anillo+planeta) — header/FAB | 256×256, ~26KB |
| `marcy-mini.png`   | fallback PNG del mini                   | 256×256, ~122KB |

`MarcyAvatar.astro` usa `<picture>` (WebP + PNG fallback). El **héroe carga
diferido** (`defer` → `data-src`, lo activa el JS al ABRIR el chat) para no pesar
en el render inicial del sitio; el **mini va eager** porque el FAB es visible.

## Regenerar desde un render nuevo

Deja el render fuente (PNG transparente, vertical) como `marcy-hero.png` y corre
(necesita `sharp`, ya está en `node_modules`):

```js
const sharp = require('sharp');
const src = await sharp('public/assets/bot/marcy-hero.png').ensureAlpha().toBuffer();
// HERO: recorta el margen transparente del cuerpo y escala a 512 de alto.
//   Ajusta el bbox {left,top,width,height} al nuevo render (mide el área opaca).
const hero = { left:123, top:176, width:769, height:1081 };
await sharp(src).extract(hero).resize({height:512}).webp({quality:84, alphaQuality:100}).toFile('public/assets/bot/marcy-hero.webp');
await sharp(src).extract(hero).resize({height:512}).png({compressionLevel:9}).toFile('public/assets/bot/marcy-hero.png');
// MINI: recorta el busto (cabeza + cascos + anillo + planeta) y escala a 256².
const mini = { left:139, top:206, width:730, height:730 };
await sharp(src).extract(mini).resize(256,256).webp({quality:86, alphaQuality:100}).toFile('public/assets/bot/marcy-mini.webp');
await sharp(src).extract(mini).resize(256,256).png({compressionLevel:9}).toFile('public/assets/bot/marcy-mini.png');
```

Si el fondo NO es transparente (sale recuadro sobre el panel oscuro), recórtalo
primero. El cableado del widget (clases, tamaños, animación de flotar) no cambia:
solo se sustituyen estos 4 archivos.

## Prompt del personaje (para generar otra pose/estado)

> A cute friendly 3D robot mascot, glossy smooth rounded design, premium app-mascot
> style (Pixar-like), dark charcoal near-black glossy body, glowing soft teal eyes,
> gold metallic accents and a small gold chest light, a tiny orbiting planet/ring emblem
> as a space motif, warm curious helpful expression, gently floating pose, soft studio
> lighting with subtle teal and gold rim light, clean minimal, isolated on transparent
> background, high detail —no text, low-poly, fragmented, neon, purple, blue
