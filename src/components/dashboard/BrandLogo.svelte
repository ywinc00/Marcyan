<script>
  /* ════════════════════════════════════════════════════════════════
     BrandLogo — logo de marca para una suscripción/SaaS de la agencia.
     SIN API key. Tiny + reusable. Svelte 5 runes.

     CADENA DE FALLBACK (graceful degradation):
       1) favicon    → logo REAL de la empresa vía el servicio de favicons
                       de Google (SIN key):
                       https://www.google.com/s2/favicons?domain=<dominio>&sz=128
                       Se usa si conocemos el dominio de la marca.
       2) simpleicons → SVG de marca (https://cdn.simpleicons.org/<slug>).
                       Se usa si no hay dominio, o si el favicon falla.
       3) monograma  → tile cuadrado con color determinista (hash del
                       nombre) y la inicial en blanco. Último recurso.

     Las imágenes (favicon/simpleicons) van sobre un chip claro para que
     los logos oscuros (Vercel, GitHub…) se vean sobre el fondo dark.
     El paso se controla con un $state `stage` + onerror; se reinicia al
     cambiar `name`.

     Uso:  <BrandLogo name="Vercel Pro" />   <BrandLogo name="Figma" size={18} />
     ════════════════════════════════════════════════════════════════ */

  let { name = '', size = 22 } = $props();

  // keyword (minúsculas) → { domain, slug }. Se busca como SUBSTRING dentro
  // del nombre normalizado: "Vercel Pro"→vercel, "Google Workspace"→google,
  // "Adobe Creative Cloud"→adobe. Más específico primero (p.ej. "google
  // cloud" gana sobre "google").
  //   domain → favicon real (Google s2)   ·   slug → simpleicons
  const MAP = [
    ['amazon web services', { domain: 'aws.amazon.com', slug: 'amazonaws' }],
    ['google cloud', { domain: 'cloud.google.com', slug: 'googlecloud' }],
    ['google workspace', { domain: 'workspace.google.com', slug: 'google' }],
    ['vercel', { domain: 'vercel.com', slug: 'vercel' }],
    ['figma', { domain: 'figma.com', slug: 'figma' }],
    ['namecheap', { domain: 'namecheap.com', slug: 'namecheap' }],
    ['anthropic', { domain: 'anthropic.com', slug: 'anthropic' }],
    ['claude', { domain: 'anthropic.com', slug: 'anthropic' }],
    ['adobe', { domain: 'adobe.com', slug: 'adobe' }],
    ['github', { domain: 'github.com', slug: 'github' }],
    ['notion', { domain: 'notion.so', slug: 'notion' }],
    ['slack', { domain: 'slack.com', slug: 'slack' }],
    ['stripe', { domain: 'stripe.com', slug: 'stripe' }],
    ['openai', { domain: 'openai.com', slug: 'openai' }],
    ['cloudflare', { domain: 'cloudflare.com', slug: 'cloudflare' }],
    ['canva', { domain: 'canva.com', slug: 'canva' }],
    ['linear', { domain: 'linear.app', slug: 'linear' }],
    ['framer', { domain: 'framer.com', slug: 'framer' }],
    ['mailchimp', { domain: 'mailchimp.com', slug: 'mailchimp' }],
    ['zoom', { domain: 'zoom.us', slug: 'zoom' }],
    ['microsoft', { domain: 'microsoft.com', slug: 'microsoft' }],
    ['dropbox', { domain: 'dropbox.com', slug: 'dropbox' }],
    ['atlassian', { domain: 'atlassian.com', slug: 'atlassian' }],
    ['hubspot', { domain: 'hubspot.com', slug: 'hubspot' }],
    ['aws', { domain: 'aws.amazon.com', slug: 'amazonaws' }],
    ['meta', { domain: 'meta.com', slug: 'meta' }],
    ['google', { domain: 'google.com', slug: 'google' }],
  ];

  function brandFor(n) {
    const k = (n || '').toLowerCase();
    for (const [kw, brand] of MAP) {
      if (k.includes(kw)) return brand;
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

  const brand = $derived(brandFor(name));
  const domain = $derived(brand?.domain ?? null);
  const slug = $derived(brand?.slug ?? null);
  const letter = $derived((name || '?').trim().charAt(0).toUpperCase() || '?');
  const color = $derived(hashColor(name));
  const px = $derived(size + 'px');

  // Favicon real (Google s2, sin key). Pedimos 128px y lo escalamos.
  const faviconSrc = $derived(
    domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null,
  );
  const simpleiconsSrc = $derived(
    slug ? `https://cdn.simpleicons.org/${slug}` : null,
  );

  function initialStage() {
    if (faviconSrc) return 'favicon';
    if (simpleiconsSrc) return 'simpleicons';
    return 'monogram';
  }

  let stage = $state('monogram');
  // Reinicia la cadena cuando cambia el nombre (o las fuentes derivadas).
  $effect(() => {
    name;
    faviconSrc;
    simpleiconsSrc;
    stage = initialStage();
  });

  // Avanza al siguiente eslabón cuando un <img> falla al cargar.
  function fail() {
    if (stage === 'favicon') {
      stage = simpleiconsSrc ? 'simpleicons' : 'monogram';
    } else if (stage === 'simpleicons') {
      stage = 'monogram';
    }
  }
</script>

{#if (stage === 'favicon' && faviconSrc) || (stage === 'simpleicons' && simpleiconsSrc)}
  <span class="brandlogo brandlogo--chip" style={`width:${px};height:${px}`}>
    <img
      src={stage === 'favicon' ? faviconSrc : simpleiconsSrc}
      alt={name}
      loading="lazy"
      onerror={fail}
    />
  </span>
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
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border-radius: var(--radius-sm);
    overflow: hidden;
  }
  /* Chip claro: garantiza que logos oscuros (Vercel, GitHub) se vean. */
  .brandlogo--chip {
    background: #fff;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  }
  .brandlogo--chip img {
    width: 76%;
    height: 76%;
    object-fit: contain;
    display: block;
  }
  .brandlogo--mono {
    border-radius: var(--radius-md);
    color: #fff;
    font-family: var(--font-display);
    font-weight: 700;
    line-height: 1;
    letter-spacing: -0.01em;
    user-select: none;
  }
</style>
