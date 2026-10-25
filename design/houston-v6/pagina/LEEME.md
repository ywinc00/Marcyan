# Houston, vuelta 6 · "entramos en la atmósfera"

Prototipo publicado: https://claude.ai/artifact/A1rsWKMteZNjNfz1X5dcJx

Para montarlo en local: copiar a esta carpeta `base.css` y `geo-data.js` (de `design/houston-v5/planeta/`),
las capturas `public/Galeria/{trr,mja,jls,rn}-{pc-900,movil-520}.webp`, `public/assets/bot/marcy-mini.webp`
y las capturas del pie, y ejecutar `python build4.py .` (añadir `--artifact` para la versión publicable).

- `atmo.js`: fondo fijo (WebGL2) con fases por sección leídas de `data-atmo`.
- `hero.js`: portada fija que se acerca al bajar; historia y pulso una sola vez.
- `page.js`: revelados, viñetas de servicios, panel de proyectos, cifras, mapa del área.
