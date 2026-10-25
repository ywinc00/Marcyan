# Plantillas del kit .zip

Copias de la plantilla de la propia agencia, para que el kit de cada brief salga
con la misma estructura que un proyecto real. `lib/kit/build.mjs` las lee y las
rellena con los datos del brief.

| Archivo | Origen | Va al kit como |
|---|---|---|
| `CLAUDE.md` | Estructura de Agencia / `CLAUDE.md` | anexo "Método de la agencia" de `CLAUDE.md` |
| `DESIGN.md` | Estructura de Agencia / `DESIGN.md` | `DESIGN.md` (front matter rellenado) |
| `art-direction.md` | Estructura de Agencia / `design/art-direction.md` | `design/art-direction.md` (cabecera rellenada) |
| `decision-TEMPLATE.md` | Estructura de Agencia / `design/decisiones/_TEMPLATE.md` | `design/decisiones/_TEMPLATE.md` |
| `frontend-design.md` | Estructura de Agencia / `.claude/rules/frontend-design.md` | `.claude/rules/frontend-design.md` |
| `seo.config.ejemplo.json` | skill `posicionamiento` / `plantillas/seo.config.ejemplo.json` | `docs/seo/seo.config.json` (semilla) |

Única diferencia con el original: los guiones largos usados como conector se
cambiaron por dos puntos o comas (regla de copy de Marcyan). Si la plantilla de
la agencia cambia, se vuelve a copiar aquí con el mismo arreglo.
