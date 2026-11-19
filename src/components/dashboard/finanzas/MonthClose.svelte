<script>
  // Cierre de un mes, dentro de su fila del libro del año (portada A, con la
  // lista de comprobaciones de la dirección B). Cada comprobación dice si
  // bloquea o solo avisa y lleva su arreglo en la misma fila. Cerrar deja el
  // mes fijo para los impuestos; reabrir pide confirmación.
  import Icon from '../ui/Icon.svelte';
  import ConfirmDialog from '../ui/ConfirmDialog.svelte';
  import ErrorState from '../ui/ErrorState.svelte';
  import LoadingState from '../ui/LoadingState.svelte';
  import { api, errorMessage, isSessionError } from '../lib/api.js';
  import { href } from '../lib/router.svelte.js';
  import { fmtDay } from '../lib/dates.js';
  import { monthLong } from './fin.js';

  // blocking: cuántas cosas bloquean el cierre (la página del mes lo enseña arriba).
  let { month, onchanged, blocking = $bindable(null) } = $props();

  let checklist = $state(null);
  let error = $state('');
  let busy = $state(false);
  let actionError = $state('');
  let confirmClose = $state(false);
  let confirmReopen = $state(false);

  const monthName = $derived(monthLong(month).split(' ')[0]);
  const blockers = $derived(checklist ? checklist.items.filter((i) => i.blocking && i.count > 0) : []);
  const warnings = $derived(checklist ? checklist.items.filter((i) => !i.blocking && i.count > 0) : []);
  const passing = $derived(checklist ? checklist.items.filter((i) => i.count === 0) : []);
  $effect(() => { blocking = checklist && checklist.status !== 'closed' ? blockers.length : null; });

  // Texto llano de cada comprobación (lo que ve el dueño) y su arreglo.
  const TEXT = {
    pending: (n) => `${n} movimiento${n === 1 ? '' : 's'} importado${n === 1 ? '' : 's'} sin revisar`,
    uncategorized: (n) => `${n} gasto${n === 1 ? '' : 's'} sin categoría`,
    duplicates: (n) => `${n} posible${n === 1 ? '' : 's'} gasto${n === 1 ? '' : 's'} repetido${n === 1 ? '' : 's'} (mismo importe y proveedor en 5 días)`,
    sub_overlap: (n) => `${n} gasto${n === 1 ? '' : 's'} apuntado${n === 1 ? '' : 's'} a mano que ya registra una suscripción`,
    receipts: (n) => `${n} gasto${n === 1 ? '' : 's'} de $75 o más sin recibo`,
    void_paid: (n) => `${n} factura${n === 1 ? '' : 's'} anulada${n === 1 ? '' : 's'} con dinero sin devolver`,
    no_account: (n) => `${n} cobro${n === 1 ? '' : 's'} sin decir por dónde entró`,
  };
  const OK_TEXT = {
    pending: 'Todo lo importado está revisado',
    uncategorized: 'Cada gasto tiene su categoría',
    duplicates: 'Ningún gasto repetido',
    sub_overlap: 'Ninguna suscripción apuntada dos veces',
    receipts: 'Los gastos de $75 o más tienen recibo',
    void_paid: 'Ninguna factura anulada con dinero sin devolver',
    no_account: 'Cada cobro dice por dónde entró',
  };
  function fix(item) {
    const q = { mes: month };
    if (item.key === 'pending' || item.key === 'uncategorized') return { label: 'Revisar', url: href('finanzas', ['movimientos'], { ...q, ver: 'pendientes' }) };
    if (item.key === 'duplicates' || item.key === 'sub_overlap') return { label: 'Elegir uno', url: href('finanzas', ['movimientos'], q) };
    if (item.key === 'receipts') return { label: 'Subir recibos', url: href('finanzas', ['movimientos'], { ...q, ver: 'sin-recibo' }) };
    if (item.key === 'void_paid') return { label: 'Ver facturas', url: href('finanzas', ['facturas'], { estado: 'anulada' }) };
    return null;
  }

  async function load() {
    error = '';
    try { checklist = (await api(`/api/admin/finance/books?view=close&month=${encodeURIComponent(month)}`)).checklist; }
    catch (e) { if (!isSessionError(e)) error = errorMessage(e, 'No se pudo cargar el cierre del mes.'); }
  }
  $effect(() => { month; load(); });

  async function run(action) {
    busy = true; actionError = '';
    try {
      checklist = (await api('/api/admin/finance/books', { method: 'POST', body: { action, month } })).checklist;
      confirmClose = false; confirmReopen = false;
      onchanged?.();
    } catch (e) {
      if (!isSessionError(e)) actionError = errorMessage(e, action === 'close' ? 'No se pudo cerrar el mes.' : 'No se pudo reabrir el mes.');
    } finally { busy = false; }
  }
</script>

<div class="mc">
  {#if error}
    <ErrorState compact title="No se pudo cargar el cierre" message={error} onretry={load} />
  {:else}
    <LoadingState loading={!checklist} rows={4} height={44} gap={1} label="Cargando el cierre del mes">
      {#if checklist}
        {#if checklist.status === 'closed'}
          <div class="mc-row">
            <span class="mc-ic mc-ic--mute"><Icon name="lock" size={18} /></span>
            <span class="mc-txt">{monthName.charAt(0).toUpperCase() + monthName.slice(1)} está cerrado{#if checklist.closed_at}{' '}desde el {fmtDay(checklist.closed_at)}{/if}. Sus cifras ya no cambian.</span>
            <button type="button" class="b b--ghost b--mini" onclick={() => (confirmReopen = true)}>Reabrir</button>
          </div>
        {:else}
          {#each blockers as it (it.key)}
            {@const f = fix(it)}
            <div class="mc-row">
              <span class="mc-ic mc-ic--err"><Icon name="close" size={16} /></span>
              <span class="mc-txt"><b>{TEXT[it.key](it.count)}</b> <span class="mc-why">(bloquea el cierre)</span></span>
              {#if f}<a class="b b--mini" href={f.url}>{f.label}</a>{/if}
            </div>
          {/each}
          {#each warnings as it (it.key)}
            {@const f = fix(it)}
            <div class="mc-row">
              <span class="mc-ic mc-ic--warn"><Icon name="alert" size={16} /></span>
              <span class="mc-txt">{TEXT[it.key](it.count)} <span class="mc-why">(no bloquea)</span></span>
              {#if f}<a class="b b--mini" href={f.url}>{f.label}</a>{/if}
            </div>
          {/each}
          {#each passing as it (it.key)}
            <div class="mc-row mc-row--ok">
              <span class="mc-ic mc-ic--ok"><Icon name="check" size={16} /></span>
              <span class="mc-txt">{OK_TEXT[it.key]}</span>
            </div>
          {/each}
          <div class="mc-foot">
            <span class="mc-why">Al cerrarlo, las cifras de {monthName} quedan fijas y cuentan para los impuestos.</span>
            {#if checklist.can_close}
              <button type="button" class="b b--mini" onclick={() => (confirmClose = true)} disabled={busy}>Cerrar {monthName}</button>
            {:else}
              <span class="mc-left">Falta{blockers.length === 1 ? '' : 'n'} {blockers.length} para cerrar</span>
            {/if}
          </div>
        {/if}
        {#if actionError}<p class="mc-err" role="status">{actionError}</p>{/if}
      {/if}
    </LoadingState>
  {/if}
</div>

<ConfirmDialog bind:open={confirmClose} title={`Cerrar ${monthName}`} danger={false} confirmLabel={`Cerrar ${monthName}`} {busy}
  message={`Las cifras de ${monthName} quedan fijas y cuentan para los impuestos. Si luego hay que cambiar algo, se puede reabrir.`}
  onconfirm={() => run('close')} />
<ConfirmDialog bind:open={confirmReopen} title={`Reabrir ${monthName}`} danger={false} confirmLabel="Reabrir" {busy}
  message={`Al reabrirlo, las cifras de ${monthName} pueden cambiar. Lo que ya llevaste al contador podría no coincidir.`}
  onconfirm={() => run('reopen')} />

<style>
  .mc { border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--bg-card); overflow: hidden; }
  .mc-row { display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-top: 1px solid var(--border-subtle); min-height: 48px; }
  .mc-row:first-child { border-top: 0; }
  .mc-row--ok { color: var(--fg-secondary); }
  .mc-ic { flex: 0 0 auto; display: inline-flex; width: 22px; height: 22px; align-items: center; justify-content: center; border-radius: 50%; }
  .mc-ic--err { color: var(--color-error); border: 1.6px solid currentColor; }
  .mc-ic--warn { color: var(--color-warning); }
  .mc-ic--ok { color: var(--color-success); }
  .mc-ic--mute { color: var(--fg-subtle); }
  .mc-txt { flex: 1; min-width: 0; color: var(--fg-primary); }
  .mc-row--ok .mc-txt { color: var(--fg-secondary); }
  .mc-txt b { font-weight: 600; }
  .mc-why { color: var(--fg-subtle); font-size: var(--dash-small); }
  .mc-foot { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; justify-content: space-between; padding: 10px 14px; border-top: 1px solid var(--border-subtle); }
  .mc-left { font: 600 var(--dash-caption)/1.2 var(--font-body); color: var(--fg-subtle); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 7px 10px; }
  .mc-err { margin: 0; padding: 0 14px 12px; color: var(--color-error); font-size: var(--dash-small); }
  @media (pointer: coarse) { .mc-row .b, .mc-foot .b { min-height: 44px; } }
</style>
