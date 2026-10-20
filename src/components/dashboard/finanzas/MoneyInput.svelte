<script>
  // Campo de monto (FIN-04). Acepta "1500", "1,500", "1.500,00" o "$1,500.00"
  // y dice ANTES de guardar cómo lo entendió ("Se guardará $1,500.00"). Si no
  // se entiende, o es $0, o supera el tope (`max`, p. ej. el saldo), lo dice
  // junto al campo. `cents` sale ya calculado (null si no vale).
  import Field from '../ui/Field.svelte';
  import { parseMoney, formatUsd } from './fin.js';

  let {
    label = 'Monto (USD)', value = $bindable(''), cents = $bindable(null), required = true,
    max = null, maxLabel = 'el saldo pendiente', showErrors = false, id = '',
  } = $props();

  let touched = $state(false);
  const parsed = $derived(parseMoney(value));
  const problem = $derived.by(() => {
    if (!parsed.ok) return parsed.empty && !required ? '' : parsed.error;
    if (parsed.cents <= 0) return 'El monto debe ser mayor que $0.';
    if (max != null && parsed.cents > Number(max)) return `Supera ${maxLabel} (${formatUsd(max)}).`;
    return '';
  });
  $effect(() => { cents = parsed.ok && !problem ? parsed.cents : null; });
  // Un número bien escrito que pasa del tope se avisa al momento; un formato
  // a medias, al salir del campo (no se regaña mientras se teclea).
  const showProblem = $derived(!!problem && (touched || showErrors || (parsed.ok && parsed.cents > 0))
    && !(parsed.empty && !showErrors));
  const hint = $derived(parsed.ok && !problem ? `Se guardará ${formatUsd(parsed.cents)}` : 'Por ejemplo 1,500.00');
</script>

<Field {label} {id} {required} hint={showProblem ? '' : hint} error={showProblem ? problem : ''}>
  {#snippet children(f)}
    <input class="ui-input" id={f.id} type="text" inputmode="decimal" autocomplete="off"
      placeholder="1,500.00" aria-describedby={f.describedby} aria-invalid={f.invalid}
      bind:value onblur={() => (touched = true)} />
  {/snippet}
</Field>
