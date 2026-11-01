# Hechos comprobados en vivo el 31-oct-2026 (sesión principal, Search Console en el navegador y la API)

## Índice
- Vigilancia diaria (contador sin barra, 84 URLs del sitemap): 13-oct 41 · 18-oct 35 · 20-oct 34 · 21-oct 33 · 23-oct 33 · 25-oct 36 · 26-oct 36 · 27-oct 36 · 28-oct 35 · 31-oct 34. La caída fuerte fue del 29-sep al 21-oct; desde entonces oscila entre 33 y 36.
- Informe de páginas de Search Console hoy: Indexed 35, Not indexed 92 = Page with redirect 33, Alternate 4, noindex 1, robots 1, Crawled - currently not indexed 53.
- Última lectura de Google de las páginas "rastreada, sin indexar" (lista del informe, 53): casi todas entre el 19-ago y el 10-sep (muchas el 29-30 de agosto); algunas releídas en octubre y aun así fuera: /en/houston (17-oct), /en/miami/conversational-ai (8-oct), /en/houston/beauty-salons (7-oct), /es/houston/abogados-inmigracion (3-oct).
- Volvieron al índice tras releerse: /es/blog/ia-que-contesta-llamadas-mensajes-perdidos (14-oct, sola), /es/houston/bienes-raices, /es/miami/doral, /es/miami/seo-local (peticiones del 24-oct; las tres eran "Alternate" con copia vieja de canónica con barra).
- Mapa del sitio: Success, 84 URLs, leído el 24-oct. Acciones manuales y seguridad: ninguna (13-oct).

## Prueba en vivo de Google (URL Inspection → Test live URL → View tested page), /es/houston/diseno-web (fuera del índice)
- "URL is available to Google", "Page can be indexed". Recursos: 1 de 18 falla (/api/events, bloqueado por robots, normal). Consola JS: sin mensajes.
- Texto renderizado por Google: 1.344 palabras; H1 "Diseño web en Houston"; incluye el rótulo "Prefer English?" y el widget del chat ("Hola, soy Marcy" como H2).
- CAPTURA de Google (smartphone): TODO el contenido bajo la cabecera aparece DESENFOCADO y oscurecido; solo la cabecera y el rótulo "Prefer English?" se ven nítidos.
- Causa del desenfoque: `.riel__finale` de src/components/sections/Process.astro (desde el 7-jun-2026): capa `position: fixed; inset: 0; z-index: 60; background: rgba(8,8,8,.42); backdrop-filter: blur(7px)` con el CTA "¿Listo para despegar? Lanza tu proyecto ahora". En pantallas <1024 px el script añade `has-finale` y llama a `update()` al cargar: si el último paso del proceso queda por encima del centro del viewport se dispara `launch()` → clase `is-launched` → capa visible a pantalla completa. Google renderiza con un viewport móvil muy alto (toda la página), así que se dispara siempre y no se cierra (el cierre depende de scroll).
- La copia GUARDADA por Google de una página INDEXADA (/es/houston/seo-local, View crawled page) también tiene `process ... is-launched` y el rótulo de idioma: la capa no impide por sí sola estar indexada.
- La capa está en 54 de las 84 URLs (16 indexadas, 30 %); sin capa 30 URLs (18 indexadas, 60 %). Fuera sin capa: /en/houston, /en/houston/ai-seo, /en/portfolio, /en/services, 3 artículos del blog, /es/houston/seo-para-ia, /es/miami, /es/portafolio, /es/precios, /es/servicios.

## Duplicación
- /es/houston/diseno-web (fuera) comparte 16 de 22 frases del contenido principal con /es/miami/diseno-web (dentro) cambiando la ciudad.
- Google, búsqueda con comillas y filter=0 de "HTML ligero que carga en un par de segundos, impecable en celular y en computadora": devuelve SOLO /es/miami/diseno-web.
- Agrupando las 84 por frases compartidas (≥50 %, ciudad neutralizada, solo <main>): 6 grupos con 13 páginas (5 indexadas, 38 %); 71 sin gemela (29 indexadas, 41 %). Texto exclusivo medio: indexadas 71 %, fuera 67 %. No separa.

## Demanda
- Apariciones por página del 14-jul al 23-sep frente al estado de hoy: 0 → 41 % indexadas (17 págs); 1-9 → 34 % (41); 10-29 → 46 % (13); 30-99 → 64 % (11); 100+ → 0 % (2: los hubs /es/miami y /es/houston). Con algún clic: 5 de 11 indexadas. No separa.

## Producción
- Despliegues de producción visibles en Vercel: 55, todos READY, desde el 25-sep (los anteriores ya no aparecen por retención). Desde el 25-sep el sitio se redespliega casi a diario por los commits de datos de las rutinas (a veces 3-5 al día).

## Control (sin cambios hasta hoy en lo esencial): TRR 33, JLX 13, MJA 54.
