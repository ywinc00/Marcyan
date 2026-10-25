<script>
  // Enviar al cliente el enlace del "Kit de arranque" (segundo momento del
  // brief, decisión del dueño 2026-10-19). Dos salidas: mandarlo por correo
  // o solo crear el enlace para copiarlo (WhatsApp, SMS). El enlace se ve
  // UNA vez: en la base solo queda su huella.
  // Desde la ficha de un cliente SIN brief (prop `client`): el mismo diálogo
  // crea antes su brief con los datos de la ficha y avisa de ello.
  import { untrack } from 'svelte';
  import Modal from '../ui/Modal.svelte';
  import Field from '../ui/Field.svelte';
  import Icon from '../ui/Icon.svelte';
  import { api } from '../lib/api.js';
  import { toast } from '../lib/toast.svelte.js';
  import { LANG_LABEL } from './brief-panel.js';

  let { open = $bindable(false), pid = '', client = null, email = '', lang = 'es', kit = null, onissued } = $props();

  let chosenLang = $state('es');
  let reopen = $state(false);
  let busy = $state('');          // 'email' | 'link' | ''
  let error = $state('');
  let result = $state(null);      // { url, emailSent, emailError, kitStatus, lang }
  let copied = $state(false);

  const submitted = $derived(kit?.id === 'submitted');
  const alreadySent = $derived(kit?.id === 'sent' || kit?.id === 'in_progress');
  const canEmail = $derived(!!String(email || '').trim());
  const endpoint = $derived(client
    ? '/api/admin/clients/' + encodeURIComponent(client.id) + '/kit-link'
    : '/api/admin/briefs/' + encodeURIComponent(pid) + '/kit-link');

  $effect(() => {
    if (open) untrack(() => { chosenLang = lang === 'en' ? 'en' : 'es'; reopen = false; busy = ''; error = ''; result = null; copied = false; });
  });

  async function issue(sendEmail) {
    if (busy) return;
    if (submitted && !reopen) { error = 'Marca la casilla para reabrir el kit antes de crear un enlace nuevo.'; return; }
    busy = sendEmail ? 'email' : 'link'; error = '';
    try {
      const j = await api(endpoint, {
        method: 'POST', body: { sendEmail, lang: chosenLang, reopen: submitted && reopen },
      });
      result = j;
      onissued?.(j);
      if (j.emailSent) toast('Kit de arranque enviado al cliente');
    } catch (e) { error = e.message; }
    finally { busy = ''; }
  }

  async function copy() {
    if (!result?.url) return;
    try {
      await navigator.clipboard.writeText(result.url);
      copied = true;
      toast('Enlace copiado');
    } catch (_) {
      copied = false;
      error = 'No se pudo copiar automáticamente. Selecciona el enlace y cópialo a mano.';
    }
  }
</script>

<Modal bind:open title="Enviar kit de arranque al cliente">
  {#if !result}
    <p class="lead">El cliente recibe un enlace privado, sin cuenta, para completar lo que hace falta para arrancar: datos legales, horarios, marca, fotos por tomas y accesos.</p>
    {#if client}
      <p class="hint">Como aún no tiene brief, se le crea uno con los datos de su ficha. Lo que falte se lo pregunta el propio kit, sin que sea obligatorio.</p>
    {/if}
    {#if alreadySent}
      <p class="warn" role="note"><Icon name="alert" size={16} />Ya hay un enlace enviado. Crear uno nuevo anula el anterior; lo que el cliente ya guardó se conserva.</p>
    {/if}
    {#if submitted}
      <label class="reopen"><input type="checkbox" bind:checked={reopen} />
        <span>El cliente ya lo envió. <strong>Reabrirlo</strong> para que pueda corregir o añadir algo.</span></label>
    {/if}
    <Field label="Idioma del enlace y del correo">
      {#snippet children(f)}
        <select class="ui-input" id={f.id} bind:value={chosenLang}>
          <option value="es">{LANG_LABEL.es}</option>
          <option value="en">{LANG_LABEL.en}</option>
        </select>
      {/snippet}
    </Field>
    {#if !canEmail}<p class="hint">{client ? 'Este cliente no tiene correo en su ficha' : 'Este brief no tiene correo'}: crea el enlace y envíalo por WhatsApp o mensaje.</p>{/if}
    {#if error}<p class="err" role="alert">{error}</p>{/if}
  {:else}
    {#if result.emailSent}
      <p class="ok"><Icon name="check" size={16} />Enviado a {email}. Si lo prefieres, también puedes mandar el enlace por otro medio.</p>
    {:else if result.emailError}
      <p class="warn" role="alert"><Icon name="alert" size={16} />{result.emailError}</p>
    {:else}
      <p class="lead">Enlace creado. Cópialo y envíaselo al cliente; solo se muestra ahora.</p>
    {/if}
    <label class="ui-field">
      <span class="ui-field__label">Enlace del kit</span>
      <input class="ui-input url" readonly value={result.url} onfocus={(e) => e.currentTarget.select()} />
    </label>
    {#if client && result.projectId}
      <p class="hint">Se creó el brief {result.projectId} con los datos de la ficha. Desde ahí puedes reenviar el enlace más adelante.</p>
    {/if}
    {#if error}<p class="err" role="alert">{error}</p>{/if}
  {/if}

  {#snippet footer()}
    {#if !result}
      <button type="button" class="b" onclick={() => (open = false)} disabled={!!busy}>Cancelar</button>
      <button type="button" class="b" onclick={() => issue(false)} disabled={!!busy}>
        <Icon name="link" size={16} />{busy === 'link' ? 'Creando…' : 'Solo crear enlace'}
      </button>
      <button type="button" class="b b--primary" onclick={() => issue(true)} disabled={!!busy || !canEmail}>
        <Icon name="send" size={16} />{busy === 'email' ? 'Enviando…' : 'Enviar por correo'}
      </button>
    {:else}
      <button type="button" class="b" onclick={() => (open = false)}>Cerrar</button>
      <button type="button" class="b b--primary" onclick={copy}><Icon name={copied ? 'check' : 'copy'} size={16} />{copied ? 'Copiado' : 'Copiar enlace'}</button>
    {/if}
  {/snippet}
</Modal>

<style>
  .lead, .hint { margin: 0; font-size: var(--dash-body); color: var(--fg-secondary); line-height: 1.55; }
  .hint { font-size: var(--dash-small); color: var(--fg-subtle); }
  .warn, .ok { display: flex; gap: 8px; align-items: flex-start; margin: 0; padding: 10px 12px; border-radius: var(--radius-md); font-size: var(--dash-small); line-height: 1.45; color: var(--fg-secondary); }
  .warn { background: color-mix(in srgb, var(--color-warning) 9%, transparent); border: 1px solid color-mix(in srgb, var(--color-warning) 28%, transparent); }
  .warn :global(.ui-icon) { color: var(--color-warning); flex: 0 0 auto; margin-top: 1px; }
  .ok { background: var(--accent-teal-dim); border: 1px solid var(--accent-teal-line); color: var(--fg-primary); }
  .ok :global(.ui-icon) { color: var(--accent-teal); flex: 0 0 auto; margin-top: 1px; }
  .reopen { display: flex; gap: 10px; align-items: flex-start; font-size: var(--dash-small); color: var(--fg-secondary); line-height: 1.45; cursor: pointer; }
  .reopen input { width: 18px; height: 18px; margin-top: 1px; accent-color: var(--accent-gold); flex: 0 0 auto; }
  .err { margin: 0; font-size: var(--dash-small); color: var(--color-error); }
  .url { font-family: var(--font-mono); font-size: var(--dash-small); }
</style>
