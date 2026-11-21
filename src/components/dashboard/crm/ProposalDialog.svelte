<script>
  // Nueva propuesta desde la ficha de un contacto o de un brief (Ventas §1), o corregir un
  // borrador (el de Marcy, el del diagnóstico o uno tuyo) antes de enviarlo. De 1 a 3 opciones
  // (D-02): cada una con un plan, un servicio o los dos, y una sola recomendada. Los precios
  // salen del catálogo interno; el precio de un servicio se puede subir si crece el alcance,
  // nunca bajar del mínimo, y lo mensual no se toca. Un servicio que en el catálogo solo tiene
  // «desde» queda «por confirmar» hasta que se pone su precio real, y así no se puede enviar.
  // Orbit no envía nada al cliente: «Guardar como enviada» apunta que ya se la mandaste.
  import { untrack, tick } from 'svelte';
  import Modal from '../ui/Modal.svelte';
  import { api } from '../lib/api.js';
  import { toast } from '../lib/toast.svelte.js';
  import { money } from './crm.js';

  // lead: el contacto; brief: el MRC-… de un brief sin contacto (migración 032);
  // proposal: el borrador que se corrige (entonces lead y brief no hacen falta).
  let { open = $bindable(false), lead = null, brief = null, proposal = null, onsaved } = $props();

  let catalog = $state(null);
  let catError = $state('');
  let options = $state([]);
  let rec = $state(0);
  let value = $state('');
  let busy = $state(false);
  let error = $state('');
  let field = $state('');
  const uid = 'prop-' + Math.random().toString(36).slice(2, 8);
  const editing = $derived(!!proposal);

  // Una opción: su plan y su servicio principal (los dos desplegables), y lo que traía un
  // borrador de Marcy o del diagnóstico que el diálogo no elige: más servicios y añadidos.
  const blank = () => ({ plan: '', project: '', price: '', extra: [], addons: [], label: null });
  const projectOf = (id) => catalog?.proyectos.find((p) => p.id === id) || null;
  const planOf = (id) => catalog?.planes.find((p) => p.id === id) || null;
  const toCents = (v) => { const n = Number(String(v).replace(/[$,\s]/g, '')); return Number.isFinite(n) && String(v).trim() !== '' ? Math.round(n * 100) : null; };
  // El precio que se escribió en el borrador; vacío si es el de lista o si está por confirmar.
  function priceText(x) {
    if (!x || x.pending_price) return '';
    const pj = projectOf(x.id);
    return pj && !pj.from_price && x.cents === pj.cents ? '' : String(x.cents / 100);
  }
  function fromProposal(p) {
    return (p.options || []).map((o) => {
      const [first, ...rest] = o.projects || [];
      return {
        plan: o.plan?.id || '', project: first?.id || '', price: priceText(first),
        extra: rest.map((x) => ({ id: x.id, name: x.name, price: priceText(x) })),
        addons: (o.addons || []).map((a) => ({ id: a.id, name: a.name, monthly_cents: Number(a.monthly_cents) || 0 })),
        label: o.label || null,
      };
    });
  }

  $effect(() => {
    if (!open) return;
    error = ''; field = '';
    if (!catalog && !catError) loadCatalog();
  });
  // Con el catálogo a mano: en blanco o con lo que tenía el borrador.
  $effect(() => {
    if (!open || !catalog) return;
    const p = proposal;
    untrack(() => {
      options = p ? fromProposal(p) : [blank()];
      if (!options.length) options = [blank()];
      rec = p && p.recommended_option != null && p.recommended_option < options.length ? p.recommended_option : 0;
      value = p?.client_value_cents ? String(p.client_value_cents / 100) : '';
      focusAt = '';
      if (p) {
        outer: for (const [i, o] of options.entries()) {
          for (const [k, it] of [o.project ? { id: o.project, price: o.price } : null, ...o.extra].entries()) {
            if (it && lineOf(it.id, it.price).pending) { focusAt = `${i}-${k}`; break outer; }
          }
        }
      }
      // Después del foco de apertura del diálogo (que va al primer elemento con autofocus).
      if (focusAt) tick().then(() => requestAnimationFrame(() => optsEl?.querySelector('input.is-pending')?.focus()));
    });
  });

  async function loadCatalog() {
    catError = '';
    try { catalog = (await api('/api/admin/proposals?view=catalog')).catalog; }
    catch (e) { catError = e?.message || 'No se pudo leer el catálogo de precios.'; }
  }

  const itemsOf = (o) => [o.project ? { id: o.project, price: o.price } : null, ...o.extra].filter(Boolean);
  // Una línea de servicio: por debajo de su mínimo o por confirmar (solo tiene «desde» y no lleva precio).
  function lineOf(id, price) {
    const pj = projectOf(id);
    const c = toCents(price);
    return { pj, c, below: !!pj && c != null && c < pj.floor_cents, pending: !!pj && pj.from_price && c == null };
  }
  function total(o) {
    let p = 0;
    let m = (planOf(o.plan)?.monthly_cents || 0) + o.addons.reduce((s, a) => s + a.monthly_cents, 0);
    let below = false;
    const pending = [];
    for (const it of itemsOf(o)) {
      const l = lineOf(it.id, it.price);
      if (!l.pj) continue;
      p += l.c ?? l.pj.cents;
      m += l.pj.monthly_cents || 0;
      if (l.below) below = true;
      if (l.pending) pending.push(l.pj.name);
    }
    return { p, m, below, pending };
  }
  const ready = $derived(options.length > 0 && options.every((o) => o.plan || itemsOf(o).length) && !options.some((o) => total(o).below));
  const pendingNames = $derived(options.flatMap((o) => total(o).pending));
  // Por qué un botón está apagado, a la vista junto a los botones (no al final del formulario).
  const hold = $derived(!catalog ? '' : [
    options.some((o) => !o.plan && !itemsOf(o).length) ? 'Cada opción lleva un plan, un proyecto o los dos.' : '',
    options.some((o) => total(o).below) ? 'Hay un precio por debajo de su mínimo.' : '',
    pendingNames.length ? `Para enviarla falta el precio real de ${pendingNames.map((n) => `«${n}»`).join(', ')}. Mientras, se guarda como borrador.` : '',
  ].filter(Boolean).join(' '));
  // Al corregir un borrador con un precio por confirmar, el foco va a ese campo.
  let focusAt = $state('');
  let optsEl = $state(null);

  function addOption() { if (options.length < 3) options = [...options, blank()]; }
  function removeOption(i) {
    options = options.filter((_, k) => k !== i);
    if (rec >= options.length) rec = options.length - 1;
  }

  async function save(send) {
    if (!ready || busy || (send && pendingNames.length)) return;
    busy = true; error = ''; field = '';
    let saved = false;
    try {
      const opts = options.map((o) => ({
        ...(o.label ? { label: o.label } : {}),
        plan: o.plan || null,
        projects: itemsOf(o).map((it) => ({ id: it.id, ...(toCents(it.price) != null ? { price_cents: toCents(it.price) } : {}) })),
        ...(o.addons.length ? { addons: o.addons.map((a) => a.id) } : {}),
      }));
      const recommended = options.length > 1 ? rec : 0;
      let j;
      if (editing) {
        const path = '/api/admin/proposals/' + encodeURIComponent(proposal.ref_id);
        j = await api(path, { method: 'PATCH', body: { action: 'edit', options: opts, recommended_option: recommended, client_value_cents: toCents(value) } });
        saved = true;
        if (send) j = await api(path, { method: 'PATCH', body: { action: 'send' } });
        toast(send ? 'Propuesta guardada como enviada' : 'Borrador corregido');
      } else {
        j = await api('/api/admin/proposals', { method: 'POST', body: {
          lead_ref: lead?.ref_id || null, brief_ref: brief || null,
          options: opts, recommended_option: recommended, client_value_cents: toCents(value), send,
        } });
        toast(send ? 'Propuesta guardada como enviada' : 'Propuesta guardada en borrador');
      }
      open = false;
      onsaved?.(j);
    } catch (e) {
      error = saved ? `Los cambios quedaron guardados, pero no se pudo marcar como enviada. ${e?.message || 'Inténtalo de nuevo.'}` : (e?.message || 'No se pudo guardar la propuesta.');
      field = e?.data?.field || e?.extra?.field || '';
      if (saved) onsaved?.();
    } finally { busy = false; }
  }
</script>

<Modal bind:open title={editing ? 'Corregir el borrador' : 'Nueva propuesta'} size="lg">
  {#if catError}
    <p class="err" role="status">{catError} <button type="button" class="b b--mini" onclick={loadCatalog}>Reintentar</button></p>
  {:else if !catalog}
    <!-- svelte-ignore a11y_autofocus -->
    <p class="muted" role="status" tabindex="-1" autofocus>Cargando el catálogo…</p>
  {:else}
    <!-- svelte-ignore a11y_autofocus -->
    <p class="muted" tabindex="-1" autofocus>{editing
      ? 'Corrige lo que haga falta antes de enviarla. Se recalcula con los precios de hoy del catálogo; lo mensual no se descuenta.'
      : 'Hasta tres opciones, de la más completa a la de entrada. Precios del catálogo interno; lo mensual no se descuenta.'}</p>
    <ol class="opts" bind:this={optsEl}>
      {#each options as o, i (i)}
        {@const t = total(o)}
        {@const pj = projectOf(o.project)}
        {@const main = lineOf(o.project, o.price)}
        <li class="opt" class:opt--err={field.startsWith(`options.${i}`)}>
          <div class="opt__head">
            <span class="opt__n">Opción {i + 1}</span>
            {#if options.length > 1}
              <label class="rec"><input type="radio" name={uid + '-rec'} value={i} bind:group={rec} /> Recomendada</label>
              <button type="button" class="b b--mini b--ghost" onclick={() => removeOption(i)} aria-label={`Quitar la opción ${i + 1}`}>Quitar opción</button>
            {/if}
          </div>
          <div class="opt__row">
            <label class="ui-field">
              <span class="ui-field__label">Plan mensual</span>
              <select class="ui-input" bind:value={o.plan}>
                <option value="">Sin plan</option>
                {#each catalog.planes as p (p.id)}<option value={p.id}>{p.name} · {money(p.monthly_cents)}</option>{/each}
              </select>
            </label>
            <label class="ui-field">
              <span class="ui-field__label">Proyecto</span>
              <select class="ui-input" bind:value={o.project}>
                <option value="">Sin proyecto</option>
                {#each catalog.proyectos as p (p.id)}<option value={p.id}>{p.from_price ? 'desde ' : ''}{money(p.cents)} · {p.name}</option>{/each}
              </select>
            </label>
            <label class="ui-field ui-field--price">
              <span class="ui-field__label">Precio real</span>
              <input class="ui-input" class:is-pending={main.pending} class:is-below={main.below} inputmode="decimal" autocomplete="off" bind:value={o.price} disabled={!pj}
                placeholder={pj ? (pj.from_price ? 'por confirmar' : money(pj.cents)) : '—'}
                aria-invalid={main.below || undefined}
                aria-describedby={pj ? [`${uid}-min-${i}`, main.pending ? `${uid}-hold` : ''].filter(Boolean).join(' ') : undefined} />
            </label>
          </div>
          {#each o.extra as x, k (x.id)}
            {@const xl = lineOf(x.id, x.price)}
            {@const xp = xl.pj}
            <div class="extra">
              <span class="extra__name">
                <span>+ {x.name}{xp ? ` · ${xp.from_price ? 'desde ' : ''}${money(xp.cents)}${xp.monthly_cents ? ` + ${money(xp.monthly_cents)}/mes` : ''}` : ''}{#if xl.below}<span class="below" id={`${uid}-min-${i}-${k}`}>{` · no baja de ${money(xp.floor_cents)}`}</span>{/if}</span>
                <button type="button" class="b b--mini b--ghost" onclick={() => (o.extra = o.extra.filter((_, n) => n !== k))} aria-label={`Quitar ${x.name} de la opción ${i + 1}`}>Quitar</button>
              </span>
              <input class="ui-input" class:is-pending={xl.pending} class:is-below={xl.below} inputmode="decimal" autocomplete="off" bind:value={x.price}
                placeholder={xp?.from_price ? 'por confirmar' : xp ? money(xp.cents) : ''} aria-label={`Precio real de ${x.name}`}
                aria-invalid={xl.below || undefined}
                aria-describedby={[xl.below ? `${uid}-min-${i}-${k}` : '', xl.pending ? `${uid}-hold` : ''].filter(Boolean).join(' ') || undefined} />
            </div>
          {/each}
          {#each o.addons as a (a.id)}
            <div class="extra">
              <span class="extra__name">
                <span>+ {a.name} · {money(a.monthly_cents)}/mes</span>
                <button type="button" class="b b--mini b--ghost" onclick={() => (o.addons = o.addons.filter((y) => y.id !== a.id))} aria-label={`Quitar ${a.name} de la opción ${i + 1}`}>Quitar</button>
              </span>
            </div>
          {/each}
          <p class="opt__sum">
            {#if pj}<span id={`${uid}-min-${i}`} class:below={main.below}>Mínimo {money(pj.floor_cents)}.</span>{/if}
            <span>Queda en <b class="num">{t.pending.length ? 'desde ' : ''}{t.p ? money(t.p) : '$0'}{t.m ? ` + ${money(t.m)}/mes` : ''}</b></span>
          </p>
        </li>
      {/each}
    </ol>
    {#if options.length < 3}<button type="button" class="b b--ghost add" onclick={addOption}>Añadir otra opción</button>{/if}
    <label class="ui-field value">
      <span class="ui-field__label">Cuánto le vale un cliente nuevo (opcional)</span>
      <input class="ui-input" inputmode="decimal" autocomplete="off" bind:value={value} placeholder="Por ejemplo, 120" />
      <span class="ui-field__hint">Para decirle con cuántos clientes nuevos al mes se paga el plan.</span>
    </label>
  {/if}
  {#snippet footer()}
    <div class="pfoot">
      <p class="hold" class:hold--err={!!error} id={`${uid}-hold`} role="status">{error || hold}</p>
      <button type="button" class="b" onclick={() => (open = false)} disabled={busy}>Cancelar</button>
      <button type="button" class="b" disabled={!ready || busy} onclick={() => save(false)}>{editing ? 'Guardar cambios' : 'Guardar borrador'}</button>
      <button type="button" class="b b--primary" disabled={!ready || busy || pendingNames.length > 0} aria-busy={busy} onclick={() => save(true)}>{busy ? 'Guardando…' : 'Guardar como enviada'}</button>
    </div>
  {/snippet}
</Modal>

<style>
  .muted:focus { outline: none; } /* auditoria-ignorar: texto que solo recibe el foco inicial del diálogo, no es un control */
  .pfoot { display: flex; justify-content: flex-end; align-items: center; gap: var(--space-2); flex-wrap: wrap; width: 100%; }
  .muted { margin: 0; color: var(--fg-secondary); font-size: var(--dash-small); line-height: 1.5; }
  .err { margin: 0; color: var(--delta-down); font-size: var(--dash-small); display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap; }
  .hold { margin: 0 auto 0 0; flex: 1 1 240px; color: var(--fg-secondary); font-size: var(--dash-small); line-height: 1.45; }
  .hold:empty { display: none; }
  /* El campo que falta: borde ámbar (por confirmar) o rojo (por debajo del mínimo). */
  .ui-input.is-pending { border-color: var(--color-warning); }
  .ui-input.is-below { border-color: var(--delta-down); }
  .hold--err { color: var(--delta-down); }
  /* Alto contraste: sin color, el campo que falta se distingue por el trazo. */
  @media (forced-colors: active) { .ui-input.is-pending, .ui-input.is-below { border: 2px dashed CanvasText; } }
  .opts { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-3); }
  .opt { border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-3) var(--space-4); background: var(--bg-elevated); display: flex; flex-direction: column; gap: var(--space-2); }
  .opt--err { border-color: var(--delta-down); }
  .opt__head { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); min-height: 32px; }
  .opt__n { font-weight: 600; color: var(--fg-primary); margin-right: auto; white-space: nowrap; }
  /* Pantalla estrecha: «Opción N» y «Quitar opción» en la primera línea; «Recomendada» debajo. */
  @media (max-width: 479px) { .rec { order: 3; flex-basis: 100%; } }
  .rec { display: inline-flex; align-items: center; gap: var(--space-2); font-size: var(--dash-small); color: var(--fg-secondary); cursor: pointer; min-height: 32px; }
  .rec input { accent-color: var(--accent-gold); width: 16px; height: 16px; }
  .opt__row { display: grid; grid-template-columns: minmax(172px, .8fr) 1.7fr 128px; gap: var(--space-3); }
  /* Lo que traía el borrador además del plan y el proyecto: una línea cada cosa, con su precio
     en la misma columna que el «Precio real» de arriba. */
  .extra { display: grid; grid-template-columns: minmax(172px, .8fr) 1.7fr 128px; gap: var(--space-3); align-items: center; min-height: 40px; }
  .extra__name { grid-column: 1 / 3; display: flex; align-items: center; justify-content: space-between; gap: var(--space-3);
    font-size: var(--dash-small); color: var(--fg-secondary); min-width: 0; }
  .opt__sum { margin: 0; display: flex; gap: var(--space-3); flex-wrap: wrap; font-size: var(--dash-small); color: var(--fg-subtle); }
  .opt__sum b { color: var(--fg-primary); font-weight: 600; }
  .below { color: var(--delta-down); }
  .add { align-self: flex-start; }
  .value { max-width: 360px; }
  @media (max-width: 719px) {
    .opt__row, .extra { grid-template-columns: 1fr; }
    .extra__name { grid-column: auto; }
    /* Teléfono: la razón y el principal arriba y a lo ancho; debajo, guardar y cancelar en una fila. */
    .pfoot { display: grid; grid-template-columns: 1fr 1fr; }
    .pfoot .hold { grid-column: 1 / -1; order: -2; margin: 0; }
    .pfoot .b--primary { grid-column: 1 / -1; order: -1; }
    .pfoot .b { width: 100%; justify-content: center; min-height: 44px; }
  }
</style>
