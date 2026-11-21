# Fotos de referencia de los contratos

Cada archivo es una foto del estado de las páginas en un momento dado. Sirve para que,
después de un rediseño o una migración, un script diga si alguna página perdió algo
invisible (titular, JSON-LD, dirección de página, espejo ES/EN, preguntas frecuentes,
botones de contacto) o si una URL salió del índice de Google.

Hay dos verificadores y cada uno usa su propia foto:

| Verificador | Qué mira | Foto que hay que usar hoy |
|---|---|---|
| `scripts/verify-landing-contracts.mjs` | las 19 landings de cluster + estado de indexación | `rediseno-workos-base` (1-nov-2026) |
| `scripts/w/verify-extra.mjs` | las 48 URL del sitio, contratos congelados | `post-rediseno-2026-11-20` |

```bash
npm run build
node scripts/verify-landing-contracts.mjs --compare rediseno-workos-base
node scripts/w/verify-extra.mjs --compare post-rediseno-2026-11-20
```

## Por qué dos fechas distintas

- **`rediseno-workos-base` (1-nov) se queda** para el primer verificador. Su comparación
  solo falla cuando algo **empeora**, así que no envejece, y además guarda el estado de
  indexación de antes del rediseño: es la prueba de que seis URL se cayeron del índice
  después (ver `_cerebro/marcyan-web/encargos/2026-11-20-landings-fuera-del-indice.md`).
  Volver a tomarla ahora borraría esa prueba.
- **`post-rediseno-2026-11-20` sustituye a `rediseno-workos-base.extra.json`** para el
  segundo verificador. Ese compara contra la foto *cualquier* cambio, no solo los
  empeoramientos, y el rediseño reescribió a propósito las 48 páginas: contra la foto
  vieja salían 85 fallos y 210 avisos, todos esperados, y el informe no servía de nada.
  Tomada el 20-nov-2026 sobre `main`@`111e6d6`, con las 48 páginas pasando sus
  comprobaciones absolutas.

`fusion-2026-11` es la foto de la fusión de páginas de noviembre; se conserva como
histórico.

## Cuándo volver a tomar una

Solo la del segundo verificador, y solo después de un cambio de contenido grande y ya
aprobado (rediseño, reescritura de textos, fusión de páginas). Nunca para silenciar un
informe que falla: primero se entiende por qué falla.
