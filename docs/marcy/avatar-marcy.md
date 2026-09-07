# Avatar de "Marcy" (asistente del sitio)

> Este documento vivía en `public/assets/bot/README.md`, donde el build lo
> publicaba en `https://<dominio>/assets/bot/README.md` junto con el prompt del
> personaje. Se movió aquí el 2026-09-07: `public/` se sirve tal cual.

Avatar = **render 3D del dueño, colorway BLANCO glossy** (desde 2026-09-06; el
anterior era el mismo personaje en negro): ojos teal con glow, acentos oro,
cascos, anillo de Saturno sobre la cabeza y planeta en el pecho. Se sirve como
imagen optimizada con **fondo transparente**.

## Archivos

| Archivo            | Uso                                                   | Tamaño    |
|--------------------|-------------------------------------------------------|-----------|
| `marcy-hero.webp`  | pose completa, pantalla de bienvenida del chat         | 364×512   |
| `marcy-hero.png`   | fallback PNG del héroe                                 | 364×512   |
| `marcy-mini.webp`  | busto (anillo + cabeza + cascos + planeta del pecho)   | 256×256   |
| `marcy-mini.png`   | fallback PNG del busto                                 | 256×256   |

Los pesos cambian en cada regeneración, así que no se listan: míralos con
`ls -la public/assets/bot/`.

### Quién los consume

1. `src/components/chat/MarcyAvatar.astro`, con `<picture>` (WebP + PNG). Lo usa
   `ChatWidget.astro` dos veces: el **busto** en la cabecera del panel y el
   **héroe** en la bienvenida. Las dos van **diferidas** (`defer` → `data-src` /
   `data-srcset` + placeholder 1×1): el JS del widget les pone el `src` real al
   ABRIR el chat, así que ningún asset del avatar entra en el render inicial.
   El FAB cerrado **no** muestra el avatar, lleva un icono lucide.
2. `src/components/sections/GrowthTeaser.astro`, que enlaza `marcy-mini` **a
   pelo** (36×36, `loading="lazy"`) en la tarjeta de ejemplo del diagnóstico.
   Sale en 6 páginas: home, Houston y Miami, en ES y EN. **Si tocas el busto,
   mira también esa tarjeta**, no solo el chat.

Master transparente (no se sirve): `docs/galeria-src/marcy-blanco-master-transparente.png`.
Esa carpeta está en `.gitignore`; el render original vive en las descargas del dueño.

## Regenerar desde un render nuevo

### 1. Quitar el fondo

NO uses un recorte por color: el visor, los cascos y las manos **también son
negros en el colorway blanco** y se destruirían. Usa segmentación por IA
(`rembg`, modelo `isnet-general-use`, con `alpha_matting`) en un venv aislado.

Trampa en Windows: `requests` no valida github.com para bajar los pesos. Instala
`truststore` y llama a `truststore.inject_into_ssl()` **antes** de importar
`rembg`, o baja los `.onnx` a `~/.u2net/` con Node. Verificado 2026-09-06:
recorte limpio, sin halo.

Guarda el resultado como el master transparente citado arriba.

### 2. Generar los 4 ficheros

```bash
node scripts/build-marcy-avatar.mjs docs/galeria-src/marcy-blanco-master-transparente.png
```

El script imprime el bbox del cuerpo, los dos recortes y el bbox opaco de cada
salida. Con `--dry` calcula y no escribe nada.

### 3. Comprobar a tamaños REALES

Sobre el fondo del panel (`--bg-elevated`), no a tamaño completo: héroe a **76 px**
(desktop) y **112 px** (móvil), busto a **38 px** (cabecera del chat) y **36 px**
(tarjeta del diagnóstico). Compara contra la versión anterior en una hoja de
contacto de dos columnas.

### 4. Si cambian las dimensiones

Actualiza `dims` en `src/components/chat/MarcyAvatar.astro` (hoy 364×512 y
256×256) y el `width`/`height` de `GrowthTeaser.astro`, o habrá deformación.

## El encuadre es intocable

**Regla dura del dueño: los recortes NO cambian entre colorways.** Las constantes
`HERO` y `MINI` de `scripts/build-marcy-avatar.mjs` son ese contrato, expresadas
como fracciones del bbox opaco del cuerpo (umbral alfa > 8) para que sirvan con
cualquier render, a cualquier resolución.

Salieron de alinear por fuerza bruta el **busto negro** sobre el **héroe negro**
de `main` (mínimos cuadrados sobre el canal alfa, rejilla 48×48, refinado a ¼ px),
que devuelve el rectángulo del busto en coordenadas del héroe. Dos derivaciones
independientes coincidieron en 1 px de 735.

No las toques "a ojo". El bbox opaco de salida no sirve para detectar un error:
el busto sangra el cuadrado en las dos versiones, así que siempre mide 256×256
llene lo que llene. Si sospechas de una deriva, cuenta píxeles opacos en la
primera y la última columna del PNG y compara con el negro, o repite la alineación.

## Prompt del personaje (para generar otra pose o estado)

> A cute friendly 3D robot mascot, glossy smooth rounded design, premium app-mascot
> style (Pixar-like), glossy white body with black visor face and black glossy ear
> cups and hands, glowing soft teal eyes, gold metallic accents (ear trims, joints)
> and a small gold ringed-planet emblem on the chest, a tiny black planet with a
> gold ring floating above the head as a space motif, warm curious helpful
> expression, gently floating pose, soft studio lighting with subtle teal and gold
> rim light, clean minimal, isolated on transparent background, high detail
> —no text, low-poly, fragmented, neon, purple, blue
