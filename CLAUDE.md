# Marcyan Web

## Roadmap compartido (obligatorio)

Estado vivo del proyecto (dueño y Claude lo leen y escriben por igual):
`C:/Users/Yan/Area de Trabajo/Proyectos/_cerebro/marcyan-web/roadmap.md`
Panel visual del dueño: la URL de la línea `> Panel:` de ese archivo.

- Al empezar una sesión de TRABAJO (no aplica a sweeps automáticos): lee el roadmap, es corto.
- Al completar, encargar, bloquear o descartar cualquier plan o tarea: **invoca la skill
  `roadmap` (Operación 2)**: actualizar la línea (estado + fecha), commit en `_cerebro/`,
  regenerar el panel (`node _cerebro/tools/build-roadmap.mjs marcyan-web`) y republicarlo
  como Artifact pasando SIEMPRE la `url` de la línea `> Panel:` (favicon 🧭).
- Si el dueño pide ver el roadmap o el estado del proyecto: skill `roadmap`, Operación 1.
- Reglas y formato: `_cerebro/README.md`. 1 línea por item; los planes se enlazan, no se copian.
