<script>
  // Nueva propuesta desde la ficha de un contacto (Ventas §1). De 1 a 3 opciones (D-02):
  // cada una con un plan, un servicio o los dos, y una sola recomendada. Los precios salen
  // del catálogo interno (lista de la base, nunca el «desde»); el precio de un servicio se
  // puede subir si crece el alcance, nunca bajar del mínimo, y lo mensual no se toca.
  // Orbit no envía nada al cliente: «Guardar como enviada» apunta que ya se la mandaste.
  import Modal from '../ui/Modal.svelte';
  import { api } from '../lib/api.js';
  import { toast } from '../lib/toast.svelte.js';
  import { money } from './crm.js';

  // lead: el contacto; brief: el MRC-… de un brief sin contacto (migración 032).
  let { open = $bindable(false), lead = null, brief = null, onsaved } = $props();

  let catalog = $state(null);
  let catError = $state('');
  let options = $state([]);
  let rec = $state(0);
  let value = $state('');
  let busy = $state(false);
  let error = $state('');
  let field = $state('');
  const uid = 'prop-' + Math.random().toString(36).slice(2, 8);

  const blank = () => ({ plan: '', project: '', price: '' });
  $effect(() => {
    if (!open) return;
    options = [blank()]; rec = 0; value = ''; error = ''; field = '';
    if (!catalog) loadCatalog();
  });

  async function loadCatalog() {
    catError = '';
    try { catalog = (await api('/api/admin/proposals?view=catalog')).catalog; }
    catch (e) { catError = e?.message || 'No se pudo leer el catálogo de precios.'; }
  }

  const projectOf = (id) => catalog?.proyectos.find((p) => p.id === id) || null;
  const planOf = (id) => catalog?.planes.find((p) => p.id === id) || null;
  const toCents = (v) => { const n = Number(String(v).replace(/[$,\s]/g, '')); return Number.isFinite(n) && String(v).trim() !== '' ? Math.round(n * 100) : null; };
  function total(o) {
    const pj = projectOf(o.project);
    const p = pj ? (toCents(o.price) ?? pj.cents) : 0;
    const m = (planOf(o.plan)?.monthly_cents || 0) + (pj?.monthly_cents || 0);
    return { p, m, below: pj && toCents(o.price) != null && toCents(o.price) < pj.floor_cents };
  }
  const ready = $derived(options.length > 0 && options.every((o) => o.plan || o.project) && !options.some((o) => total(o).below));

  function addOption() { if (options.length < 3) options = [...options, blank()]; }
  function removeOption(i) {
    options = options.filter((_, k) => k !== i);
    if (rec >= options.length) rec = options.length - 1;
  }

  async function save(send) {
    if (!ready || busy) return;
    busy = true; error = ''; field = '';
    try {
      const body = {
        lead_ref: lead?.ref_id || null,
        brief_ref: brief || null,
        options: options.map((o) => ({
          plan: o.plan || null,
          projects: o.project ? [{ id: o.project, ...(toCents(o.price) != null ? { price_cents: toCents(o.price) } : {}) }] : [],
        })),
        recommended_option: options.length > 1 ? rec : 0,
        client_value_cents: toCents(value),
        send,
      };
      const j = await api('/api/admin/proposals', { method: 'POST', body });
      toast(send ? 'Propuesta guardada como enviada' : 'Propuesta guardada en borrador');
      open = false;
      onsaved?.(j);
    } catch (e) {
      error = e?.message || 'No se pudo guardar la propuesta.';
      field = e?.data?.field || e?.extra?.field || '';
    } finally { busy = false; }
  }
</script>

<Modal bind:open title="Nueva propuesta" size="lg">
  {#if catError}
    <p class="err" role="status">{catError} <button type="button" class="b b--mini" onclick={loadCatalog}>Reintentar</button></p>
  {:else if !catalog}
    <!-- svelte-ignore a11y_autofocus -->
    <p class="muted" role="status" tabindex="-1" autofocus>Cargando el catálogo…</p>
  {:else}
    <!-- svelte-ignore a11y_autofocus -->
    <p class="muted" tabindex="-1" autofocus>Hasta tres opciones, de la más completa a la de entrada. Precios del catálogo interno; lo mensual no se descuenta.</p>
    <ol class="opts">
      {#each options as o, i (i)}
        {@const t = total(o)}
        {@const pj = projectOf(o.project)}
        <li class="opt" class:opt--err={field.startsWith(`options.${i}`)}>
          <div class="opt__head">
            <span class="opt__n">Opción {i + 1}</span>
            {#if options.length > 1}
              <label class="rec"><input type="radio" name={uid + '-rec'} value={i} bind:group={rec} /> Recomendada</label>
              <button type="button" class="b b--mini b--ghost" onclick={() => removeOption(i)} aria-label={`Quitar la opción ${i + 1}`}>Quitar</button>
            {/if}
          </div>
          <div class="opt__row">
            <label class="ui-field">
              <span class="ui-field__label">Plan mensual</span>
              <select class="ui-input" bind:value={o.plan}>
                <option value="">Sin plan</option>
                {#each catalog.planes as p (p.id)}<option value={p.id}>{p.name} · {money(p.monthly_cents)}/mes</option>{/each}
              </select>
            </label>
            <label class="ui-field">
              <span class="ui-field__label">Proyecto</span>
              <select class="ui-input" bind:value={o.project}>
                <option value="">Sin proyecto</option>
                {#each catalog.proyectos as p (p.id)}<option value={p.id}>{p.name} · {p.from_price ? 'desde ' : ''}{money(p.cents)}</option>{/each}
              </select>
            </label>
            <label class="ui-field ui-field--price">
              <span class="ui-field__label">Precio real</span>
              <input class="ui-input" inputmode="decimal" autocomplete="off" bind:value={o.price} disabled={!pj}
                placeholder={pj ? money(pj.cents) : '—'} aria-describedby={pj ? `${uid}-min-${i}` : undefined} />
            </label>
          </div>
          <p class="opt__sum">
            {#if pj}<span id={`${uid}-min-${i}`} class:below={t.below}>Mínimo {money(pj.floor_cents)}.</span>{/if}
            <span>Queda en <b class="num">{t.p ? money(t.p) : '$0'}{t.m ? ` + ${money(t.m)}/mes` : ''}</b></span>
          </p>
        </li>
      {/each}
    </ol>
    {#if options.length < 3}<button type="button" class="b b--ghost add" onclick={addOption}>Añadir otra opción</button>{/if}
    <label class="ui-field value">
      <span class="ui-field__label">Cuánto le vale un cliente nuevo (opcional)</span>
      <input class="ui-input" inputmode="decimal" autocomplete="off" bind:value={value} placeholder="Por ejemplo, 120" />
      <span class="ui-field__hint">Para decirle con cuántos clientes nuevos al mes se paga el plan.</span>
    </label>
    {#if error}<p class="err" role="status">{error}</p>{/if}
  {/if}
  {#snippet footer()}
    <div class="pfoot">
      <button type="button" class="b" onclick={() => (open = false)} disabled={busy}>Cancelar</button>
      <button type="button" class="b" disabled={!ready || busy} onclick={() => save(false)}>Guardar borrador</button>
      <button type="button" class="b b--primary" disabled={!ready || busy} aria-busy={busy} onclick={() => save(true)}>{busy ? 'Guardando…' : 'Guardar como enviada'}</button>
    </div>
  {/snippet}
</Modal>

<style>
  .muted:focus { outline: none; } /* auditoria-ignorar: texto que solo recibe el foco inicial del diálogo, no es un control */
  .pfoot { display: flex; justify-content: flex-end; gap: var(--space-2); flex-wrap: wrap; width: 100%; }
  .muted { margin: 0; color: var(--fg-secondary); font-size: var(--dash-small); line-height: 1.5; }
  .err { margin: 0; color: var(--delta-down); font-size: var(--dash-small); display: flex; gap: var(--space-2); align-items: center; flex-wrap: wrap; }
  .opts { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--space-3); }
  .opt { border: 1px solid var(--border); border-radius: var(--radius-md); padding: var(--space-3) var(--space-4); background: var(--bg-elevated); display: flex; flex-direction: column; gap: var(--space-2); }
  .opt--err { border-color: var(--delta-down); }
  .opt__head { display: flex; align-items: center; gap: var(--space-3); min-height: 32px; }
  .opt__n { font-weight: 600; color: var(--fg-primary); margin-right: auto; }
  .rec { display: inline-flex; align-items: center; gap: var(--space-2); font-size: var(--dash-small); color: var(--fg-secondary); cursor: pointer; min-height: 32px; }
  .rec input { accent-color: var(--accent-gold); width: 16px; height: 16px; }
  .opt__row { display: grid; grid-template-columns: 1fr 1.3fr 140px; gap: var(--space-3); }
  .opt__sum { margin: 0; display: flex; gap: var(--space-3); flex-wrap: wrap; font-size: var(--dash-small); color: var(--fg-subtle); }
  .opt__sum b { color: var(--fg-primary); font-weight: 600; }
  .below { color: var(--delta-down); }
  .add { align-self: flex-start; }
  .value { max-width: 360px; }
  @media (max-width: 719px) {
    .opt__row { grid-template-columns: 1fr; }
    /* Teléfono: botones en columna, el principal arriba y a lo ancho. */
    .pfoot { flex-direction: column-reverse; }
    .pfoot .b { width: 100%; justify-content: center; min-height: 44px; }
  }
</style>
