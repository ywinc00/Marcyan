# Avatar de "Marcy" (asistente del sitio)

Avatar = **render 3D del dueño, colorway BLANCO glossy** (desde 2026-09-06; el
anterior era el mismo personaje en negro): ojos teal con glow, acentos oro,
cascos, anillo de Saturno sobre la cabeza + planeta en el pecho. Se sirve como
imagen optimizada con **fondo transparente**.

## Archivos (los consume `src/components/chat/MarcyAvatar.astro`)

| Archivo            | Uso                                          | Tamaño        |
|--------------------|----------------------------------------------|---------------|
| `marcy-hero.webp`  | pose completa — pantalla de bienvenida        | 364×512, ~35KB |
| `marcy-hero.png`   | fallback PNG del héroe                         | 364×512, ~265KB |
| `marcy-mini.webp`  | busto (anillo + cabeza + cascos + planeta) — header/FAB | 256×256, ~16KB |
| `marcy-mini.png`   | fallback PNG del mini                          | 256×256, ~110KB |

`MarcyAvatar.astro` usa `<picture>` (WebP + PNG fallback). El **héroe carga
diferido** (`defer` → `data-src`, lo activa el JS al ABRIR el chat) para no pesar
en el render inicial del sitio; el **mini va eager** porque el FAB es visible.

Master transparente (no se sirve): `docs/galeria-src/marcy-blanco-master-transparente.png`
(carpeta ignorada por git; el render original vive en las descargas del dueño).

## Regenerar desde un render nuevo

1. **Quitar el fondo** (si el render viene con fondo pegado). NO usar un recorte
   por color: el visor, los cascos y las manos también son negros y se
   destruirían. Usar segmentación por IA (`rembg`, modelo `isnet-general-use`,
   con `alpha_matting`) en un venv aislado. Ojo en Windows: `requests` no valida
   github.com para bajar los pesos → `pip install truststore` y
   `truststore.inject_into_ssl()` antes de importar `rembg` (o bajar los `.onnx`
   a `~/.u2net/` con Node). Verificado 2026-09-06: recorte limpio, sin halo.
2. **Generar los 4 archivos** con `sharp` (ya en `node_modules`), midiendo el
   bbox opaco del cuerpo automáticamente y aplicando el ENCUADRE DE PARIDAD con
   la versión negra original (regla del dueño: los recortes no cambian entre
   colorways). Con `t` = bbox opaco del cuerpo en el master:
   - HERO: `t` ampliado con el mismo aire relativo que el original (7 px de
     512 de alto y 7 px de 364 de ancho, es decir `mx = t.width·7/350`,
     `my = t.height·7/498`), escalado a **512 de alto** → 364×512
     (WebP q84 alpha 100 + PNG nivel 9).
   - MINI: cuadrado con `left = t.left + t.width·16/769`,
     `top = t.top + t.height·30/1081`, `lado = t.width·730/769` (anillo + cabeza
     + cascos + planeta del pecho; el busto llena el cuadrado), escalado a **256²**.
     Estas fracciones son los bboxes del README original (hero {123,176,769,1081},
     mini {139,206,730,730}) expresados en relativo, verificados en una hoja
     viejo/nuevo a 96/58/38 px (busto) y 112/76 px (héroe).
3. Comprobar en una hoja de contacto a tamaños REALES (héroe 76/112 px, mini
   38/58 px) sobre el fondo del panel (`--bg-elevated`), no a tamaño completo.
4. Si cambia el alto/ancho resultante del héroe, actualizar `dims` en
   `MarcyAvatar.astro` (hoy 364×512) para no distorsionar.

El cableado del widget (clases, tamaños, animación de flotar, halos) no cambia:
solo se sustituyen estos 4 archivos.

## Prompt del personaje (para generar otra pose/estado)

> A cute friendly 3D robot mascot, glossy smooth rounded design, premium app-mascot
> style (Pixar-like), glossy white body with black visor face and black glossy ear
> cups and hands, glowing soft teal eyes, gold metallic accents (ear trims, joints)
> and a small gold ringed-planet emblem on the chest, a tiny black planet with a
> gold ring floating above the head as a space motif, warm curious helpful
> expression, gently floating pose, soft studio lighting with subtle teal and gold
> rim light, clean minimal, isolated on transparent background, high detail
> —no text, low-poly, fragmented, neon, purple, blue
