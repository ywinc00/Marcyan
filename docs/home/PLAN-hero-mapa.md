# PLAN — Hero planetario como MAPA DE CONVERSIÓN (estaciones fijas, siempre clicables)

> **Para el chat ejecutor.** Plan del chat de planificación (2026-08-02), pedido del dueño:
> el planeta del hero hoy es decoración; debe ser el mapa que guía al cliente a las
> herramientas/secciones clave del flujo de conversión. **Reglas duras del dueño:**
> los botones flotantes (1) NO deben superponerse unos con otros y (2) deben ser
> clicables TODO el tiempo.
>
> Nota de doctrina: la home está en la lista NO TOCAR de `DESIGN.md §6`, pero este
> cambio es mandato directo del dueño (2026-08-02) → override autorizado SOLO para
> el Hero. Al terminar, añade la sección §8.6 a DESIGN.md (texto en §6 de este plan).

---

## §0 · Diagnóstico (hecho — no re-auditar)

En `src/components/sections/Hero.astro` (motor orbital 2.5D):

1. **Destinos débiles**: los nodos son `#servicios / #ia / #proyectos / #ciudades`
   (anclas de la propia home, todas existen). Ninguno lleva al flujo de conversión:
   ni diagnóstico gratis, ni calculadoras, ni precios.
2. **Clicabilidad rota por diseño** (por qué "no llevan a ninguna parte" en la práctica):
   - Los nodos solo existen tras hover (desktop) o primer toque (móvil); en calma `energy=0` → invisibles.
   - `pointerEvents = (energy > 0.5 && depth > -0.35)` → se apagan al pasar DETRÁS del planeta y siempre que la energía baja.
   - Orbitan continuamente → blanco móvil, imposible de clicar con precisión.
   - Dos carriles con velocidades distintas (`lanes [0.72, 0.92]`, `speed 0.06+0.015*(idx%3)`) → los nodos SE ALCANZAN y se superponen entre sí.
   - `.hero__hit` (capa invisible de activación, z-index 6) tapa el centro e intercepta clics de nodos.
3. **Bug a11y existente**: `.hero__orbit` lleva `aria-hidden="true"` conteniendo `<a>` reales.
4. Fallback SSR: chips `.hero__moons` bajo el titular — correctos, pero se ocultan al activarse el modo orbital.

## §1 · Diseño nuevo (LOCKED — no reinterpretar)

**Modelo "estaciones orbitales":** cada nodo tiene un **ángulo base FIJO** sobre un solo
carril; el movimiento es solo un balanceo de ±~3° con fases distintas (vivo, pero las
posiciones relativas nunca cambian). Así las dos reglas quedan garantizadas por
construcción, no por tuning:

- **No-superposición:** con n nodos la separación base es 360°/n (72° para 5) ≫ 2×3° de
  amplitud → matemáticamente imposible que dos nodos se toquen.
- **Clicables siempre:** `pointer-events: auto` permanente (se elimina el toggle JS),
  opacidad 1 tras la entrada (fade-in escalonado al cargar, NO ligada al hover),
  z-index fijo por CSS ENCIMA del SVG, capa `.hero__hit` ELIMINADA, `min-height:
  var(--tap-min)` en el chip.
- **Por dispositivo:**
  - **Desktop (≥lg, puntero fino):** estaciones orbitales visibles desde el load;
    el hover solo ENERGIZA (más balanceo, partículas más rápidas, tilt) — decoración,
    no compuerta. Los chips SSR se ocultan (los nodos son el mapa).
  - **Móvil/táctil (<lg):** los nodos orbitales NO se montan (en 375px las etiquetas
    se recortarían en el borde → violaría "clicables siempre"). El mapa móvil son los
    **chips SSR bajo el titular** (siempre visibles y clicables); el planeta conserva
    solo las partículas ambientales como decoración. Desaparece la compuerta
    "Toca para explorar".
  - **Reduced-motion / sin JS:** chips SSR estáticos (comportamiento actual, ya correcto).
- **A11y:** `.hero__orbit` pierde `aria-hidden` y gana `aria-label` (es LA navegación
  en desktop); `:focus-visible` en los nodos; orden de tabulación = orden del DOM.
- La pista flotante ("Pasa el cursor / Toca para explorar") y `.hero__hit` se eliminan
  (ya no hay nada que descubrir: el mapa está a la vista). `tapHint/hoverHint` quedan
  sin uso en `ui.ts` — NO los borres (otro chat podría referenciarlos; limpieza aparte).

**El mapa (5 nodos, flujo de conversión):** orden = prioridad de conversión; el CTA
principal (`#contacto`) NO se duplica en el mapa — sigue siendo el botón del dock.

| # | ES | href ES | EN | href EN | icon |
|---|---|---|---|---|---|
| 1 | Diagnóstico gratis | `/es/diagnostico` | Free checkup | `/en/checkup` | `lucide:scan-search` |
| 2 | Calculadoras gratis | `/es/herramientas` | Free calculators | `/en/tools` | `lucide:calculator` |
| 3 | Precios claros | `/es/precios` | Clear pricing | `/en/pricing` | `lucide:tag` |
| 4 | Proyectos | `#proyectos` | Projects | `#proyectos` | `lucide:folder` |
| 5 | Servicios | `#servicios` | Services | `#servicios` | `lucide:layers` |

(Salen del mapa `IA (#ia)` y `Ciudades (#ciudades)`: siguen accesibles por scroll y
nav. Los ids `#proyectos`/`#servicios` son de componentes compartidos → válidos también
en `/en/`. Alternancia oro/teal se mantiene por índice, como hoy.)

**Archivos tocados (SOLO estos):** `src/components/sections/Hero.astro` (reescritura,
§3) · `src/i18n/content.ts` (nodos ES y EN, §2) · `DESIGN.md` (añadir §8.6, §6).

## §2 · `src/i18n/content.ts` — nodos nuevos

**ES** (sustituir el array `nodes` del hero ES):

```ts
      // nodos en órbita = MAPA DE CONVERSIÓN (estaciones fijas, siempre clicables).
      // Orden = prioridad; el CTA #contacto vive en el dock, no se duplica aquí.
      nodes: [
        { label: 'Diagnóstico gratis', href: '/es/diagnostico', icon: 'lucide:scan-search' },
        { label: 'Calculadoras gratis', href: '/es/herramientas', icon: 'lucide:calculator' },
        { label: 'Precios claros', href: '/es/precios', icon: 'lucide:tag' },
        { label: 'Proyectos', href: '#proyectos', icon: 'lucide:folder' },
        { label: 'Servicios', href: '#servicios', icon: 'lucide:layers' },
      ],
```

**EN** (sustituir el array `nodes` del hero EN):

```ts
      nodes: [
        { label: 'Free checkup', href: '/en/checkup', icon: 'lucide:scan-search' },
        { label: 'Free calculators', href: '/en/tools', icon: 'lucide:calculator' },
        { label: 'Clear pricing', href: '/en/pricing', icon: 'lucide:tag' },
        { label: 'Projects', href: '#proyectos', icon: 'lucide:folder' },
        { label: 'Services', href: '#servicios', icon: 'lucide:layers' },
      ],
```

## §3 · `src/components/sections/Hero.astro` — REEMPLAZO COMPLETO

Sustituir el archivo entero por esto (cambios: markup sin `hit`/`hint`, orbit con
`aria-label`, nodos con tap-min/focus/entrada por CSS, script de estaciones fijas):

```astro
---
// HERO de la home — planeta 2.5D como MAPA DE CONVERSIÓN.
//  · SSR / fallback (siempre): titular + chips "lunas" como <a> reales + CTA dock.
//    Funciona sin JS, en móvil y con prefers-reduced-motion.
//  · Desktop (puntero fino, ≥lg): los enlaces orbitan como ESTACIONES FIJAS —
//    ángulo base fijo + balanceo de ±3° con fases distintas. Reglas duras (dueño,
//    2026-08-02): los nodos NUNCA se superponen entre sí (separación 360°/n ≫
//    amplitud) y son clicables TODO el tiempo (visibles desde el load, pointer-events
//    permanentes, z-index sobre el SVG, sin capas que intercepten). El hover solo
//    energiza la decoración (tilt + partículas), no es compuerta de nada.
//  · Táctil/<lg: el mapa son los chips SSR bajo el titular (en 375px las etiquetas
//    orbitales se recortarían); el planeta conserva solo partículas ambientales.
import Kicker from '../ui/Kicker.astro';
import Button from '../ui/Button.astro';
import Icon from '../ui/Icon.astro';
import { t, type Lang } from '../../i18n/ui';

interface Props { hero: any; lang?: Lang }
const { hero, lang = 'es' } = Astro.props;
const uih = t(lang).hero;
const uid = 'hero' + Math.random().toString(36).slice(2, 7);
---
<section class="hero" id="top" data-hero>
  <div class="hero__stars" data-hero-stars aria-hidden="true"></div>

  <div class="container hero__inner">
    <div class="hero__headline" data-hero-headline>
      <Kicker>{hero.tag}</Kicker>
      <h1 class="display hero__h1" set:html={hero.h1} />
      <p class="lead hero__sub">{hero.sub}</p>
      <nav class="hero__moons" aria-label={uih.exploreSite} data-hero-moons>
        {hero.nodes.map((n: any, i: number) => (
          <a class="moon" href={n.href} data-accent={i % 2 ? 'teal' : 'gold'}>
            {n.icon ? <Icon name={n.icon} class="moon__icon" /> : <span class="moon__dot" aria-hidden="true"></span>}
            <span>{n.label}</span>
          </a>
        ))}
      </nav>
    </div>

    <div class="hero__stage" data-hero-stage>
      <svg viewBox="0 0 400 400" role="img" aria-label={uih.planetLabel} class="hero__svg">
        <defs>
          <radialGradient id={`${uid}-p`} cx="44%" cy="36%" r="62%">
            <stop offset="0%" stop-color="var(--accent-gold)" />
            <stop offset="52%" stop-color="var(--accent-gold-deep)" />
            <stop offset="100%" stop-color="var(--planet-core)" />
          </radialGradient>
          <radialGradient id={`${uid}-g`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="var(--accent-gold)" stop-opacity="0.22" />
            <stop offset="100%" stop-color="var(--accent-gold)" stop-opacity="0" />
          </radialGradient>
          <clipPath id={`${uid}-c`}><circle cx="200" cy="200" r="110" /></clipPath>
        </defs>
        <circle cx="200" cy="200" r="190" fill={`url(#${uid}-g)`} />
        {/* órbita · mitad trasera — mismo grosor/opacidad que la delantera → anillo uniforme (sin "escalón" en el arco izquierdo) */}
        <path d="M28.8 255.6 A180 52 -18 0 0 371.2 144.4" fill="none" stroke="var(--accent-gold)" stroke-width="2.2" stroke-opacity="0.88" stroke-linecap="round" />
        {/* planeta */}
        <circle cx="200" cy="200" r="110" fill={`url(#${uid}-p)`} />
        <ellipse cx="222" cy="212" rx="100" ry="100" fill="rgba(0,0,0,0.42)" clip-path={`url(#${uid}-c)`} />
        {/* órbita · mitad delantera */}
        <path d="M28.8 255.6 A180 52 -18 0 1 371.2 144.4" fill="none" stroke="var(--accent-gold)" stroke-width="2.2" stroke-opacity="0.88" stroke-linecap="round" />
        {/* satélite = IA */}
        <circle cx="371" cy="144" r="8" fill="var(--accent-teal)" />
      </svg>
      {/* Mapa orbital (desktop): navegación real — NUNCA aria-hidden (lleva <a> reales). */}
      <nav class="hero__orbit" data-hero-orbit aria-label={uih.exploreSite}></nav>
    </div>
  </div>

  <div class="hero__dock">
    <Button href={hero.primary.href} variant="primary" size="lg">{hero.primary.label}</Button>
    <a class="hero__dock-link" href={hero.secondary.href}>{hero.secondary.label} →</a>
  </div>
</section>

<style>
  .hero {
    position: relative; overflow: clip;
    padding-top: calc(var(--nav-h) + var(--space-7)); padding-bottom: var(--space-9);
  }
  /* viñeta de la muestra: oro tenue + fondo oscuro inferior (da profundidad, no sobre-ilumina) */
  .hero::after {
    content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none;
    background:
      radial-gradient(78% 70% at 62% 48%, var(--accent-gold-dim), transparent 62%),
      radial-gradient(120% 90% at 50% 120%, rgba(0, 0, 0, 0.6), transparent 60%);
  }
  .hero__stars { position: absolute; inset: 0; z-index: -1; pointer-events: none; overflow: hidden; }
  .hero__inner { display: grid; grid-template-columns: 1fr; gap: var(--space-7); align-items: center; }

  .hero__headline { display: flex; flex-direction: column; align-items: flex-start; gap: var(--space-5); min-width: 0; text-align: left; }
  .hero__h1 { margin-top: var(--space-1); }
  .hero__h1 :global(em) { color: var(--accent-gold); font-style: normal; }
  .hero__sub { max-width: 50ch; }

  .hero__moons { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-top: var(--space-1); }
  .moon {
    display: inline-flex; align-items: center; gap: var(--space-2);
    min-height: var(--tap-min); padding: var(--space-2) var(--space-4); border-radius: var(--radius-pill);
    border: 1px solid var(--border); background: var(--bg-card);
    font-size: var(--text-sm); color: var(--fg-secondary);
    transition: border-color var(--duration-fast), color var(--duration-fast);
  }
  .moon__dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent-teal); flex: 0 0 auto; }
  .moon[data-accent="gold"] .moon__dot { background: var(--accent-gold); }
  .moon :global(.moon__icon), .moon :global(svg) { width: 16px; height: 16px; color: var(--accent-teal); flex: 0 0 auto; }
  .moon[data-accent="gold"] :global(svg) { color: var(--accent-gold); }
  .moon:hover { border-color: var(--border-accent); color: var(--fg-primary); }
  /* Los chips SSR solo se ocultan cuando el mapa ORBITAL está montado (desktop). */
  .hero--orbital .hero__moons { display: none; }

  /* ── escenario del planeta ─────────────────────────────── */
  .hero__stage { position: relative; width: 100%; max-width: 380px; aspect-ratio: 1 / 1; margin-inline: auto; will-change: transform; }
  .hero__svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; overflow: visible; }
  /* El mapa SIEMPRE por encima del SVG: nada tapa un enlace. */
  .hero__orbit { position: absolute; inset: 0; z-index: 4; }

  /* ── CTA dock — abajo, centro ──────────────────────────── */
  .hero__dock { display: flex; flex-direction: column; align-items: center; gap: var(--space-3); margin-top: var(--space-7); }
  .hero__dock-link {
    display: inline-flex; align-items: center; min-height: var(--tap-min);
    font-family: var(--font-mono); font-size: var(--text-sm); letter-spacing: var(--tracking-wide);
    color: var(--fg-secondary); transition: color var(--duration-fast);
  }
  .hero__dock-link:hover { color: var(--accent-gold); }

  /* ── ≥ lg: titular izq · planeta der · dock abajo-centro ── */
  @media (--lg) {
    .hero { padding-top: calc(var(--nav-h) + var(--space-8)); padding-bottom: var(--space-10); min-height: 92svh; }
    .hero__inner { grid-template-columns: 1.05fr 0.95fr; gap: var(--space-8); }
    .hero__stage { max-width: 440px; }
    .hero__dock { position: absolute; left: 50%; bottom: var(--space-7); transform: translateX(-50%); flex-direction: row; align-items: center; gap: var(--space-4); margin-top: 0; }
  }
</style>

<!-- Estilos de los cuerpos orbitales (inyectados por JS → is:global, bajo .hero__orbit) -->
<style is:global>
  .hero__orbit .hero-node {
    position: absolute; left: 0; top: 0; display: inline-flex; align-items: center; gap: 8px;
    min-height: var(--tap-min); padding: 7px 14px 7px 12px; border-radius: var(--radius-pill);
    white-space: nowrap; text-decoration: none;
    background: rgba(18, 18, 18, 0.85); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
    border: 1px solid var(--accent-gold-line); color: var(--fg-primary);
    font-family: var(--font-body); font-size: var(--text-sm); font-weight: 600; line-height: 1;
    box-shadow: 0 8px 26px rgba(0, 0, 0, 0.5);
    /* Clicable SIEMPRE: nace transparente solo durante la entrada escalonada. */
    pointer-events: auto; opacity: 0; will-change: transform;
    transition: opacity 0.45s var(--ease-out-expo), border-color var(--duration-fast),
                box-shadow var(--duration-fast), background var(--duration-fast);
  }
  .hero__orbit .hero-node.is-on { opacity: 1; }
  .hero__orbit .hero-node.teal { border-color: var(--accent-teal-line); }
  .hero__orbit .hero-node svg { width: 15px; height: 15px; color: var(--accent-gold); flex: 0 0 auto; }
  .hero__orbit .hero-node.teal svg { color: var(--accent-teal); }
  .hero__orbit .hero-node .moon__dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent-gold); flex: 0 0 auto; }
  .hero__orbit .hero-node.teal .moon__dot { background: var(--accent-teal); }
  .hero__orbit .hero-node:hover { border-color: var(--accent-gold); color: var(--fg-primary); box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6); }
  .hero__orbit .hero-node.teal:hover { border-color: var(--accent-teal); }
  .hero__orbit .hero-node:focus-visible { outline: 2px solid var(--accent-gold); outline-offset: 2px; }
  .hero__orbit .hero-node.teal:focus-visible { outline-color: var(--accent-teal); }
  .hero__orbit .hero-amb {
    position: absolute; left: 0; top: 0; width: 5px; height: 5px; border-radius: 50%;
    background: var(--accent-gold); box-shadow: 0 0 8px var(--accent-gold);
    opacity: 0; pointer-events: none; will-change: transform, opacity;
  }
</style>

<script>
  const hero = document.querySelector('[data-hero]') as HTMLElement | null;
  if (hero) {
    const stage = hero.querySelector('[data-hero-stage]') as HTMLElement;
    const orbit = hero.querySelector('[data-hero-orbit]') as HTMLElement;
    const moons = hero.querySelector('[data-hero-moons]') as HTMLElement;
    const starsEl = hero.querySelector('[data-hero-stars]') as HTMLElement;

    const mqFine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    const auto = () => !mqFine.matches || window.innerWidth < 1024; // táctil / apilado (<lg)

    // campo estelar sutil
    (function fillStars() {
      if (!starsEl || starsEl.childElementCount) return;
      const n = window.innerWidth < 768 ? 60 : 100;
      const frag = document.createDocumentFragment();
      for (let i = 0; i < n; i++) {
        const s = document.createElement('span');
        const sz = (i % 7) * 0.28 + 0.5;
        s.style.cssText = `position:absolute;border-radius:50%;background:var(--fg-primary);width:${sz}px;height:${sz}px;` +
          `top:${(i * 137) % 100}%;left:${(i * 53) % 100}%;opacity:.18;` +
          (mqReduce.matches ? '' : `animation:hstar ${2 + (i % 5)}s ease-in-out ${(i % 9) * 0.4}s infinite;`);
        frag.appendChild(s);
      }
      starsEl.appendChild(frag);
      if (!document.getElementById('hstar-kf')) {
        const st = document.createElement('style'); st.id = 'hstar-kf';
        st.textContent = '@keyframes hstar{0%,100%{opacity:.12}50%{opacity:.6}}';
        document.head.appendChild(st);
      }
    })();

    const ROLL = -18 * Math.PI / 180, COS = Math.cos(ROLL), SIN = Math.sin(ROLL), FLATTEN = 0.42;
    // Estaciones: carril único + balanceo acotado. Separación base = 2π/n ≫ 2·SWAY
    // → dos nodos NO pueden tocarse (garantía por construcción, no por tuning).
    const LANE = 0.94, SWAY = 0.052, START = -0.55;
    let bodies: any[] = [];
    let cx = 0, cy = 0, maxR = 0, isAuto = auto(), lastAuto = isAuto;
    let energy = 0, target = 0;
    const BASE = 0.35; // vida mínima sin hover (el hover energiza, no habilita)
    let tiltX = 0, tiltY = 0, tTiltX = 0, tTiltY = 0;
    let rafId = 0, last = 0, running = false;
    let ro: ResizeObserver | null = null;

    function measure() {
      const r = stage.getBoundingClientRect();
      cx = r.width / 2; cy = r.height / 2;
      maxR = Math.min(r.width, r.height) * 0.5;
    }
    function project(R: number, ang: number) {
      const ux = Math.cos(ang) * R, uy = Math.sin(ang) * R * FLATTEN;
      return { x: cx + (ux * COS - uy * SIN), y: cy + (ux * SIN + uy * COS), depth: Math.sin(ang) };
    }
    function build() {
      orbit.innerHTML = '';
      bodies = [];
      // Nodos-estación: SOLO en desktop (en táctil el mapa son los chips SSR).
      if (!isAuto) {
        const links = Array.from(moons.querySelectorAll('a'));
        const n = links.length;
        links.forEach((a, idx) => {
          const teal = a.getAttribute('data-accent') === 'teal';
          const el = document.createElement('a');
          el.className = 'hero-node' + (teal ? ' teal' : '');
          el.href = a.getAttribute('href') || '#';
          el.innerHTML = a.innerHTML; // conserva icono + etiqueta
          orbit.appendChild(el);
          bodies.push({
            el, node: true, R: LANE,
            base: START + (idx / n) * Math.PI * 2,
            w: 0.32 + 0.11 * (idx % 3), ph: idx * 1.7,
          });
          // entrada escalonada; después opacity queda en 1 para siempre
          window.setTimeout(() => el.classList.add('is-on'), 120 + 80 * idx);
        });
      }
      // Partículas ambientales (decorativas, no interactivas) — en todos los modos.
      const ambN = isAuto ? 3 : 5;
      for (let i = 0; i < ambN; i++) {
        const el = document.createElement('span');
        el.className = 'hero-amb';
        orbit.appendChild(el);
        bodies.push({ el, R: 0.5 + 0.5 * (i / ambN), ang: (i / ambN) * Math.PI * 2, speed: 0.07 + 0.025 * (i % 3), sz: 0.6 + 0.7 * ((i % 3) / 3) });
      }
    }
    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      energy += (target - energy) * Math.min(1, dt * 8);
      if (!isAuto) {
        tiltX += (tTiltX - tiltX) * Math.min(1, dt * 5);
        tiltY += (tTiltY - tiltY) * Math.min(1, dt * 5);
        stage.style.transform = `perspective(1200px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
      }
      const t = now / 1000;
      for (const b of bodies) {
        if (b.node) {
          // Estación fija + balanceo: posición estable, orden inmutable, clic seguro.
          const ang = b.base + SWAY * (0.55 + 0.45 * energy) * Math.sin(t * b.w + b.ph);
          const p = project(b.R * maxR, ang);
          const sc = 0.92 + 0.08 * ((p.depth + 1) / 2);
          b.el.style.transform = `translate(-50%,-50%) translate(${p.x}px,${p.y}px) scale(${sc})`;
        } else {
          b.ang += b.speed * dt * (0.4 + 1.2 * energy);
          const p = project(b.R * maxR, b.ang);
          const front = (p.depth + 1) / 2;
          b.el.style.transform = `translate(-50%,-50%) translate(${p.x}px,${p.y}px) scale(${b.sz})`;
          b.el.style.opacity = (Math.max(energy, 0.5) * (0.2 + 0.4 * front)).toFixed(3);
          b.el.style.zIndex = p.depth > 0 ? '3' : '0';
        }
      }
      rafId = requestAnimationFrame(frame);
    }

    const onEnter = () => { if (!isAuto) target = 1; };
    const onLeave = () => { if (!isAuto) target = BASE; };
    const onMove = (e: PointerEvent) => {
      if (isAuto) return;
      const hr = hero.getBoundingClientRect();
      tTiltY = ((e.clientX - hr.left) / hr.width - 0.5) * 6;
      tTiltX = -((e.clientY - hr.top) / hr.height - 0.5) * 4;
    };

    function enable() {
      if (running) return;
      running = true;
      isAuto = auto(); lastAuto = isAuto;
      // Solo desktop reemplaza los chips por el mapa orbital.
      hero.classList.toggle('hero--orbital', !isAuto);
      target = BASE; energy = BASE;
      measure(); build();
      hero.addEventListener('pointerenter', onEnter);
      hero.addEventListener('pointerleave', onLeave);
      hero.addEventListener('pointermove', onMove);
      ro = new ResizeObserver(() => measure());
      ro.observe(stage);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (running) measure(); });
      last = performance.now();
      rafId = requestAnimationFrame(frame);
    }
    function disable() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(rafId);
      hero.classList.remove('hero--orbital');
      orbit.innerHTML = '';
      stage.style.transform = '';
      hero.removeEventListener('pointerenter', onEnter);
      hero.removeEventListener('pointerleave', onLeave);
      hero.removeEventListener('pointermove', onMove);
      if (ro) { ro.disconnect(); ro = null; }
    }
    function sync() {
      if (mqReduce.matches) { disable(); return; } // reduced-motion → chips estáticos
      disable(); enable();
    }
    mqReduce.addEventListener('change', sync);
    mqFine.addEventListener('change', sync);
    // En resize NO reiniciamos (bug histórico del scroll móvil): solo re-medimos;
    // reconstruimos únicamente si cruza el umbral táctil↔desktop.
    let rt: number;
    window.addEventListener('resize', () => {
      clearTimeout(rt);
      rt = window.setTimeout(() => {
        if (auto() !== lastAuto) { sync(); } else { measure(); }
      }, 150);
    }, { passive: true });
    sync();
  }
</script>
```

## §4 · Detalles que NO cambiar al implementar

- El SVG del planeta, el campo estelar, el dock y el layout general quedan IDÉNTICOS.
- `data-accent` alterna oro/teal por índice — igual que hoy (con 5 nodos: 3 oro, 2 teal).
- La lógica resize (re-medir sin reconstruir salvo cruce de umbral) se conserva tal cual
  (arregló un bug real de scroll móvil).
- `uih.tapHint`/`uih.hoverHint` quedan sin uso — NO borrarlos de `ui.ts` en este cambio.
- `Math.random()` del `uid` ya existía (ids SVG por instancia) — se conserva.

## §5 · QA obligatorio (bloqueante)

1. `npm run build` verde (mismas páginas). `check:kb`/`test:chat` verdes (nada los toca).
2. **Desktop ≥1024 con mouse** (`/es/` y `/en/`):
   - Los 5 nodos están visibles y CLICABLES desde el load, SIN pasar el cursor.
   - Ningún par de nodos se toca en 60s de observación (balanceo ±3°).
   - Clic certero en cada nodo → aterriza en `/es/diagnostico`, `/es/herramientas`,
     `/es/precios`, `#proyectos`, `#servicios` (y espejos EN).
   - El clic funciona también donde un nodo se monta sobre el disco del planeta.
   - Hover: tilt + partículas se aceleran; al salir, vuelve a calma SIN esconder nodos.
   - Tab recorre los 5 nodos con foco visible; Enter navega.
3. **Móvil 375px táctil**: chips bajo el titular visibles y clicables SIEMPRE (sin
   compuerta de toque); el planeta solo muestra partículas; sin scroll-x 320→1440;
   ningún elemento cortado.
4. **Reduced-motion**: chips estáticos, cero animación.
5. **Ambos idiomas**: labels/hrefs correctos según §2 (nada de href ES en `/en/`).
6. Lighthouse móvil de la home no empeora (el loop rAF sigue barato; en calma solo
   mueve 5+5 elementos).

## §6 · Al terminar: registrar la doctrina en `DESIGN.md`

Añadir al final de la sección 8:

```markdown
### 8.6 Hero home — el planeta es MAPA DE CONVERSIÓN (2026-08-02)
Los nodos orbitales del hero son navegación real hacia el flujo de conversión
(diagnóstico gratis, calculadoras, precios, proyectos, servicios) — no decoración.
Reglas duras (dueño): (1) los nodos NUNCA se superponen entre sí → estaciones de
ángulo fijo en un solo carril, balanceo máx ±3°, separación 360°/n; (2) clicables
TODO el tiempo → visibles desde el load, pointer-events permanentes, z-index sobre
el SVG, sin capas interceptoras, tap-target ≥44px; (3) en táctil/<lg el mapa son
los chips SSR bajo el titular (los nodos orbitales no se montan); (4) el CTA
principal (#contacto) vive en el dock y no se duplica en el mapa. Cualquier cambio
futuro del hero debe conservar estas 4 reglas.
```

## §7 · Rollout

Rama `feat/hero-mapa` · commits:
- **A** `feat(hero): planeta = mapa de conversión (estaciones fijas, clic garantizado)` — §2+§3.
- **B** `docs(design): §8.6 reglas del mapa orbital` + ajustes de QA.
Merge a `main` + deploy + re-verificar §5.2-5.3 en prod. Reportar al chat de planificación.

## §8 · RESULTADO DE EJECUCIÓN (chat ejecutor, 2026-08-02) — ✅ LIVE EN PROD

Ejecutado AL PIE (sin reinterpretar §3). Commits A `c733334` + B `9df1b84`;
fast-forward a `main`; deploy Vercel `dpl_6kqyfchHRAtfgFG9SPDH4aoRzNTQ` (prod, READY).
Verificado en prod (`marcyanstudio.com/es` y `/en`): 5 nodos, hrefs por idioma sin
fuga ES↔EN, `.hero__hit` eliminado, `.hero__orbit` = `<nav aria-label>` sin
`aria-hidden`; en Chrome real desktop: 5 nodos clicables desde el load, `allSelfHit`,
0 solapamientos.

**QA §5 (bloqueante) — todo verde:** build 87 págs · check:kb · test:chat 185. Desktop
(ES+EN): 5 nodos visibles/clicables sin hover, cada destino aterriza (clics reales,
incl. sobre el disco), orden de tab = DOM con foco visible. Móvil 375px: chips SSR
siempre, 0 nodos orbitales, sin gate de toque, scroll-x=0 en 320→1440, nada cortado.
Reduced-motion: correcto en carga fresca. **No-superposición (regla dura):** medido
por simulación de ancho de stage → gap ≥15px al mínimo real (411px @1024px), solo
solapa <340px de stage (nunca ocurre). Nota de entorno: la pestaña de automatización
queda `visibilityState:hidden` → rAF throttleado (nodos "agrupados" en medición); se
resolvió midiendo tras forzar frame con screenshot. En navegador real de usuario (primer
plano) no ocurre.

**2 hallazgos MENORES (no bloqueantes, NO tocados por respetar §3 LOCKED — decisión del
chat de planificación):**
1. **a11y landmark duplicado/vacío:** en táctil/<lg (y no-JS) `.hero__orbit` queda como
   `<nav>` VACÍO con el mismo `aria-label` ("Explorar el sitio") que `.hero__moons`
   visible → dos landmarks del mismo nombre, uno vacío. En desktop no pasa (`.hero__moons`
   es `display:none`, sale del árbol a11y). Fix sugerido alineado con la intención del plan
   ("orbit es LA navegación EN DESKTOP"): que el orbit lleve el `aria-label`/rol de nav solo
   cuando está poblado (desktop) y no en móvil.
2. **reduced-motion en caliente:** `fillStars()` fija la animación en el estilo inline y solo
   mira `mqReduce` al cargar; el listener `change`→`sync()` no re-corre `fillStars` ni quita
   la animación de las estrellas. Togglear reduced-motion DESPUÉS de cargar deja el starfield
   animando. Carga fresca con reduced-motion ya activo = correcto (cero animación).
