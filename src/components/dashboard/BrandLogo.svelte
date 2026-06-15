<script>
  /* ════════════════════════════════════════════════════════════════
     BrandLogo — logo de marca para una suscripción/SaaS de la agencia.
     Tiny + reusable. Svelte 5 runes.

     · Mapa keyword → slug de simpleicons (case-insensitive, por
       coincidencia de substring). Renderiza un <img> de los SVGs en
       color de marca de https://cdn.simpleicons.org/<slug>.
     · Fallback (marca desconocida O error de carga del img):
       MONOGRAMA — tile cuadrado redondeado con color de fondo
       determinista (hash del nombre) y la inicial en blanco.

     Uso:
       <BrandLogo name="Vercel Pro" />
       <BrandLogo name="Figma" size={18} />
     ════════════════════════════════════════════════════════════════ */

  let { name = '', size = 22 } = $props();

  // keyword (en minúsculas) → slug de simpleicons. La clave se busca como
  // SUBSTRING dentro del nombre normalizado, así "Vercel Pro" → vercel,
  // "Google Workspace" → google, "Adobe Creative Cloud" → adobe, etc.
  // Ordenado de más específico a más genérico para que p.ej. "amazon web
  // services" gane sobre "amazon".
  const MAP = [
    ['amazon web services', 'amazonaws'],
    ['google workspace', 'google'],
    ['google cloud', 'googlecloud'],
    ['vercel', 'vercel'],
    ['figma', 'figma'],
    ['namecheap', 'namecheap'],
    ['github', 'github'],
    ['notion', 'notion'],
    ['slack', 'slack'],
    ['adobe', 'adobe'],
    ['stripe', 'stripe'],
    ['anthropic', 'anthropic'],
    ['openai', 'openai'],
    ['cloudflare', 'cloudflare'],
    ['canva', 'canva'],
    ['linear', 'linear'],
    ['framer', 'framer'],
    ['mailchimp', 'mailchimp'],
    ['zoom', 'zoom'],
    ['microsoft', 'microsoft'],
    ['amazonaws', 'amazonaws'],
    ['dropbox', 'dropbox'],
    ['atlassian', 'atlassian'],
    ['hubspot', 'hubspot'],
    ['meta', 'meta'],
    ['google', 'google'],
  ];

  function slugFor(n) {
    const k = (n || '').toLowerCase();
    for (const [kw, slug] of MAP) {
      if (k.includes(kw)) return slug;
    }
    return null;
  }

  // ~8 colores sobrios para el monograma (legibles con texto blanco).
  const PALETTE = [
    '#6366f1', '#0ea5e9', '#14b8a6', '#f97316',
    '#ec4899', '#8b5cf6', '#10b981', '#f59e0b',
  ];
  function hashColor(n) {
    let h = 0;
    const s = n || '?';
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return PALETTE[Math.abs(h) % PALETTE.length];
  }

  const slug = $derived(slugFor(name));
  const letter = $derived((name || '?').trim().charAt(0).toUpperCase() || '?');
  const color = $derived(hashColor(name));

  // Si el img falla (slug inexistente en simpleicons, red, etc.) caemos al
  // monograma marcando este estado.
  let failed = $state(false);
  // Reinicia el estado de error si cambia el nombre/slug.
  $effect(() => { name; slug; failed = false; });

  const px = $derived(size + 'px');
</script>

{#if slug && !failed}
  <img
    class="brandlogo"
    src={`https://cdn.simpleicons.org/${slug}`}
    alt={name}
    width={size}
    height={size}
    style={`width:${px};height:${px}`}
    loading="lazy"
    onerror={() => (failed = true)}
  />
{:else}
  <span
    class="brandlogo brandlogo--mono"
    aria-label={name}
    title={name}
    style={`width:${px};height:${px};background:${color};font-size:${Math.round(size * 0.5)}px`}
  >{letter}</span>
{/if}

<style>
  .brandlogo {
    display: inline-block;
    flex-shrink: 0;
    object-fit: contain;
    border-radius: var(--radius-sm);
    /* SVGs de simpleicons: nítidos a cualquier tamaño */
    image-rendering: auto;
  }
  .brandlogo--mono {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    color: #fff;
    font-family: var(--font-display);
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.01em;
    user-select: none;
  }
</style>
