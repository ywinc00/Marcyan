<script>
  // Iconos del panel: UNA familia (la de la barra lateral): trazo 1,6 px,
  // caja de 24, puntas y uniones redondeadas. Sustituye los glifos sueltos
  // (⤓, ↑, ▸, ↻) y el icono fijo de la miga (SH-24).
  let { name, size = 18, label = '' } = $props();

  const PATHS = {
    inicio:    'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    leads:     'M3 8l9 6 9-6M3 8v10h18V8M3 8l9-5 9 5',
    clientes:  'M16 20v-1.5A3.5 3.5 0 0012.5 15h-5A3.5 3.5 0 004 18.5V20M10 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM20 20v-1.5a3.5 3.5 0 00-2.6-3.4M15.5 4.2a3.5 3.5 0 010 6.6',
    briefs:    'M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6zM14 3v6h6',
    finanzas:  'M3 7h18v10H3zM3 7l9 6 9-6',
    progreso:  'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
    seo:       'M4 20V10M10 20V4M16 20v-6M22 20H2',
    avisos:    'M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0',
    search:    'M11 18a7 7 0 100-14 7 7 0 000 14zM21 21l-4.3-4.3',
    menu:      'M4 7h16M4 12h16M4 17h16',
    close:     'M6 6l12 12M18 6L6 18',
    download:  'M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4M12 4v11M8 11l4 4 4-4',
    upload:    'M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4M8 8l4-4 4 4M12 4v12',
    refresh:   'M20 11a8 8 0 10-2.3 5.7M20 4v7h-7',
    chevron:   'M9 6l6 6-6 6',
    logout:    'M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3M10 17l5-5-5-5M15 12H4',
    install:   'M12 3v12M7 10l5 5 5-5M5 21h14',
    alert:     'M12 9v4M12 17h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
    check:     'M5 12.5l4.5 4.5L19 7.5',
    wifiOff:   'M2 2l20 20M8.5 16.4a5 5 0 017 0M5 12.9a10 10 0 015.2-2.8M19 12.9a10 10 0 00-2.1-1.6M2 8.8a15 15 0 014.2-2.7M22 8.8A15 15 0 0010.7 5M12 20h.01',
    build:     'M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.5 2.5-2.8-.7-.7-2.8z',
    // A4 (Finanzas): editar y borrar filas (misma familia: trazo 1,6, caja 24).
    edit:      'M4 20h4L18.5 9.5a2.1 2.1 0 00-3-3L5 17v3zM13.5 8.5l3 3',
    trash:     'M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3',
  };
</script>

<svg
  class="ui-icon"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width="1.6"
  stroke-linecap="round"
  stroke-linejoin="round"
  role={label ? 'img' : undefined}
  aria-label={label || undefined}
  aria-hidden={label ? undefined : 'true'}
><path d={PATHS[name] || ''} /></svg>
