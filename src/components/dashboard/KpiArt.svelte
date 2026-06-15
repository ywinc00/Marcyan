<script>
  /* ════════════════════════════════════════════════════════════════
     KpiArt — ilustración premium COMPARTIDA para las KPI de cada
     sección del dashboard. Objetos pequeños, glossy, con AIRE 3D
     (emulamos profundidad con SVG porque no tenemos assets 3D, à la
     referencia Orbit: cuerpos redondeados, gradiente vertical, brillo
     especular arriba, sombra suave debajo y una faceta acento que
     "salta" con glow). Svelte 5 runes.

     ── API ──────────────────────────────────────────────────────────
       <KpiArt kind="inbox" />
       <KpiArt kind="chart-up" size={64} />

       · kind  (string)  — qué objeto renderizar (ver lista abajo).
                           Un kind desconocido cae a un cubo neutro.
       · size  (number)  — lado del SVG en px (default 56).

     ── kinds disponibles ────────────────────────────────────────────
       inbox · docs · clock · coins · invoice · alert · card ·
       chart-up · rocket · pause · check · cursor · eye · medal ·
       users · bell · folder · warning
       (cualquier otro → cubo neutro redondeado)

       Acento POSITIVO (verde --accent-teal) en: check, chart-up, coins.
       El resto usa el acento de marca (naranja --accent-gold).

     ── técnica visual (consistente en TODO el set) ──────────────────
       · dirección de luz: arriba-izquierda → faceta superior clara,
         base oscura (#2e2e36 → #17171c).
       · brillo especular blanco ~10-18% arriba + rim interior suave.
       · sombra de contacto: elipse oscura desenfocada y desplazada.
       · radio de esquina y lighting iguales para que el set sea unísono.
     ════════════════════════════════════════════════════════════════ */

  let { kind = '', size = 56 } = $props();

  // id único por instancia → evita colisiones de <defs> cuando hay
  // varias KpiArt en la misma página (gradientes/filtros con mismo id
  // se pisarían). Sufijo corto y estable durante la vida del componente.
  const uid = 'ka' + Math.random().toString(36).slice(2, 9);

  // kinds cuyo acento es "positivo" → verde teal en vez de naranja.
  const POSITIVE = new Set(['check', 'chart-up', 'coins']);

  const KNOWN = new Set([
    'inbox', 'docs', 'clock', 'coins', 'invoice', 'alert', 'card',
    'chart-up', 'rocket', 'pause', 'check', 'cursor', 'eye', 'medal',
    'users', 'bell', 'folder', 'warning',
  ]);

  const resolved = $derived(KNOWN.has(kind) ? kind : 'cube');
  const isPositive = $derived(POSITIVE.has(resolved));

  // El acento se inyecta vía CSS custom props sobre el wrapper, de modo
  // que el SVG referencie var(--ka-accent) y derivados. Así un kind
  // positivo vira a teal sin duplicar markup.
  const accentVar = $derived(isPositive ? 'var(--accent-teal)' : 'var(--accent-gold)');
  // Glow del feDropShadow: necesitamos un literal para flood-color. Los
  // tokens resuelven a #34d399 (teal) y #f97316 (gold) en dashboard.css.
  const glow = $derived(isPositive ? '#34d399' : '#f97316');

  const px = $derived(size + 'px');
</script>

<span
  class="kpi-art"
  aria-hidden="true"
  style={`--ka-accent:${accentVar};width:${px};height:${px}`}
>
  <svg viewBox="0 0 64 64" width={size} height={size} fill="none" role="presentation">
    <defs>
      <!-- Cuerpo: gradiente vertical (claro arriba → oscuro abajo) -->
      <linearGradient id={`${uid}-body`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#3a3a44" />
        <stop offset="0.45" stop-color="#2e2e36" />
        <stop offset="1" stop-color="#17171c" />
      </linearGradient>
      <!-- Cuerpo oscuro secundario (capas traseras / contraste) -->
      <linearGradient id={`${uid}-body2`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#2b2b33" />
        <stop offset="1" stop-color="#131318" />
      </linearGradient>
      <!-- Faceta acento: gradiente vivo para que "salte" -->
      <linearGradient id={`${uid}-accent`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="var(--ka-accent)" stop-opacity="1" />
        <stop offset="1" stop-color="var(--ka-accent)" stop-opacity="0.78" />
      </linearGradient>
      <!-- Brillo especular superior (blanco que se desvanece) -->
      <linearGradient id={`${uid}-spec`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity="0.22" />
        <stop offset="0.6" stop-color="#ffffff" stop-opacity="0.04" />
        <stop offset="1" stop-color="#ffffff" stop-opacity="0" />
      </linearGradient>
      <!-- Sombra de contacto bajo el objeto -->
      <filter id={`${uid}-shadow`} x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="2.4" result="b" />
        <feOffset in="b" dy="2.2" result="o" />
        <feComponentTransfer in="o" result="s">
          <feFuncA type="linear" slope="0.55" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode in="s" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <!-- Glow del acento (color según positivo/negativo) -->
      <filter id={`${uid}-glow`} x="-60%" y="-60%" width="220%" height="220%">
        <feDropShadow dx="0" dy="0" stdDeviation="2.6" flood-color={glow} flood-opacity="0.55" />
      </filter>
    </defs>

    <!-- Sombra de contacto compartida: elipse desenfocada bajo el objeto -->
    <ellipse cx="32" cy="55" rx="17" ry="3.4" fill="#000" opacity="0.4"
      filter={`url(#${uid}-shadow)`} />

    {#if resolved === 'inbox'}
      <!-- Bandeja de entrada: cuerpo glossy + boca y carta acento -->
      <g filter={`url(#${uid}-shadow)`}>
        <rect x="12" y="20" width="40" height="30" rx="7" fill={`url(#${uid}-body)`} stroke="#4a4a55" />
        <rect x="12.8" y="20.8" width="38.4" height="13" rx="6" fill={`url(#${uid}-spec)`} />
        <!-- ranura/boca -->
        <path d="M12 38h12l3 5h10l3-5h12v5a7 7 0 0 1-7 7H19a7 7 0 0 1-7-7z"
          fill={`url(#${uid}-body2)`} stroke="#3a3a44" />
      </g>
      <!-- carta acento asomando -->
      <g filter={`url(#${uid}-glow)`}>
        <rect x="22" y="13" width="20" height="16" rx="3" fill={`url(#${uid}-accent)`} stroke="var(--ka-accent)" />
        <path d="M26 19h12M26 23h8" stroke="#17171c" stroke-width="1.6" stroke-linecap="round" opacity="0.55" />
      </g>

    {:else if resolved === 'docs'}
      <!-- Pila de documentos: capa trasera oscura + frontal con borde acento -->
      <g filter={`url(#${uid}-shadow)`}>
        <rect x="20" y="10" width="28" height="38" rx="5" fill={`url(#${uid}-body2)`} stroke="#3a3a44" />
        <rect x="14" y="16" width="30" height="40" rx="5" fill={`url(#${uid}-body)`} stroke="#4a4a55" />
        <rect x="14.8" y="16.8" width="28.4" height="16" rx="4" fill={`url(#${uid}-spec)`} />
        <path d="M20 26h18M20 31h18M20 36h12" stroke="#7a7a85" stroke-width="1.8" stroke-linecap="round" />
      </g>
      <!-- pestaña/clip acento -->
      <rect x="33" y="13" width="6" height="14" rx="3" fill={`url(#${uid}-accent)`} filter={`url(#${uid}-glow)`} />

    {:else if resolved === 'clock'}
      <!-- Reloj glossy + manecillas acento -->
      <g filter={`url(#${uid}-shadow)`}>
        <circle cx="32" cy="32" r="20" fill={`url(#${uid}-body)`} stroke="#4a4a55" />
        <circle cx="32" cy="32" r="20" fill={`url(#${uid}-spec)`} />
        <circle cx="32" cy="32" r="15" fill="#1c1c22" stroke="#3a3a44" />
      </g>
      <g filter={`url(#${uid}-glow)`} stroke="var(--ka-accent)" stroke-width="2.6" stroke-linecap="round">
        <path d="M32 32V21" />
        <path d="M32 32l8 5" />
      </g>
      <circle cx="32" cy="32" r="2.4" fill="var(--ka-accent)" />

    {:else if resolved === 'coins'}
      <!-- Pila de monedas: discos apilados, cara superior acento (verde) -->
      <g filter={`url(#${uid}-shadow)`}>
        <ellipse cx="32" cy="46" rx="18" ry="7" fill={`url(#${uid}-body2)`} stroke="#3a3a44" />
        <ellipse cx="32" cy="46" rx="18" ry="7" fill="#000" opacity="0" />
        <rect x="14" y="33" width="36" height="13" fill={`url(#${uid}-body)`} />
        <ellipse cx="32" cy="39" rx="18" ry="7" fill={`url(#${uid}-body)`} stroke="#3a3a44" />
      </g>
      <g filter={`url(#${uid}-glow)`}>
        <ellipse cx="32" cy="30" rx="18" ry="7" fill={`url(#${uid}-accent)`} stroke="var(--ka-accent)" />
        <path d="M32 26v8M29 28.5h4.5a1.6 1.6 0 0 1 0 3.2H30" stroke="#17171c"
          stroke-width="1.6" stroke-linecap="round" opacity="0.6" fill="none" />
      </g>

    {:else if resolved === 'invoice'}
      <!-- Factura: hoja glossy con borde inferior dentado + línea total acento -->
      <g filter={`url(#${uid}-shadow)`}>
        <path d="M16 12h32v36l-4-3-4 3-4-3-4 3-4-3-4 3-4-3-4 3z"
          fill={`url(#${uid}-body)`} stroke="#4a4a55" />
        <path d="M16.8 12.8h30.4v15H16.8z" fill={`url(#${uid}-spec)`} />
        <path d="M22 22h20M22 28h20M22 34h12" stroke="#7a7a85" stroke-width="1.8" stroke-linecap="round" />
      </g>
      <!-- total acento -->
      <g filter={`url(#${uid}-glow)`}>
        <rect x="34" y="32" width="10" height="6" rx="2" fill={`url(#${uid}-accent)`} />
      </g>

    {:else if resolved === 'alert'}
      <!-- Alerta: cuerpo + signo de exclamación acento que brilla -->
      <g filter={`url(#${uid}-shadow)`}>
        <rect x="14" y="14" width="36" height="36" rx="10" fill={`url(#${uid}-body)`} stroke="#4a4a55" />
        <rect x="14.8" y="14.8" width="34.4" height="16" rx="9" fill={`url(#${uid}-spec)`} />
      </g>
      <g filter={`url(#${uid}-glow)`}>
        <rect x="29.4" y="22" width="5.2" height="14" rx="2.6" fill="var(--ka-accent)" />
        <circle cx="32" cy="42" r="3" fill="var(--ka-accent)" />
      </g>

    {:else if resolved === 'card'}
      <!-- Tarjeta de pago: cuerpo glossy + banda magnética + chip acento -->
      <g filter={`url(#${uid}-shadow)`}>
        <rect x="10" y="18" width="44" height="30" rx="6" fill={`url(#${uid}-body)`} stroke="#4a4a55" />
        <rect x="10.8" y="18.8" width="42.4" height="12" rx="5" fill={`url(#${uid}-spec)`} />
        <rect x="10" y="26" width="44" height="6" fill="#131318" />
        <path d="M18 41h12" stroke="#7a7a85" stroke-width="2.4" stroke-linecap="round" />
      </g>
      <!-- chip acento -->
      <rect x="16" y="35" width="10" height="8" rx="2" fill={`url(#${uid}-accent)`}
        stroke="var(--ka-accent)" filter={`url(#${uid}-glow)`} />

    {:else if resolved === 'chart-up'}
      <!-- Barras crecientes + flecha acento (verde, positivo) -->
      <g filter={`url(#${uid}-shadow)`}>
        <rect x="13" y="38" width="9" height="12" rx="2.5" fill={`url(#${uid}-body)`} stroke="#4a4a55" />
        <rect x="27" y="30" width="9" height="20" rx="2.5" fill={`url(#${uid}-body)`} stroke="#4a4a55" />
        <rect x="41" y="22" width="9" height="28" rx="2.5" fill={`url(#${uid}-body)`} stroke="#4a4a55" />
      </g>
      <g filter={`url(#${uid}-glow)`} stroke="var(--ka-accent)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path d="M15 34l13-9 9 5 12-13" />
        <path d="M44 14h7v7" />
      </g>

    {:else if resolved === 'rocket'}
      <!-- Cohete glossy + ventana y llama acento -->
      <g filter={`url(#${uid}-shadow)`}>
        <path d="M32 8c8 6 11 16 11 26l-5 6H26l-5-6c0-10 3-20 11-26z"
          fill={`url(#${uid}-body)`} stroke="#4a4a55" />
        <path d="M27 12c2-2 8-2 10 0-1 6-1 14-1 22h-8c0-8 0-16-1-22z" fill={`url(#${uid}-spec)`} />
        <path d="M21 32l-7 6 2 8 7-6M43 32l7 6-2 8-7-6" fill={`url(#${uid}-body2)`} stroke="#3a3a44" />
      </g>
      <circle cx="32" cy="26" r="4.5" fill={`url(#${uid}-accent)`} stroke="var(--ka-accent)" filter={`url(#${uid}-glow)`} />
      <!-- llama acento -->
      <path d="M28 46c1 5 3 8 4 10 1-2 3-5 4-10z" fill="var(--ka-accent)" filter={`url(#${uid}-glow)`} />

    {:else if resolved === 'pause'}
      <!-- Pausa: cuerpo redondo + dos barras acento -->
      <g filter={`url(#${uid}-shadow)`}>
        <circle cx="32" cy="32" r="20" fill={`url(#${uid}-body)`} stroke="#4a4a55" />
        <circle cx="32" cy="32" r="20" fill={`url(#${uid}-spec)`} />
      </g>
      <g filter={`url(#${uid}-glow)`}>
        <rect x="24" y="23" width="6" height="18" rx="3" fill={`url(#${uid}-accent)`} />
        <rect x="34" y="23" width="6" height="18" rx="3" fill={`url(#${uid}-accent)`} />
      </g>

    {:else if resolved === 'check'}
      <!-- Check: cuerpo redondo + tilde acento (verde, positivo) -->
      <g filter={`url(#${uid}-shadow)`}>
        <circle cx="32" cy="32" r="20" fill={`url(#${uid}-body)`} stroke="#4a4a55" />
        <circle cx="32" cy="32" r="20" fill={`url(#${uid}-spec)`} />
      </g>
      <path d="M23 33l6 7 13-15" stroke="var(--ka-accent)" stroke-width="4"
        stroke-linecap="round" stroke-linejoin="round" fill="none" filter={`url(#${uid}-glow)`} />

    {:else if resolved === 'cursor'}
      <!-- Cursor/puntero glossy + clic acento -->
      <g filter={`url(#${uid}-shadow)`}>
        <path d="M22 16l24 11-11 3-2 12-11-26z"
          fill={`url(#${uid}-body)`} stroke="#4a4a55" stroke-linejoin="round" />
        <path d="M24 19l14 6.5-6 1.6z" fill={`url(#${uid}-spec)`} />
      </g>
      <!-- destello de clic acento -->
      <g filter={`url(#${uid}-glow)`} stroke="var(--ka-accent)" stroke-width="2.4" stroke-linecap="round">
        <path d="M40 40l5 5M46 36h6M44 50v6" />
      </g>

    {:else if resolved === 'eye'}
      <!-- Ojo / impresiones: cuerpo lente + iris acento -->
      <g filter={`url(#${uid}-shadow)`}>
        <path d="M10 32c7-11 15-16 22-16s15 5 22 16c-7 11-15 16-22 16s-15-5-22-16z"
          fill={`url(#${uid}-body)`} stroke="#4a4a55" />
        <path d="M14 30c6-8 12-11 18-11s12 3 18 11c-1 1-2 3-3 4-5-7-10-10-15-10s-10 3-15 10c-1-1-2-3-3-4z"
          fill={`url(#${uid}-spec)`} />
      </g>
      <circle cx="32" cy="32" r="8.5" fill="#131318" stroke="#3a3a44" />
      <circle cx="32" cy="32" r="5" fill={`url(#${uid}-accent)`} stroke="var(--ka-accent)" filter={`url(#${uid}-glow)`} />
      <circle cx="29.5" cy="29.5" r="1.6" fill="#fff" opacity="0.85" />

    {:else if resolved === 'medal'}
      <!-- Medalla: cintas + disco glossy con estrella acento -->
      <g filter={`url(#${uid}-shadow)`}>
        <path d="M24 12l5 18h-7l-5-16z" fill={`url(#${uid}-body2)`} stroke="#3a3a44" />
        <path d="M40 12l-5 18h7l5-16z" fill={`url(#${uid}-body2)`} stroke="#3a3a44" />
        <circle cx="32" cy="40" r="15" fill={`url(#${uid}-body)`} stroke="#4a4a55" />
        <circle cx="32" cy="40" r="15" fill={`url(#${uid}-spec)`} />
      </g>
      <path d="M32 32l2.4 5 5.4.5-4 3.6 1.2 5.3L32 49l-4.9 2.4 1.2-5.3-4-3.6 5.4-.5z"
        fill={`url(#${uid}-accent)`} stroke="var(--ka-accent)" stroke-linejoin="round" filter={`url(#${uid}-glow)`} />

    {:else if resolved === 'users'}
      <!-- Usuarios: dos figuras, la frontal con acento -->
      <g filter={`url(#${uid}-shadow)`}>
        <circle cx="42" cy="24" r="8" fill={`url(#${uid}-body2)`} stroke="#3a3a44" />
        <path d="M30 50c0-8 6-13 12-13s12 5 12 13z" fill={`url(#${uid}-body2)`} stroke="#3a3a44" />
        <circle cx="25" cy="23" r="9" fill={`url(#${uid}-body)`} stroke="#4a4a55" />
        <circle cx="25" cy="23" r="9" fill={`url(#${uid}-spec)`} />
        <path d="M10 51c0-9 7-15 15-15s15 6 15 15z" fill={`url(#${uid}-body)`} stroke="#4a4a55" />
        <path d="M11 49c1-7 7-11 14-11s13 4 14 11z" fill={`url(#${uid}-spec)`} />
      </g>
      <!-- destaque acento en la figura frontal -->
      <path d="M16 50c1-5 5-8 9-8s8 3 9 8z" fill={`url(#${uid}-accent)`} opacity="0.92" filter={`url(#${uid}-glow)`} />

    {:else if resolved === 'bell'}
      <!-- Campana glossy + badge acento -->
      <g filter={`url(#${uid}-shadow)`}>
        <path d="M32 12c-8 0-13 6-13 14 0 9-3 12-5 15h36c-2-3-5-6-5-15 0-8-5-14-13-14z"
          fill={`url(#${uid}-body)`} stroke="#4a4a55" />
        <path d="M24 17c2-2 5-3 8-3s6 1 8 3c-2 2-3 6-3 10h-10c0-4-1-8-3-10z" fill={`url(#${uid}-spec)`} />
        <path d="M27 47a5 5 0 0 0 10 0z" fill={`url(#${uid}-body2)`} stroke="#3a3a44" />
      </g>
      <circle cx="44" cy="18" r="6" fill={`url(#${uid}-accent)`} stroke="var(--ka-accent)" filter={`url(#${uid}-glow)`} />

    {:else if resolved === 'folder'}
      <!-- Carpeta glossy + pestaña acento -->
      <g filter={`url(#${uid}-shadow)`}>
        <path d="M12 22a5 5 0 0 1 5-5h9l5 5h16a5 5 0 0 1 5 5v18a5 5 0 0 1-5 5H17a5 5 0 0 1-5-5z"
          fill={`url(#${uid}-body2)`} stroke="#3a3a44" />
        <path d="M12 30a5 5 0 0 1 5-5h30a5 5 0 0 1 5 5v15a5 5 0 0 1-5 5H17a5 5 0 0 1-5-5z"
          fill={`url(#${uid}-body)`} stroke="#4a4a55" />
        <path d="M12.8 30.8h38.4v9H12.8z" fill={`url(#${uid}-spec)`} />
      </g>
      <!-- pestaña acento -->
      <rect x="22" y="17" width="14" height="6" rx="3" fill={`url(#${uid}-accent)`} filter={`url(#${uid}-glow)`} />

    {:else if resolved === 'warning'}
      <!-- Triángulo de advertencia glossy + signo acento -->
      <g filter={`url(#${uid}-shadow)`}>
        <path d="M32 12l22 38a4 4 0 0 1-3.5 6h-37A4 4 0 0 1 10 50z"
          fill={`url(#${uid}-body)`} stroke="#4a4a55" stroke-linejoin="round" />
        <path d="M32 18l8 14h-16z" fill={`url(#${uid}-spec)`} />
      </g>
      <g filter={`url(#${uid}-glow)`}>
        <rect x="29.4" y="30" width="5.2" height="13" rx="2.6" fill="var(--ka-accent)" />
        <circle cx="32" cy="49" r="2.8" fill="var(--ka-accent)" />
      </g>

    {:else}
      <!-- cube (fallback neutro): cubo redondeado isométrico con cara
           superior con leve acento, para kinds desconocidos -->
      <g filter={`url(#${uid}-shadow)`}>
        <path d="M32 14l16 9v18l-16 9-16-9V23z" fill={`url(#${uid}-body)`} stroke="#4a4a55" stroke-linejoin="round" />
        <path d="M32 14l16 9-16 9-16-9z" fill={`url(#${uid}-accent)`} stroke="var(--ka-accent)" stroke-linejoin="round" opacity="0.9" />
        <path d="M32 32v18l16-9V23z" fill="#131318" opacity="0.55" />
        <path d="M32 32v18l-16-9V23z" fill={`url(#${uid}-spec)`} />
      </g>
    {/if}
  </svg>
</span>

<style>
  .kpi-art {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    line-height: 0;
  }
  .kpi-art svg {
    display: block;
    overflow: visible; /* deja respirar sombras y glows fuera del viewBox */
  }
</style>
