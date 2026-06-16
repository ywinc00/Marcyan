# Avatar de "Marcy" (asistente del sitio)

Hoy el avatar es un **SVG vectorial original** (`src/components/chat/MarcyAvatar.astro`):
transparente, escala perfecta, 0 peticiones de red y temable con los tokens del DS.
No hace falta ningún archivo aquí para que funcione.

## Cómo cambiar a un render 3D (fase 2, opcional)

1. Genera a Marcy con este prompt (Midjourney / DALL·E / Meshy), fondo **transparente**:

   > A cute friendly 3D robot mascot, glossy smooth rounded design, premium app-mascot
   > style (Pixar-like), dark charcoal near-black glossy body, glowing soft teal eyes,
   > gold metallic accents and a small gold chest light, a tiny orbiting planet/ring emblem
   > as a space motif, warm curious helpful expression, gently floating pose, soft studio
   > lighting with subtle teal and gold rim light, clean minimal, isolated on transparent
   > background, high detail —no text, low-poly, fragmented, neon, purple, blue

2. Exporta y optimiza a **WebP** (con PNG de respaldo) y déjalos aquí:
   - `marcy-hero.webp` / `marcy-hero.png`  → ~512px (pantalla de bienvenida)
   - `marcy-mini.webp` / `marcy-mini.png`  → ~96px  (header + botón flotante)

3. En `src/components/chat/MarcyAvatar.astro`, reemplaza el `<svg>` de cada variante por:

   ```html
   <picture>
     <source srcset="/assets/bot/marcy-hero.webp" type="image/webp" />
     <img class="marcy marcy--hero" src="/assets/bot/marcy-hero.png" alt="" loading="lazy" decoding="async" />
   </picture>
   ```

El cableado del widget (clases `marcy` / `marcy__float` / `marcy__eyes`, tamaños y
animaciones) no cambia: solo se sustituye el contenido del avatar.
