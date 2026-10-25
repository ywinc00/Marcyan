<script>
  // Cabecera de página: UNA medida para todas las secciones (SH-20: los
  // títulos ya no saltan al cambiar de vista). Título 28/600 + subtítulo
  // opcional + acciones a la derecha (snippet). `badge` va junto al título
  // (p. ej. el contador de no leídos de Avisos).
  let { title, subtitle = '', actions, badge } = $props();
</script>

<header class="ui-page-head">
  <div class="ui-page-head__text">
    <h1 class="ui-page-title">{title}{#if badge}{@render badge()}{/if}</h1>
    {#if subtitle}<p class="ui-page-sub">{subtitle}</p>{/if}
  </div>
  {#if actions}<div class="ui-page-head__actions">{@render actions()}</div>{/if}
</header>
