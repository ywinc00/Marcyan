# Pruebas de comportamiento de chatbots (P1) y coste por conversación (P2)

Encargo del 2026-10-31 (`_cerebro/marcyan-web/encargos/2026-10-31-marcy-pruebas-y-coste.md`),
salido del informe `docs/marcy/revision-commerce-agents.md`. Sigue el método de la plantilla de
comercio de Anthropic: **instantáneas, no conversaciones; correctores en código; puerta antes de
publicar.**

## Cuándo se corren

**Antes de publicar cualquier cambio** en las instrucciones de Marcy (`lib/chat-kb.mjs`), sus
herramientas, sus filtros o el modelo. Si la puerta no pasa, no se publica.

## Cómo

1. Sube la rama: Vercel crea la vista previa (servidor y clave reales; sus frenos y su coste
   cuentan aparte de producción, así que las pruebas no gastan el tope de los visitantes).
2. Saca un pase de acceso de 23 h para la vista previa (herramienta de Vercel
   `get_access_to_vercel_url`; el token es lo que va tras `_vercel_share=`).
3. Corre:

   ```bash
   npm run eval:marcy -- --url https://marcyan-git-<rama>-yan8.vercel.app --share <token>
   ```

   Opciones: `--trials 2` (repeticiones por caso; la IA no da siempre lo mismo),
   `--delay 5500` (ms entre turnos, para no chocar con el freno de 12 por minuto),
   `--only id1,id2` (solo esos casos; no vale para la línea base).

4. Lee el veredicto: `PUERTA: PASA` o `PUERTA: NO PASA` con los motivos. El detalle de cada
   respuesta queda en `data/evals/marcy/<fecha>.json` (fuera de git).

**Nunca contra producción**: el ejecutor rechaza el dominio real. Hablar con Marcy en producción
genera gasto y ensucia las métricas.

## La puerta

- Todo caso **crítico** (seguridad, marca, política) al 100 % en todas sus repeticiones.
- Con línea base: el total no baja más de 5 puntos y ningún caso cae 50 puntos o más.
- La línea base (`scripts/evals/marcy.baseline.json`) se rehace con `--save-baseline` **solo**
  cuando el cambio de comportamiento es deliberado y está aprobado. Se commitea con el cambio.

## Casos

`scripts/evals/marcy-casos.mjs`: 16 casos, 8 críticos. Cada positivo con su contrario (cliente
decidido frente a explorando, cotizar frente a regatear, inyección en ES y en EN). Dos casos
(`precio-chatbot-es`, `precio-web-en`) **miden** las cifras sin respaldo: son la línea base de la
decisión P3 (cómo cotiza Marcy), no un fallo de diseño.

Para añadir un caso: historial + mensaje del visitante + un corrector en código que mire solo el
texto y la acción. Si no se puede corregir en código, el caso está mal planteado. Añade su
ejemplo bueno y malo en `scripts/test-evals.mjs`.

## Otro chatbot (clientes)

Copia `marcy-casos.mjs` como `<cliente>-casos.mjs`, ajusta `meta` (endpoint, origen, cómo se pide
un turno y cómo se lee la respuesta) y escribe sus casos. El ejecutor y los correctores
(`graders.mjs`) no cambian: `node scripts/evals/run.mjs <cliente> --url …`.

## Coste por conversación (P2)

Cada turno del chat deja una línea `[chat] uso …` en el registro de Vercel (tokens, caché, coste;
sin contenido ni IP) y suma sus números en `chat_usage_daily` (migración 017, a mano en Neon).
Resumen del mes:

```bash
npm run costes:chat -- 2026-11            # producción
npm run costes:chat -- 2026-11 --env preview   # lo que costaron las pruebas
npm run costes:chat -- 2026-11 --json     # una línea, para el informe mensual
```

Precios de `lib/chat-usage.mjs` (documentación oficial, leídos el 2026-10-31). Si Anthropic los
cambia, se actualizan ahí; el coste ya guardado conserva el precio de su día.
