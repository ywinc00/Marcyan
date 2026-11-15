<script>
  /* ════════════════════════════════════════════════════════════════
     KpiArt — ilustración de las cifras (fase 3, 2026-11-15). Rehecha como
     en la lámina original de Orbit: objetos GRANDES, monocromos y en relieve
     (grafito mate con luz arriba a la izquierda), que la tarjeta corta por
     su borde inferior derecho. Sin color: la cifra manda (H-07).

     Técnica única para todo el juego: cada objeto es una o varias «losas»
     (cara con degradado + canto más oscuro desplazado + filo de luz) en un
     plano algo girado; los detalles van grabados en gris claro. Los objetos
     propios (hojas, carpeta, sobre, monedas, tarjeta, reloj, columnas,
     fichas con visto) copian los de la referencia; el resto es una ficha con
     un dibujo de Hugeicons (MIT) grabado encima, la misma familia de iconos
     del panel.

       <KpiArt kind="docs" />            ancho por defecto 112 px
       <KpiArt kind="coins" size={48} /> (vacíos: más pequeña)

     kinds: inbox · docs · invoice · folder · check · clock · coins · card ·
     chart-up · alert · warning · bell · cursor · eye · medal · users ·
     rocket · pause · chat · calendar · search (otro → ficha lisa).
     ════════════════════════════════════════════════════════════════ */
  let { kind = '', size = 112 } = $props();

  const uid = 'ka' + Math.random().toString(36).slice(2, 9);
  const g = (n) => `url(#${uid}-${n})`;

  // Dibujos grabados en las fichas (Hugeicons, MIT; trazo lo pone la ficha).
  const GLYPHS = {
    "bell": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M20 18.501L18.349 7.934a6.426 6.426 0 0 0-12.698 0L4 18.501\"/><path d=\"M20 18.5c0-1.657-3.582-3-8-3s-8 1.343-8 3s3.582 3 8 3s8-1.343 8-3m-7 0h-2\"/></g>",
    "cursor": "<path fill=\"none\" stroke=\"currentColor\" stroke-linejoin=\"round\" d=\"m5.108 14.386l.478-6.473q.048-.666.086-1.251c.178-2.678.273-4.103 1.376-4.552c1.103-.45 2.154.51 4.13 2.312q.43.393.924.839l4.808 4.322c1.353 1.215 2.029 1.823 2.083 2.406c.038.4-.086.797-.344 1.103c-.376.447-1.276.555-3.075.773c-.758.091-1.137.137-1.367.339a1 1 0 0 0-.315.536c-.064.3.079.656.365 1.37l1.482 3.696c.172.427.257.64.256.837a1 1 0 0 1-.296.703c-.14.138-.352.224-.776.396s-.636.26-.83.258a.98.98 0 0 1-.7-.299c-.136-.14-.221-.354-.393-.78l-1.482-3.697c-.286-.713-.43-1.07-.683-1.24a1 1 0 0 0-.596-.165c-.304.015-.608.247-1.217.712c-1.444 1.103-2.167 1.654-2.745 1.596c-.396-.04-.76-.24-1.009-.553c-.362-.457-.295-1.368-.16-3.188Z\"/>",
    "eye": "<g fill=\"none\" stroke=\"currentColor\"><path d=\"M21.544 11.045c.304.426.456.64.456.955c0 .316-.152.529-.456.955C20.178 14.871 16.689 19 12 19c-4.69 0-8.178-4.13-9.544-6.045C2.152 12.529 2 12.315 2 12c0-.316.152-.529.456-.955C3.822 9.129 7.311 5 12 5c4.69 0 8.178 4.13 9.544 6.045Z\"/><path d=\"M15 12a3 3 0 1 0-6 0a3 3 0 0 0 6 0Z\"/></g>",
    "medal": "<g fill=\"none\" stroke=\"currentColor\"><path stroke-linecap=\"round\" d=\"M8.5 2v8.5m7-8.5v8.5\"/><path d=\"M17.916 2.012H6.084c-.911 0-2.117-.158-2.74.684C3 3.161 3 3.833 3 5.178c0 1.147 0 1.72.232 2.204c.396.825 1.282 1.183 2.04 1.573l3.71 1.904C10.461 11.62 11.202 12 12 12s1.537-.38 3.019-1.14l3.708-1.905c.76-.39 1.645-.748 2.041-1.573C21 6.899 21 6.325 21 5.178c0-1.345 0-2.017-.344-2.482c-.623-.842-1.829-.684-2.74-.684Z\"/><path stroke-linejoin=\"round\" d=\"M10.53 13.638C11.247 13.213 11.606 13 12 13s.752.213 1.47.638l1 .591c.747.441 1.12.662 1.325 1.031s.205.819.205 1.719v1.042c0 .9 0 1.35-.205 1.719s-.578.59-1.324 1.03l-1 .592c-.719.426-1.078.638-1.471.638s-.752-.212-1.47-.638l-1-.591c-.747-.441-1.12-.662-1.325-1.031S8 18.921 8 18.021v-1.042c0-.9 0-1.35.205-1.719s.578-.59 1.324-1.03z\"/></g>",
    "users": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M18.5 20.5c-.234-2.931-2.658-5.252-5.692-5.448L11.999 15q-.431.012-.811.03C8.18 15.172 5.73 17.597 5.5 20.5m9.75-11.25a3.25 3.25 0 1 1-6.5 0a3.25 3.25 0 0 1 6.5 0M5.502 8.5A3.25 3.25 0 0 1 9.5 3.752M18.496 8.5A3.25 3.25 0 0 0 14.5 3.752M22 18c-.18-2.263-2-4.5-4-5M2 18c.18-2.263 2-4.5 4-5\"/>",
    "rocket": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m6.219 11.618l-2.907-.38c-.596-.077-.993-.654-.729-1.192C3.425 8.334 5.62 6.354 9.74 6.68m-3.521 4.937c1.055-1.764 2.353-3.614 3.52-4.937m-3.52 4.937l5.663 5.663M9.74 6.681c3.67-4.091 7.434-4.953 9.854-4.614a2.156 2.156 0 0 1 1.84 1.84c.338 2.419-.524 6.182-4.615 9.853m-4.937 3.521l.38 2.907c.077.596.654.993 1.192.729c1.712-.842 3.692-3.036 3.365-7.157m-4.937 3.521c1.764-1.055 3.614-2.353 4.937-3.52\"/><path d=\"M17.5 8a2 2 0 1 0-4 0a2 2 0 0 0 4 0M4 22l4-4m-4-1l1.5-1.5\"/></g>",
    "pause": "<path fill=\"none\" stroke=\"currentColor\" d=\"M4 7c0-1.414 0-2.121.44-2.56C4.878 4 5.585 4 7 4s2.121 0 2.56.44C10 4.878 10 5.585 10 7v10c0 1.414 0 2.121-.44 2.56C9.122 20 8.415 20 7 20s-2.121 0-2.56-.44C4 19.122 4 18.415 4 17zm10 0c0-1.414 0-2.121.44-2.56C14.878 4 15.585 4 17 4s2.121 0 2.56.44C20 4.878 20 5.585 20 7v10c0 1.414 0 2.121-.44 2.56c-.439.44-1.146.44-2.56.44s-2.121 0-2.56-.44C14 19.122 14 18.415 14 17z\"/>",
    "alert": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M13.925 21h-3.85c-4.63 0-6.945 0-7.799-1.506c-.853-1.506.331-3.503 2.7-7.495L6.9 8.753C9.176 4.918 10.313 3 12 3s2.824 1.918 5.1 5.753L19.023 12c2.369 3.992 3.553 5.989 2.7 7.495C20.87 21 18.555 21 13.924 21M12 9v4\"/><path d=\"M12.125 16.75H12m.25 0a.25.25 0 1 1-.5 0a.25.25 0 0 1 .5 0\"/></g>",
    "warning": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M13.925 21h-3.85c-4.63 0-6.945 0-7.799-1.506c-.853-1.506.331-3.503 2.7-7.495L6.9 8.753C9.176 4.918 10.313 3 12 3s2.824 1.918 5.1 5.753L19.023 12c2.369 3.992 3.553 5.989 2.7 7.495C20.87 21 18.555 21 13.924 21M12 9v4\"/><path d=\"M12.125 16.75H12m.25 0a.25.25 0 1 1-.5 0a.25.25 0 0 1 .5 0\"/></g>",
    "chat": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"M21 11.002v1.496c0 2.829 0 4.243-.879 5.121c-.878.88-2.293.88-5.121.88h-4l-3.794 3.32a.727.727 0 0 1-1.207-.548v-2.773c-.929 0-1.394 0-1.775-.102a3 3 0 0 1-2.122-2.122C2 15.893 2 15.428 2 14.5V9.002c0-2.828 0-4.243.879-5.121c.878-.879 2.293-.879 5.121-.879h5m6 .125v1.875m0 0v1.875m0-1.875h-1.5m1.5 0h1.5m1.5 0l-1.301-.434a2 2 0 0 1-1.265-1.265L19 2.002l-.434 1.301a2 2 0 0 1-1.265 1.265L16 5.002l1.301.434A2 2 0 0 1 18.566 6.7L19 8.002l.434-1.301a2 2 0 0 1 1.265-1.265z\"/>",
    "calendar": "<g fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M16 2v4M8 2v4m5-2h-2C7.229 4 5.343 4 4.172 5.172S3 8.229 3 12v2c0 3.771 0 5.657 1.172 6.828S7.229 22 11 22h2c3.771 0 5.657 0 6.828-1.172S21 17.771 21 14v-2c0-3.771 0-5.657-1.172-6.828S16.771 4 13 4M3 10h18\"/><path d=\"M12.126 14H12m.125 4H12m-4.376-4H7.5m.125 4H7.5m9.125-4H16.5m-4.25 0a.25.25 0 1 1-.5 0a.25.25 0 0 1 .5 0m0 4a.25.25 0 1 1-.5 0a.25.25 0 0 1 .5 0m-4.5-4a.25.25 0 1 1-.5 0a.25.25 0 0 1 .5 0m0 4a.25.25 0 1 1-.5 0a.25.25 0 0 1 .5 0m9-4a.25.25 0 1 1-.5 0a.25.25 0 0 1 .5 0\"/></g>",
    "search": "<path fill=\"none\" stroke=\"currentColor\" stroke-linecap=\"round\" stroke-linejoin=\"round\" d=\"m17 17l4 4m-2-10a8 8 0 1 0-16 0a8 8 0 0 0 16 0\"/>",
  };
  const OWN = ['inbox', 'docs', 'invoice', 'folder', 'check', 'clock', 'coins', 'card', 'chart-up',
    'cursor', 'eye', 'medal', 'users', 'bell', 'alert', 'warning', 'pause', 'rocket'];
  const resolved = $derived(OWN.includes(kind) || GLYPHS[kind] ? kind : 'tile');
  const W = 120, H = 90;
</script>

<!-- Losa: canto (desplazado abajo-derecha) + cara con degradado + filo de luz. -->
{#snippet slab(x, y, w, h, r, d = 4, face = 'face')}
  <rect x={x + d * 0.45} y={y + d} width={w} height={h} rx={r} fill={g('side')} />
  <rect x={x} y={y} width={w} height={h} rx={r} fill={g(face)} stroke={g('rim')} stroke-width="1" />
  <!-- filo de luz del canto superior, como los objetos de la lámina -->
  <path d="M{x + r} {y + 0.7}H{x + w - r}" stroke="#fff" stroke-opacity=".55" stroke-width="1" stroke-linecap="round" />
{/snippet}

<!-- Forma libre con el mismo acabado: canto desplazado + cara con degradado + filo. -->
{#snippet shape(d, dd = 4, face = 'face')}
  <path {d} transform="translate({dd * 0.45} {dd})" fill={g('side')} />
  <path {d} fill={g(face)} stroke={g('rim')} stroke-width="1" stroke-linejoin="round" />
{/snippet}

<svg class="kpi-art" width={size} height={Math.round(size * H / W)} viewBox="0 0 {W} {H}" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="{uid}-face" x1="0" y1="0" x2=".55" y2="1">
      <stop offset="0" stop-color="#727272" />
      <stop offset=".42" stop-color="#3e3e3e" />
      <stop offset="1" stop-color="#262626" />
    </linearGradient>
    <linearGradient id="{uid}-face2" x1="0" y1="0" x2=".55" y2="1">
      <stop offset="0" stop-color="#525252" />
      <stop offset="1" stop-color="#222" />
    </linearGradient>
    <linearGradient id="{uid}-paper" x1="0" y1="0" x2=".5" y2="1">
      <stop offset="0" stop-color="#8c8c8c" />
      <stop offset=".4" stop-color="#474747" />
      <stop offset="1" stop-color="#2c2c2c" />
    </linearGradient>
    <linearGradient id="{uid}-side" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1c1c1c" />
      <stop offset="1" stop-color="#101010" />
    </linearGradient>
    <linearGradient id="{uid}-rim" x1="0" y1="0" x2=".4" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".6" />
      <stop offset=".45" stop-color="#fff" stop-opacity=".12" />
      <stop offset="1" stop-color="#fff" stop-opacity=".03" />
    </linearGradient>
    <radialGradient id="{uid}-shadow" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#000" stop-opacity=".55" />
      <stop offset="1" stop-color="#000" stop-opacity="0" />
    </radialGradient>
  </defs>

  <!-- sombra de contacto -->
  <ellipse cx="66" cy="80" rx="46" ry="11" fill={g('shadow')} />
  <!-- copia fantasma detrás (la lámina repite el objeto, tenue y desplazado) -->
  <use href="#{uid}-obj" transform="translate(14 -12)" opacity=".13" />
  <g id="{uid}-obj">

  {#if resolved === 'docs'}
    <!-- Dos hojas inclinadas con renglones (referencia: «Active Contracts»). -->
    <g transform="rotate(-18 64 48)">
      <g transform="rotate(10 78 44)">{@render slab(50, 14, 44, 58, 6, 3, 'face2')}</g>
      {@render slab(32, 20, 44, 58, 6, 3, 'paper')}
      <g class="eng">
        <path d="M39 32h14" /><path d="M39 52h28" /><path d="M39 59h26" /><path d="M39 66h20" />
      </g>
    </g>
  {:else if resolved === 'invoice'}
    <g transform="rotate(-14 62 48)">
      <g transform="rotate(9 80 44)">{@render slab(52, 16, 42, 56, 6, 3, 'face2')}</g>
      {@render slab(30, 18, 44, 60, 6, 3, 'paper')}
      <g class="eng">
        <circle cx="42" cy="31" r="5.5" /><path d="M42 28.4v5.2M40.3 29.7h2.6a1 1 0 0 1 0 2h-1.8a1 1 0 0 0 0 2h2.6" />
        <path d="M37 47h30" /><path d="M37 54h30" /><path d="M37 61h18" /><path d="M55 69h12" class="eng--strong" />
      </g>
    </g>
  {:else if resolved === 'inbox'}
    <!-- Sobre con una carta asomando (leads que llegan). -->
    <g transform="rotate(-12 62 50)">
      <g transform="rotate(4 60 30)">{@render slab(38, 8, 44, 44, 5, 2, 'paper')}</g>
      <g class="eng"><path d="M45 18h16" /><path d="M45 25h28" /></g>
      {@render slab(22, 32, 80, 46, 7, 5, 'face')}
      <path d="M23 34l39 24 39-24" fill="none" stroke="#141414" stroke-width="2" stroke-linejoin="round" />
      <path d="M23 35.6l39 24 39-24" fill="none" stroke="#fff" stroke-opacity=".12" stroke-width="1" stroke-linejoin="round" />
    </g>
  {:else if resolved === 'folder'}
    <!-- Carpeta con pestaña (referencia: «Total Contracts»). -->
    <g transform="rotate(-8 62 48)">
      <rect x="24" y="18" width="32" height="14" rx="5" fill={g('face2')} stroke={g('rim')} />
      {@render slab(24, 24, 74, 50, 7, 4, 'face2')}
      {@render slab(22, 36, 78, 42, 7, 4, 'face')}
      <g class="eng"><path d="M80 62h10" /><path d="M76 67h14" /></g>
    </g>
  {:else if resolved === 'check'}
    <!-- Fichas en escalera con visto (referencia: «Pending Signatures»). -->
    <g transform="rotate(-10 62 48)">
      {#each [[20, 48], [50, 30], [80, 12]] as [x, y], i (i)}
        {@render slab(x, y, 28, 28, 7, 5, 'face')}
        <path class="eng eng--glyph" d="M{x + 8.5} {y + 14.5}l4 4 7.5-8.5" />
      {/each}
    </g>
  {:else if resolved === 'clock'}
    <!-- Reloj de mesa: disco con canto, marcas y agujas. -->
    <g transform="rotate(-8 62 46)">
      <circle cx="65" cy="50" r="31" fill={g('side')} />
      <circle cx="62" cy="45" r="31" fill={g('face')} stroke={g('rim')} />
      <circle cx="62" cy="45" r="23" fill="none" stroke="#141414" stroke-width="1.6" />
      <circle cx="62" cy="45.8" r="23" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="1" />
      <g class="eng"><path d="M62 26v4M62 60v4M43 45h4M77 45h4" /><path d="M62 45V33" class="eng--glyph" /><path d="M62 45l8 5" class="eng--glyph" /></g>
      <circle cx="62" cy="45" r="2.2" fill="#d0d0d0" />
    </g>
  {:else if resolved === 'coins'}
    <!-- Billetes apilados con el símbolo grabado (cobrado, valor). -->
    <g transform="rotate(-14 62 48)">
      <g transform="rotate(9 70 40)">{@render slab(32, 14, 76, 44, 6, 3, 'face2')}</g>
      {@render slab(20, 28, 78, 46, 6, 4, 'paper')}
      <g class="eng">
        <circle cx="59" cy="51" r="10" />
        <path d="M59 44.5v13M62.4 47.2h-4.6a2.2 2.2 0 0 0 0 4.4h2.4a2.2 2.2 0 0 1 0 4.4h-4.8" class="eng--glyph" />
        <path d="M27 36h9M82 66h9" />
      </g>
    </g>
  {:else if resolved === 'card'}
    <!-- Tarjeta de pago inclinada: chip y número grabados. -->
    <g transform="rotate(-16 62 48)">
      <g transform="rotate(8 70 44)">{@render slab(28, 16, 80, 50, 7, 3, 'face2')}</g>
      {@render slab(18, 28, 80, 50, 7, 4, 'face')}
      <rect x="28" y="40" width="14" height="11" rx="2.5" fill="#5c5c5c" stroke="#fff" stroke-opacity=".18" />
      <g class="eng"><path d="M28 64h14M47 64h14M66 64h14" /><path d="M82 40c2 2 2 6 0 8M86 38c3 3 3 9 0 12" /></g>
    </g>
  {:else if resolved === 'chart-up'}
    <!-- Columnas que suben. -->
    <g transform="rotate(-6 62 48)">
      {@render slab(22, 50, 20, 28, 5, 5, 'face2')}
      {@render slab(48, 34, 20, 44, 5, 5, 'face')}
      {@render slab(74, 16, 20, 62, 5, 5, 'face')}
      <path class="eng eng--glyph" d="M28 40l18-12 12 6 24-18M76 16h6v6" />
    </g>
  {:else if resolved === 'cursor'}
    <!-- Puntero que hace clic (clics). -->
    <g transform="rotate(-8 60 46)">
      {@render shape('M40 10 L40 66 Q40 70 43.5 67.5 L54 57 L62.5 75.5 Q64 78 66.5 77 L72 74.5 Q74.5 73.3 73.3 70.8 L64.8 52.6 L79 52.4 Q83 52.2 80 49.4 L44 8.6 Q40 5.8 40 10 Z', 5)}
      <g class="eng"><path d="M28 18l-7-5M25 30h-8M33 8l-3-7" /></g>
    </g>
  {:else if resolved === 'eye'}
    <!-- Página de resultados de búsqueda (impresiones: salir en Google). -->
    <g transform="rotate(-10 62 46)">
      {@render slab(16, 12, 92, 64, 8, 5, 'face')}
      <g class="eng">
        <rect x="26" y="22" width="62" height="11" rx="5.5" />
        <circle cx="80" cy="27.5" r="2.6" />
        <path d="M26 45h46" class="eng--glyph" />
        <path d="M26 53h34M26 63h44" />
      </g>
    </g>
  {:else if resolved === 'medal'}
    <!-- Podio con el 1 grabado (posición media en Google). -->
    <g transform="rotate(-6 62 48)">
      {@render slab(16, 42, 30, 36, 6, 4, 'face2')}
      {@render slab(76, 52, 30, 26, 6, 4, 'face2')}
      {@render slab(44, 22, 34, 56, 6, 5, 'face')}
      <g class="eng"><path d="M57 36l5-4v18" class="eng--glyph" /><path d="M24 52h14M84 62h14" /></g>
    </g>
  {:else if resolved === 'users'}
    <!-- Dos personas (sesiones, clientes). -->
    <g transform="rotate(-6 62 46)">
      {@render shape('M60 76 V62 Q60 46 78 46 H82 Q100 46 100 62 V76 Z', 4, 'face2')}
      <circle cx="82.5" cy="31" r="11" transform="translate(1.8 4)" fill={g('side')} />
      <circle cx="82.5" cy="31" r="11" fill={g('face2')} stroke={g('rim')} />
      {@render shape('M22 78 V64 Q22 46 42 46 H50 Q70 46 70 64 V78 Z', 5)}
      <circle cx="46" cy="30" r="13" transform="translate(2.2 5)" fill={g('side')} />
      <circle cx="46" cy="30" r="13" fill={g('face')} stroke={g('rim')} />
    </g>
  {:else if resolved === 'bell'}
    <!-- Campana (por atender, sin leer). -->
    <g transform="rotate(-10 62 46)">
      {@render shape('M62 10 C46 10 38 22 38 38 V52 L30 62 Q28 66 33 66 H91 Q96 66 94 62 L86 52 V38 C86 22 78 10 62 10 Z', 5)}
      <circle cx="62" cy="72" r="6" transform="translate(2 4)" fill={g('side')} />
      <circle cx="62" cy="72" r="6" fill={g('face2')} stroke={g('rim')} />
      <g class="eng"><path d="M48 30c2-6 6-9 12-10" /><path d="M40 58h44" /></g>
    </g>
  {:else if resolved === 'alert' || resolved === 'warning'}
    <!-- Señal de aviso con el signo grabado (vencido). -->
    <g transform="rotate(-6 62 46)">
      {@render shape('M57 14 Q62 6 67 14 L102 70 Q106 78 97 78 H27 Q18 78 22 70 Z', 5)}
      <g class="eng"><path d="M62 34v20" class="eng--glyph" /><path d="M62 64v.5" class="eng--glyph" /></g>
    </g>
  {:else if resolved === 'pause'}
    <!-- Dos barras de pausa (en pausa). -->
    <g transform="rotate(-8 62 46)">
      {@render slab(34, 14, 22, 62, 7, 5, 'face')}
      {@render slab(66, 14, 22, 62, 7, 5, 'face')}
    </g>
  {:else if resolved === 'rocket'}
    <!-- Cohete (proyectos en marcha). -->
    <g transform="rotate(28 62 46)">
      {@render shape('M48 50 L34 66 Q32 70 36 69 L50 64 Z', 3, 'face2')}
      {@render shape('M76 50 L90 66 Q92 70 88 69 L74 64 Z', 3, 'face2')}
      {@render shape('M62 6 C78 18 82 38 77 64 H47 C42 38 46 18 62 6 Z', 5)}
      <circle cx="62" cy="34" r="8" fill="#2a2a2a" stroke="#fafafa" stroke-opacity=".9" stroke-width="1.8" />
      <g class="eng"><path d="M55 72v8M62 72v12M69 72v8" /></g>
    </g>
  {:else}
    <!-- Ficha con el dibujo del panel grabado (y otra detrás, como la referencia). -->
    <g transform="rotate(-10 62 46)">
      {@render slab(64, 12, 34, 34, 9, 5, 'face2')}
      {@render slab(30, 24, 50, 50, 11, 6, 'face')}
      {#if GLYPHS[resolved]}
        <g class="glyph" transform="translate(41 35) scale(1.17)" stroke-width="1.6">{@html GLYPHS[resolved]}</g>
      {/if}
    </g>
  {/if}
  </g>
</svg>

<style>
  .kpi-art { display: block; flex: 0 0 auto; overflow: visible; }
  /* Grabados en blanco nítido, como las líneas de los objetos de la lámina. */
  .eng { fill: none; stroke: #f2f2f2; stroke-opacity: .85; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
  .eng--glyph { stroke: #fafafa; stroke-opacity: .96; stroke-width: 2.2; }
  .eng--strong { stroke-opacity: 1; }
  .glyph { color: #f4f4f4; }
</style>
