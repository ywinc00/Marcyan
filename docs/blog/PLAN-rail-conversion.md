# PLAN — Raíl de conversión del blog (ToC + CTA + herramientas SIEMPRE a la vista)

> **Para el chat ejecutor de blog/contenido.** Plan del chat de planificación (2026-08-02).
> Objetivo del dueño: replicar el PATRÓN de navegación del blog de onceonceagency.com
> (visto en video): al leer un artículo, **solo el texto corre**; a la derecha queda un
> raíl fijo con (1) el índice del artículo, (2) una tarjeta de conversión con formulario
> y CTAs, y (3) una tarjeta con las herramientas gratis. Adaptado a NUESTRA identidad
> Space-Tech y a NUESTRA política de CTAs — **principios sí, look/copy de ellos NO**
> (DESIGN.md §8.5 ya fija esa regla sobre esta misma referencia).

---

## §0 · Qué tenemos y qué falta (diagnóstico hecho — no re-auditar)

| Pieza del patrón | Estado |
|---|---|
| ToC sticky con scroll-spy (resaltado oro + barra) | ✅ YA EXISTE (`ArticleToc.astro`) — incluso más fina que la de la referencia |
| ToC colapsable en móvil (`<details>`) | ✅ YA EXISTE (mismo componente, `.toc__m`) |
| Raíl a la DERECHA (hoy la ToC va a la izquierda) | ❌ mover |
| Tarjeta de conversión fija (form + CTA) en el raíl | ❌ crear (`RailCta.astro`) |
| Tarjeta de herramientas fija en el raíl | ❌ crear (`RailTools.astro`) |
| Raíl con scroll INTERNO (si es más alto que el viewport, nunca corta las tarjetas) | ❌ crear (`ArticleRail.astro`) |
| Conversión al final (CtaBand + Contact) | ✅ YA EXISTE — **no se toca** |

Archivos que se tocan (SOLO estos):
- `src/components/sections/ArticleToc.astro` — prop aditiva `embedded`
- `src/pages/es/blog/[slug].astro` — grilla de lectura + montaje del raíl
- `src/i18n/blog.ts` — diccionario `postChrome.rail`
- **NUEVOS**: `src/components/sections/ArticleRail.astro`, `RailCta.astro`, `RailTools.astro`

⛔ **NO se tocan**: `Contact.astro`, `CtaBand.astro`, `api/*`, `lib/*`, `Article.astro`,
`ArticleHero`, `PostNav`, `RelatedLinks`, `Faq`, el índice del blog, `pricing.ts`, `chat-kb.mjs`.

---

## §1 · Decisiones de diseño (LOCKED — no reinterpretar)

1. **Raíl derecho solo en desktop (`--lg`)**: columna sticky de `19.5rem` con
   `max-height` y `overflow-y:auto` (scroll interno propio, patrón de la referencia).
   El texto del artículo queda a la IZQUIERDA (medida de lectura la sigue mandando
   `Article`, max 72ch).
2. **En móvil** el raíl aporta SOLO la ToC colapsable arriba del texto (igual que hoy);
   las tarjetas del raíl se ocultan y en su lugar se muestra `RailTools` **inline**
   después del cuerpo (sin formulario). La conversión móvil sigue siendo la política
   vigente: CtaBand con **Llamar dominante** + Contact al final. El mini-form del raíl
   es superficie de DESKTOP (donde el formulario es el canal dominante).
3. **Política de CTAs intacta** ([[marcyan_conversion_cta_policy]]): el raíl NUNCA
   enlaza `/formulario` (el brief no capta). Canales: mini-form → `/api/contact`
   (LEAD, mismo contrato del form del sitio), WhatsApp y Llamar.
4. **Precios**: los números salen de `PRICE_ANCHORS` (import de `../../i18n/pricing`),
   NUNCA hardcodeados en copy. El diccionario lleva plantillas con `{web}/{ia}/{seo}`
   y el componente las rellena.
5. **DS v2**: solo tokens, breakpoints `@custom-media`, `tap-min`, `:focus-visible`,
   `--motion-reduce`. Tono oro (blog es oro). Cero glows teal sucios (DESIGN §8.3).
6. **Tracking**: SOLO eventos ya existentes — `tool_cta_clicked` (links de herramientas),
   `whatsapp_clicked`, `call_clicked`. El submit del mini-form NO crea evento nuevo
   (el lead ya queda en Neon con su `interest` delator).
7. **Atribución del lead**: el mini-form envía `main_objective = "Blog: <título del post>"`
   → en el panel se ve exactamente qué guía convirtió. `api/contact.mjs` ya lo acepta
   (mapea `main_objective` → `interest`, sanitizado a 500 chars; verificado).

---

## §2 · Código — `ArticleToc.astro` (edición ADITIVA)

**2a.** En el frontmatter, sustituir la interfaz/destructuring:

```astro
interface Heading { depth: number; slug: string; text: string }
interface Props { headings: Heading[]; label: string; embedded?: boolean }
const { headings, label, embedded = false } = Astro.props as Props;
```

**2b.** En el `<nav>`, añadir la clase condicional (línea del `nav.toc`):

```astro
<nav class:list={['toc', embedded && 'toc--embedded']} aria-label={label} data-toc-spy>
```

**2c.** Al FINAL del bloque `@media (--lg)` del `<style>` (después de las reglas de
`aria-current`), añadir:

```css
    /* Embebida en ArticleRail: el raíl es quien pega y hace scroll; el panel
       de la ToC se queda estático y crece natural (evita scrollbars anidadas). */
    .toc--embedded .toc__d {
      position: static;
      max-height: none;
      overflow-y: visible;
    }
```

Nada más cambia en el componente (el scroll-spy y el `<details>` móvil quedan igual).
Uso sin `embedded` = comportamiento idéntico al actual.

---

## §3 · Código — `src/components/sections/ArticleRail.astro` (NUEVO)

```astro
---
// Raíl de lectura del blog — patrón "solo el texto se mueve" (ver
// docs/blog/PLAN-rail-conversion.md). En desktop (--lg) es UNA columna sticky
// con scroll interno: ToC + tarjeta de conversión + tarjeta de herramientas
// siempre a la vista mientras corre el artículo. En móvil solo aporta la ToC
// colapsable (las tarjetas se ocultan; la conversión móvil sigue siendo
// CtaBand/Contact según la política de CTAs).
import ArticleToc from './ArticleToc.astro';
import RailCta from './RailCta.astro';
import RailTools from './RailTools.astro';

interface Heading { depth: number; slug: string; text: string }
interface Props { headings: Heading[]; tocLabel: string; rail: any; postTitle: string }
const { headings, tocLabel, rail, postTitle } = Astro.props;
---
<div class="rail">
  <ArticleToc headings={headings} label={tocLabel} embedded />
  <div class="rail__cards">
    <RailCta t={rail.cta} postTitle={postTitle} />
    <RailTools t={rail.tools} />
  </div>
</div>

<style>
  .rail { display: flex; flex-direction: column; gap: var(--space-5); min-width: 0; }

  /* Móvil: solo la ToC (details). Las tarjetas viven en el raíl desktop. */
  .rail__cards { display: none; }

  @media (--lg) {
    .rail {
      position: sticky;
      top: calc(var(--nav-h) + var(--space-5));
      max-height: calc(100vh - var(--nav-h) - var(--space-6));
      overflow-y: auto;
      overscroll-behavior: contain;
      /* aire inferior para que el borde de la última tarjeta no se corte */
      padding-bottom: var(--space-2);
    }
    .rail__cards { display: flex; flex-direction: column; gap: var(--space-5); }
  }
</style>
```

---

## §4 · Código — `src/components/sections/RailCta.astro` (NUEVO)

```astro
---
// Tarjeta de conversión del raíl del blog (superficie DESKTOP — el raíl la
// oculta en móvil). Política de CTAs: mini-form → /api/contact (LEAD) como canal
// dominante de desktop + WhatsApp/Llamar como alternativas. NUNCA /formulario.
// Números de precio desde PRICE_ANCHORS (fuente única) — jamás hardcodeados.
import Icon from '../ui/Icon.astro';
import { nap } from '../../i18n/content';
import { PRICE_ANCHORS } from '../../i18n/pricing';

interface Props { t: any; postTitle: string }
const { t, postTitle } = Astro.props;

const usd = (n: number) => '$' + n.toLocaleString('en-US');
const priceNote = (t.priceNote as string)
  .replace('{web}', usd(PRICE_ANCHORS.webLanding))
  .replace('{ia}', usd(PRICE_ANCHORS.iaBasic))
  .replace('{seo}', usd(PRICE_ANCHORS.seoInitial));

const tel = nap.houston;
const telHref = 'tel:' + tel.replace(/[^\d+]/g, '');
const waHref = 'https://wa.me/' + tel.replace(/\D/g, '');
---
<aside class="rcta" aria-label={t.aria}>
  <p class="rcta__kicker">{t.kicker}</p>
  <h2 class="rcta__title" set:html={t.title} />
  <p class="rcta__prices">{priceNote}</p>

  <a class="rcta__chip" href={t.chipHref} data-track="tool_cta_clicked">
    <Icon name="lucide:scan-search" />
    <span>{t.chip}</span>
  </a>

  <form class="rcta__form" id="rail-cta-form" novalidate
    data-objective={`Blog: ${postTitle}`}
    data-sending={t.form.sending} data-success={t.form.success}
    data-error={t.form.error} data-invalid={t.form.invalid}
  >
    <input type="text" name="website_hp" class="rcta__hp" tabindex="-1" autocomplete="off" aria-hidden="true" />
    <label class="rcta__field">
      <span class="rcta__lbl">{t.form.name.label}</span>
      <input type="text" name="owner_name" placeholder={t.form.name.ph} autocomplete="name" />
    </label>
    <label class="rcta__field">
      <span class="rcta__lbl">{t.form.contact.label}</span>
      <input type="text" name="contact" placeholder={t.form.contact.ph} autocomplete="email" inputmode="email" />
    </label>
    <button class="rcta__submit" type="submit" data-submit>{t.form.submit}</button>
    <p class="rcta__status rcta__status--err" role="alert" hidden></p>
    <p class="rcta__status rcta__status--ok" role="status" hidden></p>
  </form>

  <div class="rcta__alt">
    <span class="rcta__alt-lbl">{t.or}</span>
    <a class="rcta__alt-link" href={waHref} data-track="whatsapp_clicked">
      <Icon name="lucide:message-circle" /><span>WhatsApp</span>
    </a>
    <a class="rcta__alt-link" href={telHref} data-track="call_clicked">
      <Icon name="lucide:phone" /><span>{t.call}</span>
    </a>
  </div>
</aside>

<style>
  .rcta {
    position: relative; isolation: isolate; overflow: hidden;
    display: flex; flex-direction: column; gap: var(--space-3);
    background:
      radial-gradient(120% 140% at 50% 0%, color-mix(in srgb, var(--accent-gold), transparent 94%), transparent 55%),
      var(--bg-card);
    border: 1px solid var(--border); border-radius: var(--radius-lg);
    padding: var(--space-5);
  }
  /* filete superior de acento — eco de CtaBand, versión mini */
  .rcta::before {
    content: ""; position: absolute; inset-inline: 0; top: 0; height: 1px; pointer-events: none;
    background: linear-gradient(90deg, transparent, var(--accent-gold), transparent);
    opacity: 0.7;
  }

  .rcta__kicker {
    margin: 0; font-family: var(--font-mono); font-size: var(--text-xs); font-weight: 500;
    letter-spacing: var(--tracking-widest); text-transform: uppercase; color: var(--accent-gold);
  }
  .rcta__title { margin: 0; font-family: var(--font-display); font-size: var(--text-lg); line-height: var(--leading-snug); color: var(--fg-primary); }
  .rcta__title :global(em) { color: var(--accent-gold); font-style: normal; }
  .rcta__prices { margin: 0; font-size: var(--text-xs); color: var(--fg-secondary); line-height: var(--leading-normal); }

  .rcta__chip {
    display: inline-flex; align-items: center; gap: var(--space-2);
    min-height: var(--tap-min); padding: var(--space-2) var(--space-3);
    border: 1px solid var(--accent-teal-line); border-radius: var(--radius-pill);
    background: var(--accent-teal-dim); color: var(--accent-teal);
    font-size: var(--text-xs); font-weight: 600; text-decoration: none;
    transition: border-color var(--duration-fast), color var(--duration-fast);
  }
  .rcta__chip :global(svg) { width: 15px; height: 15px; flex: 0 0 auto; stroke-width: 1.5; }
  .rcta__chip:hover { border-color: var(--accent-teal); }
  .rcta__chip:focus-visible { outline: 2px solid var(--accent-teal); outline-offset: 2px; }

  .rcta__form { display: flex; flex-direction: column; gap: var(--space-3); margin-top: var(--space-2); }
  .rcta__hp { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }
  .rcta__field { display: flex; flex-direction: column; gap: var(--space-1); min-width: 0; }
  .rcta__lbl { font-size: var(--text-xs); font-weight: 600; letter-spacing: var(--tracking-wide); text-transform: uppercase; color: var(--fg-secondary); }
  .rcta__field input {
    width: 100%; min-width: 0; min-height: var(--tap-min);
    background: var(--bg-elevated); border: 1px solid var(--border); border-radius: var(--radius-md);
    color: var(--fg-primary); font-family: var(--font-body); font-size: var(--text-sm);
    padding: 9px 12px; transition: border-color var(--duration-fast), box-shadow var(--duration-fast);
  }
  .rcta__field input::placeholder { color: var(--fg-subtle); }
  .rcta__field input:focus { outline: none; border-color: var(--accent-gold); box-shadow: 0 0 0 3px var(--accent-gold-dim); }

  .rcta__submit {
    display: inline-flex; align-items: center; justify-content: center;
    min-height: var(--tap-min); padding: 11px 18px; border-radius: var(--radius-md);
    background: var(--accent-gold); color: var(--fg-inverse); border: 1px solid var(--accent-gold);
    font-family: var(--font-body); font-weight: 600; font-size: var(--text-sm); cursor: pointer;
    transition: background var(--duration-fast) var(--ease-out-expo), box-shadow var(--duration-base);
  }
  .rcta__submit:hover { background: color-mix(in srgb, var(--accent-gold), white 10%); box-shadow: 0 8px 30px -12px var(--accent-gold-glow); }
  .rcta__submit:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
  .rcta__submit:disabled { opacity: 0.7; cursor: default; }

  .rcta__status { margin: 0; font-size: var(--text-xs); padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); }
  .rcta__status--err { background: rgba(224, 92, 92, 0.12); border: 1px solid rgba(224, 92, 92, 0.3); color: #e07a7a; }
  .rcta__status--ok { background: var(--accent-teal-dim); border: 1px solid var(--accent-teal-line); color: var(--accent-teal); }

  .rcta__alt { display: flex; align-items: center; flex-wrap: wrap; gap: var(--space-2) var(--space-3); margin-top: var(--space-1); }
  .rcta__alt-lbl { font-size: var(--text-xs); color: var(--fg-subtle); }
  .rcta__alt-link {
    display: inline-flex; align-items: center; gap: var(--space-1);
    min-height: var(--tap-min); color: var(--fg-secondary); font-size: var(--text-xs); font-weight: 600;
    text-decoration: none; transition: color var(--duration-fast);
  }
  .rcta__alt-link :global(svg) { width: 14px; height: 14px; stroke-width: 1.5; }
  .rcta__alt-link:hover { color: var(--accent-gold); }
  .rcta__alt-link:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; border-radius: var(--radius-sm); }

  @media (--motion-reduce) {
    .rcta__chip, .rcta__submit, .rcta__alt-link, .rcta__field input { transition: none; }
  }
</style>

<script>
  // Mini-form del raíl → /api/contact (LEAD). Mismo contrato del form del sitio
  // (owner_name/email/phone/main_objective/website_hp); el campo único "contact"
  // se mapea a email si lleva @, si no a phone. Validación email-O-teléfono
  // idéntica a Contact.astro. Sin innerHTML. Timeout 15s. Guard anti doble envío.
  const form = document.getElementById('rail-cta-form') as HTMLFormElement | null;
  if (form) {
    const btn = form.querySelector('[data-submit]') as HTMLButtonElement;
    const errBox = form.querySelector('.rcta__status--err') as HTMLElement;
    const okBox = form.querySelector('.rcta__status--ok') as HTMLElement;
    const S = form.dataset;
    const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    const digits = (v: string) => v.replace(/\D/g, '');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (form.dataset.busy) return;
      form.dataset.busy = '1';
      errBox.hidden = true; okBox.hidden = true;

      const fd = new FormData(form);
      const name = String(fd.get('owner_name') || '').trim();
      const contact = String(fd.get('contact') || '').trim();
      const hp = String(fd.get('website_hp') || '');
      if (hp) { delete form.dataset.busy; return; }

      const data: Record<string, string> = {
        owner_name: name,
        main_objective: S.objective || 'Blog',
      };
      if (contact.includes('@')) data.email = contact;
      else data.phone = contact;

      const contactEl = form.querySelector('[name="contact"]') as HTMLInputElement | null;
      contactEl?.removeAttribute('aria-invalid');
      const valid = data.email ? isEmail(data.email) : digits(data.phone || '').length >= 7;
      if (!valid) {
        errBox.textContent = S.invalid || 'Revisa tu email o teléfono.';
        errBox.hidden = false;
        if (contactEl) { contactEl.setAttribute('aria-invalid', 'true'); contactEl.focus(); }
        delete form.dataset.busy;
        return;
      }

      const orig = btn.textContent || '';
      btn.disabled = true; btn.textContent = S.sending || 'Enviando…';
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), 15000);
      try {
        const res = await fetch('/api/contact', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data), signal: ctrl.signal,
        });
        window.clearTimeout(timer);
        let payload: any = null;
        try { payload = await res.json(); } catch (_) { /* ignore */ }
        if (!res.ok || !payload || !payload.ok) {
          errBox.textContent = (payload && payload.error) || S.error || 'Error.';
          errBox.hidden = false;
          btn.disabled = false; btn.textContent = orig;
          delete form.dataset.busy;
          return;
        }
        okBox.textContent = (S.success || '✓') + (payload.refId ? ' · ' + payload.refId : '');
        okBox.hidden = false;
        form.querySelectorAll('input').forEach((el) => (el.disabled = true));
        btn.textContent = '✓';
        delete form.dataset.busy;
      } catch (_) {
        window.clearTimeout(timer);
        errBox.textContent = S.error || 'Error de red.';
        errBox.hidden = false;
        btn.disabled = false; btn.textContent = orig;
        delete form.dataset.busy;
      }
    });
  }
</script>
```

---

## §5 · Código — `src/components/sections/RailTools.astro` (NUEVO)

```astro
---
// Tarjeta de herramientas gratis del raíl del blog (Growth OS §Lote 2, ahora
// también dentro de la lectura). Enlaza calculadoras + diagnóstico con el evento
// first-party existente. Se usa 2 veces en [slug]: en el raíl (desktop) y en
// variante inline tras el cuerpo (solo móvil) — por eso NO lleva ids.
import Icon from '../ui/Icon.astro';

interface Props { t: any }
const { t } = Astro.props;
---
<aside class="rtools" aria-label={t.aria}>
  <p class="rtools__kicker">{t.kicker}</p>
  <p class="rtools__intro">{t.intro}</p>
  <ul class="rtools__list">
    {t.items.map((it: any) => (
      <li>
        <a class="rtools__link" href={it.href} data-track="tool_cta_clicked">
          <span class="rtools__ic"><Icon name={it.icon} /></span>
          <span class="rtools__t">{it.label}</span>
          <span class="rtools__arrow" aria-hidden="true">→</span>
        </a>
      </li>
    ))}
  </ul>
  <a class="rtools__all" href={t.all.href} data-track="tool_cta_clicked">{t.all.label} →</a>
</aside>

<style>
  .rtools {
    display: flex; flex-direction: column; gap: var(--space-3);
    background: color-mix(in srgb, var(--bg-card) 80%, transparent);
    border: 1px solid var(--border); border-radius: var(--radius-lg);
    padding: var(--space-5);
  }
  .rtools__kicker {
    margin: 0; font-family: var(--font-mono); font-size: var(--text-xs); font-weight: 500;
    letter-spacing: var(--tracking-widest); text-transform: uppercase; color: var(--accent-gold);
  }
  .rtools__intro { margin: 0; font-size: var(--text-xs); color: var(--fg-secondary); line-height: var(--leading-normal); }

  .rtools__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
  .rtools__link {
    display: flex; align-items: center; gap: var(--space-2);
    min-height: var(--tap-min); padding-block: var(--space-2);
    color: var(--fg-secondary); font-size: var(--text-sm); text-decoration: none;
    transition: color var(--duration-fast) var(--ease-out-expo);
  }
  .rtools__ic {
    flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; border-radius: var(--radius-md);
    background: var(--bg-elevated); border: 1px solid var(--border); color: var(--accent-gold);
  }
  .rtools__ic :global(svg) { width: 14px; height: 14px; stroke-width: 1.5; }
  .rtools__t { min-width: 0; }
  .rtools__arrow { margin-left: auto; color: var(--fg-subtle); transition: color var(--duration-fast), transform var(--duration-fast); }
  .rtools__link:hover { color: var(--accent-gold); }
  .rtools__link:hover .rtools__arrow { color: var(--accent-gold); transform: translateX(2px); }
  .rtools__link:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; border-radius: var(--radius-sm); }

  .rtools__all {
    display: inline-flex; align-items: center; min-height: var(--tap-min);
    font-family: var(--font-mono); font-size: var(--text-xs); letter-spacing: var(--tracking-wide);
    color: var(--accent-gold); text-decoration: none;
  }
  .rtools__all:hover { text-decoration: underline; text-underline-offset: 3px; }
  .rtools__all:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; border-radius: var(--radius-sm); }

  @media (--motion-reduce) { .rtools__link, .rtools__arrow { transition: none; } }
</style>
```

**Iconos:** antes de comitear, abre `src/components/growthos/ToolsHub.astro` y usa
para cada calculadora EL MISMO icono Lucide que ya usa el hub (convención DESIGN §8.4:
un icono = un concepto). Si el hub usa otros nombres distintos de los del diccionario
de §6, corrige el diccionario, no el hub.

---

## §6 · Código — `src/i18n/blog.ts` (añadir dentro de `postChrome`)

Añadir la clave `rail` al objeto `postChrome` (después de `toc:` y antes de `cta:`):

```ts
  rail: {
    cta: {
      aria: 'Pide tu propuesta',
      kicker: 'Hablemos de tu proyecto',
      title: '¿Listo para que tu negocio <em>despegue</em>?',
      // {web}/{ia}/{seo} los rellena RailCta desde PRICE_ANCHORS (fuente única).
      priceNote: 'Precios públicos: web desde {web} · asistente con IA desde {ia} · SEO local desde {seo}.',
      chip: 'Diagnóstico de visibilidad en IA — gratis',
      chipHref: '/es/diagnostico',
      form: {
        name: { label: 'Nombre', ph: 'Tu nombre' },
        contact: { label: 'Email o WhatsApp', ph: 'tu@email.com o tu número' },
        submit: 'Pedir propuesta gratis',
        sending: 'Enviando…',
        success: 'Recibido. Te respondemos en menos de 24h.',
        error: 'No se pudo enviar. Escríbenos por WhatsApp o inténtalo de nuevo.',
        invalid: 'Déjanos un email válido o un teléfono con al menos 7 dígitos.',
      },
      or: 'o si prefieres:',
      call: 'Llamar',
    },
    tools: {
      aria: 'Herramientas gratis',
      kicker: 'Herramientas gratis',
      intro: 'Ponle número a lo que estás perdiendo, en segundos y sin registro:',
      items: [
        { label: 'Calculadora de llamadas perdidas', href: '/es/herramientas#llamadas', icon: 'lucide:phone-missed' },
        { label: 'Calculadora de citas perdidas', href: '/es/herramientas#citas', icon: 'lucide:calendar-x' },
        { label: 'Diagnóstico digital gratis', href: '/es/diagnostico', icon: 'lucide:scan-search' },
      ],
      all: { label: 'Ver todas las herramientas', href: '/es/herramientas' },
    },
  },
```

(Copy en español neutral hispano US, coherente con el resto del chrome. Sin números
hardcodeados — regla §1.4.)

---

## §7 · Código — `src/pages/es/blog/[slug].astro` (2 ediciones)

**7a. Import** (junto a los demás imports de sections):

```astro
import ArticleRail from '../../../components/sections/ArticleRail.astro';
import RailTools from '../../../components/sections/RailTools.astro';
```

`ArticleToc` deja de importarse aquí (lo importa ArticleRail). Las variables
`tocItems`/`hasToc` del frontmatter SE QUEDAN (nada las rompe), pero la grilla ya
no depende de `hasToc`: el raíl existe siempre (las tarjetas valen aunque el post
tenga <3 H2; la ToC se auto-oculta sola en ese caso — su guard `items.length >= 3`
ya lo hace).

**7b. Sustituir el bloque de lectura completo** (el `<section class="section reader">`
actual, incluida su grilla) por:

```astro
    {/* Lectura: el texto corre; el raíl (ToC + conversión + herramientas) acompaña
        pegado en desktop. En móvil: ToC colapsable arriba + herramientas inline abajo. */}
    <section class="section reader">
      <div class="container">
        <div class="reader__grid">
          <aside class="reader__aside">
            <ArticleRail
              headings={headings}
              tocLabel={postChrome.toc}
              rail={postChrome.rail}
              postTitle={d.title}
            />
          </aside>
          <div class="reader__body">
            <Article><Content /></Article>
            <div class="reader__tools-m">
              <RailTools t={postChrome.rail.tools} />
            </div>
          </div>
        </div>
      </div>
    </section>
```

**7c. Sustituir el `<style>` de la página** (bloque `.reader…`) por:

```astro
<style>
  /* Zona de lectura: ritmo más ceñido que una sección completa (la energía va al texto). */
  .reader { padding-block: var(--space-7); }
  .reader__grid { display: grid; grid-template-columns: 1fr; gap: var(--space-6); min-width: 0; }

  /* En móvil el raíl solo pinta la ToC (details) arriba del cuerpo. */
  .reader__aside { min-width: 0; }
  .reader__body { min-width: 0; }

  /* Herramientas inline: solo móvil (en desktop viven en el raíl). */
  .reader__tools-m { margin-top: var(--space-7); }

  @media (--lg) {
    /* Desktop: texto a la IZQUIERDA (medida la manda Article, max 72ch) + raíl
       pegajoso a la DERECHA. El aside va primero en el DOM (ToC móvil arriba +
       lectores de pantalla reciben el índice antes del cuerpo); visualmente
       se coloca a la derecha vía grid-column. */
    .reader__grid {
      grid-template-columns: minmax(0, 1fr) minmax(0, 19.5rem);
      gap: var(--space-8);
      align-items: start;
    }
    .reader__aside { grid-column: 2; grid-row: 1; }
    .reader__body  { grid-column: 1; grid-row: 1; }
    .reader__tools-m { display: none; }
  }
</style>
```

---

## §8 · QA obligatorio (puerta de salida DESIGN.md §7 — bloqueante)

1. `npm run build` — verde, mismo número de páginas (no se añaden rutas).
2. `npm run check:kb` y `npm run test:chat` — verdes (no debería tocarlos NADA;
   si fallan, algo se hizo mal).
3. **Navegador (preview) — desktop ≥1024px**, en un post largo
   (`/es/blog/como-aparecer-en-chatgpt-perplexity`):
   - Solo el texto corre; ToC + 2 tarjetas quedan a la vista a la derecha.
   - Scroll-spy sigue resaltando el H2 activo (oro + barra).
   - Si el raíl es más alto que el viewport, tiene SU scroll interno (rueda del
     ratón sobre el raíl) y ninguna tarjeta queda inalcanzable.
   - Al llegar a FAQ/related, el raíl se despega limpio (comportamiento sticky normal).
   - Mini-form: envío con SOLO teléfono → ok con folio; con email inválido → error
     accesible (aria-invalid + foco); doble click en enviar → un solo POST.
   - En el panel/admin aparece el lead con `interest = "Blog: <título>"`.
   - Links de herramientas → aterrizan en `#llamadas`/`#citas` del hub.
4. **Navegador — móvil 375px**:
   - ToC colapsable arriba (igual que antes); SIN tarjeta de formulario del raíl.
   - Tarjeta de herramientas inline después del cuerpo, antes de FAQ.
   - Sin scroll-x 320→1440. CtaBand sigue con Llamar dominante.
5. **A11y:** un solo `<h1>` (el título del raíl es `<h2>` — verifica que ArticleHero
   sigue teniendo el único h1); focos visibles en chip/links/inputs/botón; tap ≥44px.
6. **Post con <3 H2** (si existe; si no, prueba temporal bajando el guard): el raíl
   muestra solo las tarjetas, sin hueco raro.
7. `@media (--motion-reduce)`: sin transiciones.
8. Greps de doctrina limpios (lenguaje IA §1 del plan bilingüe): el copy nuevo ya
   cumple ("ponemos la IA a trabajar por ti" no aparece aquí; nada de "usamos IA").

## §9 · Anti-checklist (NO hacer)

- NO tocar `Contact.astro`, `CtaBand.astro`, `Article.astro`, `api/*`, `lib/*`,
  `pricing.ts`, `chat-kb.mjs`, el índice del blog ni `/en/blog`.
- NO enlazar `/formulario` desde el raíl (política de CTAs).
- NO hardcodear precios en copy/componentes (siempre `PRICE_ANCHORS`).
- NO clonar copy/estética de Once Once (patrón sí, look no — DESIGN §8.5).
- NO crear eventos de tracking nuevos.
- NO añadir dependencias.
- NO position:fixed (es sticky dentro de la grilla; fixed rompería el footer).

## §10 · Rollout

Rama `feat/blog-rail` · 2 commits:
- **A** `feat(blog): raíl de conversión sticky (ToC + CTA + herramientas)` — §2-§7.
- **B** `chore(blog): QA raíl` — cualquier ajuste del QA §8.
Merge a `main` + deploy + verificación en prod (mismo checklist §8.3-8.4 sobre la URL real).
