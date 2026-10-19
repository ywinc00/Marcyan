<script>
  // ─────────────────────────────────────────────────────────────
  // Clientes (#/clientes): marcador honesto. La vista real (lista, ficha
  // con proyectos, facturas y briefs, editar y archivar) llega en A2 sobre
  // los endpoints que ya existen. Mientras tanto, los clientes se crean y
  // se consultan desde Finanzas.
  // ─────────────────────────────────────────────────────────────
  import PageHeader from './ui/PageHeader.svelte';
  import EmptyState from './ui/EmptyState.svelte';
  import { href } from './lib/router.svelte.js';
</script>

<PageHeader title="Clientes" />

<div class="ui-card">
  <EmptyState
    art="users"
    title="En construcción en esta tanda"
    text="Aquí verás cada cliente con sus proyectos, facturas y briefs en un solo sitio. Mientras tanto, los clientes se crean y se consultan en Finanzas."
  >
    {#snippet action()}<a class="b" href={href('finanzas')}>Ir a Finanzas</a>{/snippet}
  </EmptyState>
</div>
