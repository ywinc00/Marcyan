<script>
  // Rejilla de KPIs SIN huérfanos (gate orbit.md): el número de tarjetas
  // decide el reparto. 5 = 5 columnas en ≥1280 y 3+2 por debajo (nunca 4+1);
  // 4 = 4 o 2+2; impares en móvil = la primera a lo ancho. Las reglas viven
  // en dashboard.css (.ui-kpis[data-count]).
  let { count, children, label = '' } = $props();
</script>

<section class="ui-kpis" data-count={count} aria-label={label || undefined}>
  {@render children()}
</section>
