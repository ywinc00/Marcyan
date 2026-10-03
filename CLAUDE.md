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

## Diseño y UI (obligatorio, sin excepciones)

Este bloque existe porque la skill se olvida al compactar y el gate dejó pasar errores.

- Antes de tocar CUALQUIER UI (Astro, CSS, tokens, copy visible): **invoca la skill
  `design-director`**. Vuelve a invocarla **después de cada `/compact`** y antes de cada
  entrega visual: si no recuerdas haber leído `errores-ledger.md` en esta ventana, no lo leíste.
- **La gramática es del sitio**: botones (`Button.astro`), nav (`SiteNav`), superficies, radios
  y acentos (`tokens.css`) NUNCA se importan de una referencia ni se reinventan por página.
  De una referencia se extraen principios. Si un concepto exige cambiarlos, se plantea al
  dueño como decisión global explícita, no se implementa como "expresión".
- **El diff es el encargo**: nada fuera del alcance escrito (`git diff main --stat` contra la
  spec antes de enseñar). "Ya que estoy" = STOP.
- **Sin captura real no hay ✓**: cada viewport que se declare verificado lleva screenshot de
  ese viewport. Medidas del DOM no sustituyen a los ojos. Si falla la herramienta: "NO verificado".
- Puerta de salida: `design/frontend-design.md` item por item. Cambios visuales se mergean
  SOLO con OK explícito del dueño sobre el render. Cada corrección del dueño entra al
  `errores-ledger.md` de la skill en esa misma sesión.
