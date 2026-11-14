# Checklist de revisión visual obligatorio — Marcyan Web (por proyecto)

> **Qué es esto:** la PUERTA DE SALIDA que exige la skill `design-director`. Ningún
> diseño o cambio visual de este repo se entrega sin pasar este checklist item por item
> (PASA / NO PASA) contra el RENDER REAL, no contra el código. **Regla de bloqueo: un
> solo item en NO PASA y no se entrega**; se corrige o se documenta la excepción (item,
> justificación, quién la aprueba).
>
> Este archivo es POR PROYECTO a propósito: cada cliente tiene su nicho, su público y su
> proyección. Este es el de Marcyan Web. Complementa a `DESIGN.md` (que manda) y al
> `errores-ledger.md` de la skill (memoria de gusto del dueño, todos los proyectos).

## Quién es este proyecto (para juzgar con contexto)

PYMEs de Houston y Miami, mercado hispano y bilingüe. La marca proyecta: tecnología
seria con calidez latina, precios transparentes con anclas bajas, honestidad dura (cero
promesas infladas, cero reseñas inventadas). El tema Space-Tech es ATMÓSFERA VISUAL,
nunca contenido del mensaje.

## A · Copy y mensaje

- [ ] Ni un guion decorativo: buscar literalmente "—" y "–" en todo texto visible.
      Ni antes de títulos, ni entre palabras clave, ni como conector (E-07, E-12).
      Permitidos solo: rangos reales ("Lun–Vie", "$400–$1,500"), compuestos de fábrica
      ("e-commerce", "24/7"), nombres propios.
- [ ] Cada línea de copy pasa el test "¿qué aporta al público objetivo o al SEO?".
      Nada de tematización vacía: ni coordenadas decorativas, ni "ciudad espacial",
      ni jerga del tema visual en el mensaje (E-13).
- [ ] Claims con cifra, entregable o plazo real. Plazos correctos: contacto "1 hora
      hábil", propuesta "24 horas" (nunca fusionarlos).
- [ ] Sin reseñas/testimonios/stats inventados; sin promesa de #1 (E-10).
- [ ] ES y EN dicen lo mismo; el texto sale del slice i18n, cero literales en componentes.

## B · Color y luz

- [ ] Un solo acento manda por zona: oro O teal, nunca compitiendo en el mismo bloque (E-14).
- [ ] La paleta se usa como sistema: superficies escalonadas (`--bg-2/card/elevated`),
      familias dim/line/glow, tintes y gradientes sutiles. Nada de 4 hexes crudos
      aplicados a todo (E-14).
- [ ] ¿Dónde está la luz en cada sección? Ninguna losa de negro crudo mayor que media
      pantalla sin atmósfera, gradiente o superficie (E-01).
- [ ] Contraste AA en todo texto (cuerpo ≥4.5:1); `--fg-subtle` SOLO disabled/placeholder.
      El contraste va por delante de la fidelidad a la paleta (E-14).
- [ ] Teal limpio: acento por borde/icono/texto nítidos, sin halos difusos (E-03). El oro
      puede llevar glow muy sutil.
- [ ] Si el componente funciona mejor saliéndose del literal de la marca (chats, tablas,
      formularios largos), se propone esa salida con criterio en vez de forzar el hex (E-14).

## C · Composición y jerarquía

- [ ] Nada que parezca plantilla SaaS: cero grids de 3 tarjetas icono+título+párrafo (E-04).
- [ ] Hero potente SOLO en páginas de aterrizaje; hubs y secciones llevan franja compacta (E-05).
- [ ] 1 acción primaria dominante (oro sólido) + secundaria contorno/ghost; jamás dos CTAs gemelos.
- [ ] Un concepto claro ejecutado limpio; sin apilar técnicas/efectos (E-08). Ante la duda,
      quitar, no añadir.
- [ ] Iconos: Lucide outline 1.5px, un icono = un concepto; `marcyan-ai` solo en su slot insignia.
- [ ] Wordmark `BrandType` del navbar intocable; los 3 artefactos de marca nunca se fusionan.

## D · Técnica (build-safety)

- [ ] Solo tokens de `tokens.css`; breakpoints vía `@custom-media`; sin hardcodes nuevos.
- [ ] Contratos intactos: props, `data-*`, ids, names, schema JSON-LD, textos AnswerBlock/FAQ
      verbatim, política de CTAs (el brief nunca capta; trío llamar/WhatsApp/#contacto).
- [ ] `SpaceBackdrop` exactamente uno por página; la home no lo lleva (tiene su atmósfera).
- [ ] Un solo `<h1>`; foco visible (`:focus-visible`); tap-targets ≥44px (`--tap-min`);
      `aria-hidden` en decoración.
- [ ] ¿Existe la hoja de contacto de la matriz de la puerta de salida de design-director,
      con todas las capturas base y las condicionales que apliquen, y el registro del
      script sin scroll lateral en ninguna? Falta una captura o hay scroll lateral: NO PASA.
      ¿En NINGÚN ancho de la matriz hay contenido cortado, solapado, palabras partidas o
      texto que se sale de su botón? ¿Ninguna pieza con información **desaparece** por
      tamaño (`display:none` en una media query sin que esa información siga visible de
      otra forma; lo puramente decorativo y los enlaces que pasan al menú móvil no
      cuentan)? ¿Ninguna portada ni producto se **reduce** con zoom o escala para caber en
      el alto (ledger E-65)? ¿Lo que en escritorio se revela al pasar el ratón tiene
      equivalente visible o por toque en táctil? ¿El teléfono muestra la composición
      escrita en el registro del gate? Verificación: listar cada `display:none` dentro de
      una media query con su equivalente o «decorativo» al lado, y mirar la hoja de
      contacto. Un solo fallo: NO PASA. Pista del repo para el scroll lateral: `min-width:0`
      en los hijos de flex y grid.
- [ ] Toda animación se apaga en `@media (--motion-reduce)`; animaciones aprobadas
      existentes inventariadas y CONSERVADAS (E-02).
- [ ] Lo que espera a la red (datos de panel, chat, islas que piden datos) reserva el hueco
      con su forma real, usa el indicador que marca la pieza de catálogo E-09, lleva
      aria-busy en el contenedor mientras espera y tiene su vacío (pieza E-08) y su error
      con reintento (pieza E-10). Lo que ya llega en el HTML no lleva esqueleto ni spinner.
- [ ] Presupuesto PSI: no bajar de 95/97 móvil (Lighthouse local antes de entregar).
      Imágenes: solo si DESIGN.md §3 lo permite para este caso, AVIF/WebP con
      width/height, ≤150KB above-the-fold.

## E · Proceso (protocolo Ojos)

- [ ] Mínimo 2 ciclos render→captura→auto-crítica ANTES de enseñar (E-11). Piezas
      grandes: 2-4 direcciones distintas para que el dueño elija.
- [ ] Scroll/sticky/fixed/IO verificados en el CHROME REAL con pestaña visible (E-09).
- [ ] Entrega con screenshot del estado final + las decisiones de gusto tomadas.
- [ ] Cambio visual mergeable SOLO con OK explícito del dueño sobre el render.
- [ ] Si el dueño corrige algo: la corrección entra al `errores-ledger.md` de la skill
      en esa misma sesión.
