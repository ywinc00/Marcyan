<script>
  // Estado del lead como píldora tintada editable (la de Orbit, ahora con un
  // color por estado, CRM-14). Cambia SIN recargar la lista (CRM-08): guarda
  // solo este lead, se bloquea mientras viaja la petición y, si falla, vuelve
  // al estado anterior con un aviso que dice por qué (SH-19).
  // "Convertido" de verdad = convertir en cliente o brief: si el lead aún no
  // tiene conversión, elegirlo abre la conversión (onconvert) en vez de
  // poner solo la etiqueta. Sin la migración 011 (crmReady=false) se guarda
  // como antes.
  import { api } from '../lib/api.js';
  import { toast, toastError } from '../lib/toast.svelte.js';
  import { LEAD_STATUSES, leadStatus } from './crm.js';

  let { lead, crmReady = true, onsaved, onconvert, label = '' } = $props();
  let saving = $state(false);
  let shown = $state('');
  $effect(() => { shown = lead?.status || 'new'; });

  const hasConversion = $derived(!!(lead?.converted_client_id || lead?.converted_brief_id));
  const tone = $derived(leadStatus(shown).tone);

  async function change(e) {
    const next = e.currentTarget.value;
    const prev = lead.status;
    if (next === prev) return;
    if (next === 'converted' && crmReady && !hasConversion && onconvert) {
      e.currentTarget.value = prev;
      shown = prev;
      onconvert(lead);
      return;
    }
    shown = next;
    saving = true;
    try {
      const j = await api('/api/admin/leads/' + encodeURIComponent(lead.ref_id), { method: 'PATCH', body: { status: next } });
      toast(`${lead.ref_id}: ${leadStatus(next).label}`);
      onsaved?.(j.lead || { ...lead, status: next });
    } catch (err) {
      shown = prev;
      toastError(err, 'No se pudo cambiar el estado. Inténtalo de nuevo.');
    } finally {
      saving = false;
    }
  }
</script>

<select class="st st--{tone}" value={shown} disabled={saving} aria-busy={saving}
  aria-label={label || ('Estado de ' + (lead?.name || lead?.email || lead?.ref_id))} onchange={change}>
  {#each LEAD_STATUSES as s (s.id)}<option value={s.id}>{s.label}</option>{/each}
</select>

<style>
  .st {
    --st: var(--fg-secondary);
    appearance: none; -webkit-appearance: none;
    min-height: 30px; min-width: 116px; padding: 5px 30px 5px 12px;
    border-radius: var(--radius-pill);
    color: var(--st);
    background-color: color-mix(in srgb, var(--st) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--st) 30%, transparent);
    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b8b95' stroke-width='2.2' stroke-linecap='round' stroke-linejoin='round'><path d='M6 9l6 6 6-6'/></svg>");
    background-repeat: no-repeat; background-position: right 11px center;
    font-family: var(--font-body); font-size: var(--dash-caption); font-weight: 600;
    cursor: pointer; transition: filter var(--duration-fast), opacity var(--duration-fast);
  }
  .st:hover:not(:disabled) { filter: brightness(1.12); }
  .st:disabled { opacity: .6; cursor: progress; }
  .st option { background: var(--bg-elevated); color: var(--fg-primary); }
  .st--accent  { --st: var(--accent-gold); }
  .st--info    { --st: var(--color-info); }
  .st--success { --st: var(--color-success); }
  .st--neutral { --st: var(--fg-secondary); background-color: var(--bg-elevated); border-color: var(--border-strong); }
  @media (pointer: coarse) { .st { min-height: var(--tap-min); padding-top: 8px; padding-bottom: 8px; } }
</style>
