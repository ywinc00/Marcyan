<script>
  /* ════════════════════════════════════════════════════════════════
     BrandLogo — logo de marca para una suscripción/SaaS de la agencia.
     Tiny + reusable. Svelte 5 runes.

     CADENA DE FALLBACK (graceful degradation):
       1) logo.dev   → logo REAL a todo color de la empresa
                       (https://img.logo.dev/<dominio>?token=…). Requiere
                       PUBLIC_LOGODEV_TOKEN (Astro inyecta PUBLIC_* en el
                       bundle del cliente). Sin token → 401, así que sólo
                       se intenta si hay token Y conocemos el dominio.
       2) simpleicons → SVG monocromo en color de marca
                       (https://cdn.simpleicons.org/<slug>). Se usa si no
                       hay token, si el dominio es desconocido, o si la
                       imagen de logo.dev falla al cargar.
       3) monograma  → tile cuadrado redondeado con color de fondo
                       determinista (hash del nombre) y la inicial en
                       blanco. Último recurso.

     El paso se controla con un $state `stage` y handlers onerror que
     avanzan logodev → simpleicons → monogram. Se reinicia al cambiar
     `name`.

     Uso:
       <BrandLogo name="Vercel Pro" />
       <BrandLogo name="Figma" size={18} />

     Env var requerida para activar logo.dev:
       PUBLIC_LOGODEV_TOKEN  (publishable key de logo.dev)
     ════════════════════════════════════════════════════════════════ */

  let { name = '', size = 22 } = $props();

  // Publishable key de logo.dev. Astro inyecta las PUBLIC_* en el bundle
  // del cliente, así que es seguro leerla aquí. Si está vacía saltamos
  // logo.dev y empezamos directamente en simpleicons.
  const LOGODEV_TOKEN = import.meta.env.PUBLIC_LOGODEV_TOKEN || '';

  // keyword (en minúsculas) → { domain, slug }. La clave se busca como
  // SUBSTRING dentro del nombre normalizado, así "Vercel Pro" → vercel,
  // "Google Workspace" → google, "Adobe Creative Cloud" → adobe, etc.
  // Ordenado de más específico a más genérico para que p.ej. "amazon web
  // services" gane sobre "amazon" y "google cloud" sobre "google".
  //   domain → usado por logo.dev (logo real a color)
  //   slug   → usado por simpleicons (SVG de marca)
  const MAP = [
    ['amazon web services', { domain: 'aws.amazon.com', slug: 'amazonaws' }],
    ['google cloud', { domain: 'cloud.google.com', slug: 'googlecloud' }],
    ['google workspace', { domain: 'google.com', slug: 'google' }],
    ['vercel', { domain: 'vercel.com', slug: 'vercel' }],
    ['figma', { domain: 'figma.com', slug: 'figma' }],
    ['namecheap', { domain: 'namecheap.com', slug: 'namecheap' }],
    ['anthropic', { domain: 'anthropic.com', slug: 'anthropic' }],
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

  // logo.dev: pedimos 2x para retina (size*2) + retina=true + png.
  const logodevSrc = $derived(
    domain && LOGODEV_TOKEN
      ? `https://img.logo.dev/${domain}?token=${LOGODEV_TOKEN}&size=${size * 2}&format=png&retina=true`
      : null,
  );
  const simpleiconsSrc = $derived(
    slug ? `https://cdn.simpleicons.org/${slug}` : null,
  );

  // Etapa inicial de la cadena según lo que tengamos disponible:
  //   logodev (si hay token + dominio) → simpleicons (si hay slug) → monogram
  function initialStage() {
    if (logodevSrc) return 'logodev';
    if (simpleiconsSrc) return 'simpleicons';
    return 'monogram';
  }

  let stage = $state('monogram');
  // Reinicia la cadena cuando cambia el nombre (o las fuentes derivadas).
  $effect(() => {
    name;
    logodevSrc;
    simpleiconsSrc;
    stage = initialStage();
  });

  // Avanza al siguiente eslabón de la cadena cuando un <img> falla.
  function fail() {
    if (stage === 'logodev') {
      stage = simpleiconsSrc ? 'simpleicons' : 'monogram';
    } else if (stage === 'simpleicons') {
      stage = 'monogram';
    }
  }
</script>

{#if stage === 'logodev' && logodevSrc}
  <img
    class="brandlogo"
    src={logodevSrc}
    alt={name}
    width={size}
    height={size}
    style={`width:${px};height:${px}`}
    loading="lazy"
    onerror={fail}
  />
{:else if stage === 'simpleicons' && simpleiconsSrc}
  <img
    class="brandlogo"
    src={simpleiconsSrc}
    alt={name}
    width={size}
    height={size}
    style={`width:${px};height:${px}`}
    loading="lazy"
    onerror={fail}
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
