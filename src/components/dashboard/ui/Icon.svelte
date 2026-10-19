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
    // A3 · Briefs (aditivo, misma familia de trazo 1,6):
    phone:     'M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.4 1.8.7 2.7a2 2 0 01-.5 2.1L8 9.8a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.9.3 1.8.6 2.7.7a2 2 0 011.7 2z',
    mail:      'M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1zM3 7l9 6 9-6',
    whatsapp:  'M3.5 20.5l1.3-4A8.5 8.5 0 1112 20.5a8.4 8.4 0 01-4.3-1.2zM9 8.5c0 3.6 2.9 6.5 6.5 6.5l1-1.6-2-1-1 1a4.3 4.3 0 01-2.4-2.4l1-1-1-2z',
    globe:     'M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3a14 14 0 010 18M12 3a14 14 0 000 18',
    link:      'M10 14a4.5 4.5 0 006.4 0l3-3a4.5 4.5 0 00-6.4-6.4l-1 1M14 10a4.5 4.5 0 00-6.4 0l-3 3a4.5 4.5 0 006.4 6.4l1-1',
    copy:      'M9 9h11v11H9zM5 15H4V4h11v1',
    edit:      'M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4',
    trash:     'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
    file:      'M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9l-6-6zM14 3v6h6',
    image:     'M4 5h16v14H4zM4 16l5-5 4 4 2-2 5 5M15.5 9.5h.01',
    video:     'M3 6h12v12H3zM15 10l6-3v10l-6-3',
    note:      'M5 4h14v12l-4 4H5zM15 20v-4h4M9 9h6M9 13h4',
    user:      'M20 21v-1.5A4.5 4.5 0 0015.5 15h-7A4.5 4.5 0 004 19.5V21M12 11a4 4 0 100-8 4 4 0 000 8z',
    send:      'M21 3L10 14M21 3l-7 18-4-7-7-4z',
    eye:       'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
    back:      'M15 18l-6-6 6-6',
    lock:      'M5 11h14v10H5zM8 11V7a4 4 0 018 0v4',
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
