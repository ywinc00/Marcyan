<script>
  // Tabla de datos. Por encima de 720 px es una tabla (cabecera caption,
  // filas de 52 px, separadores hairline); por debajo, cada fila pasa a
  // ser una tarjeta apilada con su rótulo por celda y la ACCIÓN a la vista
  // (el móvil ya no corta la columna Estado). Un solo DOM: lo hace el CSS.
  //   columns: [{ key, label, align?: 'end', primary?: true, action?: true, wide?: true }]
  //   cell: snippet (row, col) para pintar cada celda; sin él, row[col.key].
  let { columns = [], rows = [], rowKey = 'id', caption = '', cell } = $props();
  const keyOf = (r, i) => (typeof rowKey === 'function' ? rowKey(r) : r?.[rowKey]) ?? i;
</script>

<div class="ui-table-wrap">
  <table class="ui-table">
    {#if caption}<caption class="sr-only">{caption}</caption>{/if}
    <thead>
      <tr>
        {#each columns as col (col.key)}
          <th scope="col" class:is-end={col.align === 'end'}>{col.label}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each rows as row, i (keyOf(row, i))}
        <tr>
          {#each columns as col (col.key)}
            <td data-label={col.label} class:is-end={col.align === 'end'} class:is-primary={col.primary} class:is-action={col.action} class:is-wide={col.wide}>
              {#if cell}{@render cell(row, col)}{:else}{row?.[col.key] ?? '—'}{/if}
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
