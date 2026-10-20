<script>
  // Sección Briefs del panel (Orbit v2 · A3 + B3).
  //   #/briefs                         → lista (filtros en la URL: estado, buscar, pagina)
  //   #/briefs/MRC-017                 → ficha del brief (enlace profundo de avisos y correos)
  //   #/briefs/MRC-017?estado=pendiente → ficha; "Volver" conserva los filtros de la lista
  // La lista y la ficha viven en briefs/; aquí solo se decide cuál se ve.
  import { route } from './lib/router.svelte.js';
  import BriefList from './briefs/BriefList.svelte';
  import BriefDetail from './briefs/BriefDetail.svelte';

  // El id puede llegar con restos de una redirección vieja (?id=…, &…):
  // se corta ahí (contrato de vercel.json) y se normaliza a mayúsculas.
  const pid = $derived(String(route.sub[0] || '').split(/[?&/#]/)[0].trim().toUpperCase().slice(0, 40));
</script>

{#if pid}
  {#key pid}<BriefDetail {pid} />{/key}
{:else}
  <BriefList />
{/if}
