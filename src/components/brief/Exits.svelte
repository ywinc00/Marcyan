<script>
  // Salidas humanas (E-10): WhatsApp y llamada, siempre secundarias.
  import Btn from './Btn.svelte';
  import Ico from './Ico.svelte';
  import { strings } from './lib/strings.js';
  let { lang = 'es', phone = '+1 713-823-9144' } = $props();
  const t = $derived(strings(lang));
  const digits = $derived(String(phone).replace(/\D/g, ''));
</script>

<div class="exits">
  <Btn variant="secondary" size="md" href={`https://wa.me/${digits}`} track="whatsapp_clicked"><Ico name="message" size={16} />{t.whatsapp}</Btn>
  <Btn variant="secondary" size="md" href={`tel:+${digits}`} track="call_clicked"><Ico name="phone" size={16} />{t.call} {phone.replace(/^\+1\s*/, '')}</Btn>
</div>

<style>
  .exits { display: flex; flex-wrap: wrap; gap: var(--space-2); }
</style>
