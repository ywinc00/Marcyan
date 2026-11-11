# Logos de plataformas · licencias, origen y uso

Registro exigido por `design/rediseno-workos-v2.md` §1.4 y §4.5 (P06). Todo logo de marca del sitio pasa por
`LogoMarca.astro` y sale de `datos.ts`; no hay `<svg>` de marca fuera de `src/components/w/marcas/`.

## Origen de los trazados

| Campo | Valor |
|---|---|
| Paquete | `simple-icons` **16.36.0** |
| URL del paquete | https://registry.npmjs.org/simple-icons/-/simple-icons-16.36.0.tgz |
| Cómo se obtuvo | `npm pack simple-icons@16.36.0` en una carpeta de trabajo aparte (nunca `npm install`; `package.json` y `package-lock.json` sin tocar) |
| Fecha de descarga | 2026-11-05 |
| Licencia del trazado | **CC0 1.0 Universal** (dominio público) según `LICENSE.md` del paquete |
| Qué se copió | Solo el atributo `d` del `path` y el `hex` de los 16 ids de abajo, a `datos.ts` |

**CC0 cubre el dibujo, no la marca.** Las marcas pertenecen a sus dueños. Aquí se usan de forma **nominativa**:
para decir con qué trabajamos (Claude), dónde contesta Marcy (WhatsApp, Instagram, Messenger, Google) o dónde te
encuentran (ChatGPT, Gemini, Meta AI…). Nunca como aval, alianza, certificación, "partner" ni "construido con".
"Dominamos" la IA.

Reglas de pintado (todas en `LogoMarca.astro`): sin recolorear (hex oficial del paquete o monocromo), sin deformar
(proporción del trazado intacta; el factor óptico solo escala), sin girar, sin efectos. Monocromo = crema sólida
`#F0EDE8` sin opacidad (Stripe, blanco puro: su guía no admite otro color). Las multicolor nunca con un solo hex.

## Tabla por marca

Veredicto = lo que permite el uso que hacemos según la guía de marca enlazada (o, si el paquete no trae el campo
`guidelines`, la página de marca revisada el 2026-11-05; ver §Revisión).

| id | Título | Hex | Versión | Trazado | Guía de marca (campo `guidelines`) | Veredicto y tratamiento | Uso nominativo previsto |
|---|---|---|---|---|---|---|---|
| `claude` | Claude | `#D97757` | 16.36.0 | CC0 | Sin `guidelines` en el paquete. Revisado 2026-11-05: https://www.anthropic.com/legal/trademark-guidelines | **NO APTO en páginas públicas sin permiso escrito de Anthropic** (la guía exige aprobación previa de cada uso y prohíbe alterar color, letra o proporción: la crema también es alteración). Mientras no haya permiso: "Claude" en texto, sin glifo. Nunca "Claude Code" en pantalla ni su interfaz como marca. Ver §Revisión | "Piensa con" (el modelo que usamos de verdad: `claude-sonnet-5`) |
| `googlegemini` | Google Gemini | `#8E75B2` | 16.36.0 | CC0 | Sin `guidelines` en el paquete. Revisado 2026-11-05: https://partnermarketinghub.withgoogle.com/brands/google/branding-guidelines/how-to-show-googles-brand/ | **NO APTO como icono sin permiso de Google** (los iconos de producto se piden en su Partner Marketing Hub y no se modifican; el uso de compatibilidad necesita aprobación). Mientras no haya permiso: "Gemini" en texto. Si se aprueba: **tratada como multicolor** (decisión de P06, más estricta que el plan): el destello oficial de Gemini es un degradado, así que pintarlo con el `#8E75B2` del paquete lo alteraría. En color va en negro sobre baldosa o en la tinta del contexto; en listados, crema | "Te encuentran en" |
| `meta` | Meta | `#0467DF` | 16.36.0 | CC0 | https://www.facebook.com/brand/resources/meta/company-brand | Azul de Meta o blanco/negro, sin alterar; se rotula "Meta AI" en texto aparte cuando el copy habla del asistente | "Te encuentran en" (el copy congelado nombra Meta AI) |
| `perplexity` | Perplexity | `#1FB8CD` | 16.36.0 | CC0 | Sin `guidelines` en el paquete. Revisado 2026-11-05: https://www.perplexity.ai/hub/brand (no publica normas para terceros) | **APTO con cautela**: uso nominativo plano, glifo sin alterar en su color o en blanco/crema, sin aval. Sin norma escrita que lo cubra: ante cualquier duda, en texto. Solo donde la página nombre Perplexity | "Te encuentran en" |
| `google` | Google | `#4285F4` | 16.36.0 | CC0 | https://about.google/brand-resource-center/brand-elements/ | **Multicolor**: la "G" oficial es de cuatro colores; no se pinta con un solo hex. En color va en negro sobre baldosa blanca o en la tinta del contexto; en listados, crema | "Contesta en" (perfil de Google), "Te encuentran en" |
| `googlemaps` | Google Maps | `#4285F4` | 16.36.0 | CC0 | El paquete no trae `guidelines`; centro de marca de Google | **Multicolor**: igual que Google, nunca con un solo hex | SEO local, ficha de mapa |
| `whatsapp` | WhatsApp | `#25D366` | 16.36.0 | CC0 | https://about.meta.com/brand/resources/whatsapp/whatsapp-brand | Solo su verde o blanco/negro (la guía no admite otros colores). Baldosa = verde con glifo blanco (su icono de app). Crema sólida en listados (equivale a su versión monocroma clara) | "Contesta en" |
| `instagram` | Instagram | `#FF0069` | 16.36.0 | CC0 | https://about.meta.com/brand/resources/instagram | **Multicolor**: el glifo oficial va en degradado o en blanco/negro; nunca en un solo rosa. En color va en negro sobre baldosa o en la tinta del contexto. Degradado oficial dentro de un dock (P08): NO activado, pendiente de verificar que la guía lo permite en ese uso | "Contesta en" |
| `messenger` | Messenger | `#0866FF` | 16.36.0 | CC0 | https://about.meta.com/brand/resources/facebook/messenger-icon | Azul del paquete o blanco/negro, sin alterar. Pendiente de confirmar en su guía que el azul sólido sigue admitido (el icono de app actual lleva degradado); si no, pasa a multicolor | "Contesta en" |
| `facebook` | Facebook | `#0866FF` | 16.36.0 | CC0 | https://about.meta.com/brand/resources/facebook/logo | Azul de Facebook o blanco/negro, sin alterar | Canales y fichas de negocio |
| `shopify` | Shopify | `#7AB55C` | 16.36.0 | CC0 | https://www.shopify.com/brand-assets | Verde del paquete o blanco/negro; solo como plataforma con la que montamos tiendas, nunca "partner" | Tienda en línea (el copy ya la nombra) |
| `stripe` | Stripe | `#635BFF` | 16.36.0 | CC0 | Sin `guidelines` en el paquete. Revisado 2026-11-05: https://stripe.com/newsroom/brand-assets (y su Marks Usage Agreement) | **APTO solo en violeta, pizarra o blanco** (la guía no admite otros colores): baldosa violeta con glifo blanco o glifo blanco sobre oscuro; **la crema no vale para Stripe**, en listados oscuros va en blanco. El sello "Powered by Stripe" es para el pago, no para la web | Pagos de la tienda (el copy ya la nombra) |
| `paypal` | PayPal | `#002991` | 16.36.0 | CC0 | https://newsroom.paypal-corp.com/media-resources | Azul del paquete o blanco/negro, sin alterar. Sobre la noche no se usa a color (contraste): va en cápsula clara o casilla | Pagos de la tienda (el copy ya la nombra) |
| `gmail` | Gmail | `#EA4335` | 16.36.0 | CC0 | El paquete no trae `guidelines`; centro de marca de Google | **Multicolor**: nunca en un solo rojo; negro sobre baldosa o tinta del contexto | Avisos por correo (solo donde la página lo diga) |
| `googlecalendar` | Google Calendar | `#4285F4` | 16.36.0 | CC0 | El paquete no trae `guidelines`; centro de marca de Google | **Multicolor**: nunca en un solo azul; negro sobre baldosa o tinta del contexto | Agenda (solo donde la página lo diga) |
| `calendly` | Calendly | `#006BFF` | 16.36.0 | CC0 | https://calendly.com/newsroom | Azul del paquete o blanco/negro, sin alterar | Agenda (solo donde la página lo diga) |

## Revisión de guías (2026-11-05)

Cerradas las cuatro revisiones que quedaban abiertas. Resultado, por orden de peso:

1. **Claude (Anthropic)**: https://www.anthropic.com/legal/trademark-guidelines (vigente desde 2024-08-01). Solo se usan
   sus marcas con permiso y en materiales aprobados antes; ninguna alteración de color, letra ni proporción; nada que
   sugiera patrocinio o afiliación. **Veredicto: el glifo de Claude no va en páginas públicas sin permiso escrito**
   (contacto que indica la guía: marketing@anthropic.com). Decisión del dueño: pedir permiso o nombrar Claude en texto.
2. **Google (Google, Maps, Gmail, Calendar, Gemini)**: https://partnermarketinghub.withgoogle.com/brands/google/branding-guidelines/how-to-show-googles-brand/.
   Los iconos de producto se piden con cuenta en el Partner Marketing Hub; no se modifican; tu marca va más destacada
   que el icono; no se exagera el papel de Google. **Veredicto: los 5 iconos de Google, solo con permiso**; mientras
   tanto, en texto. Nuestro monocromo es modificación, así que tampoco vale como salida.
3. **Stripe**: https://stripe.com/newsroom/brand-assets. Colores admitidos: pizarra, violeta o blanco; ningún otro.
   **Veredicto: apto en esos colores; nunca en crema.** `datos.ts` le pone `monoBlanco`: en tono `mono`, `LogoMarca`
   lo pinta blanco puro en vez de crema.
4. **Perplexity**: https://www.perplexity.ai/hub/brand. Publica su identidad y descargas pero no normas para terceros.
   **Veredicto: apto con cautela** (uso nominativo plano, sin alterar, sin aval).

**Cerrojo para las páginas G**: ninguna página pública monta `claude`, `google`, `googlemaps`, `gmail`,
`googlecalendar` ni `googlegemini` como logo hasta que el dueño tenga el permiso o decida. El resto (Meta,
WhatsApp, Instagram, Messenger, Facebook, Shopify, PayPal, Calendly, Perplexity, Stripe en sus colores) sigue su
veredicto de la tabla.

## Palabras (no están en simple-icons 16.36.0)

| id | Se pinta | Por qué |
|---|---|---|
| `chatgpt-texto` | Palabra "ChatGPT" en Space Grotesk 600, mismo alto óptico que sus vecinos | `openai` y `chatgpt` fueron retirados de simple-icons. **No se dibuja ni se aproxima el logo de OpenAI.** Usar el logo oficial de la página de marca de OpenAI es la decisión §5-2 del dueño, sin respuesta a 2026-11-05: por defecto, palabra |
| `applemaps-texto` | Palabra "Apple Maps" | Las normas de Apple no permiten la manzana a terceros: no hay `apple` en `MarcaId` |
| `bing-texto` | Palabra "Bing" | `microsoftbing` no existe en 16.36.0 |

Comprobado en el paquete: `apple` existe pero NO se copió; `openai`, `chatgpt`, `microsoftbing`, `bing` y `applemaps` no existen.

## Cerrojo aplicado en el código (2026-11-06, control v2 r1, I-01)

El cerrojo de arriba ya no depende de cada página: `datos.ts` exporta `BLOQUEADAS` (`claude`, `google`,
`googlemaps`, `gmail`, `googlecalendar`, `googlegemini`) y `LogoMarca.astro` NUNCA pinta su glifo:

- en un icono de app (baldosa, o caja de 26 px o más: dock del portátil, carga de ventanas, ficha de Maps,
  constelación de canales) pinta un **pictograma genérico sin marca** (`PICTO_BLOQUEADA`: chincheta,
  sobre, calendario, lupa, burbuja) en baldosa blanca;
- en una fila o cabecera pinta el **nombre en texto** (`PALABRA_BLOQUEADA`: Claude, Google, Google Maps,
  Gmail, Google Calendar, Gemini), igual que ChatGPT;
- si el nombre ya va escrito al lado (`titulo=""`), no pinta nada (`siBloqueada` lo cambia por llamada).

Esos nodos llevan `data-w2-bloq="<id>"` en lugar de `data-w2-marca`, así una búsqueda de
`data-w2-marca="claude"` en el HTML compilado da 0. Los trazados siguen en `datos.ts` (CC0) para el día
que haya permiso: basta con sacar el id de `BLOQUEADAS`. La reserva de `mac/mac.ts` ya no guarda
Claude ni los de Google.

## Dónde se usa

A 2026-11-06, con el cerrojo aplicado, ninguna página pública pinta como logo `claude` ni los 5 de Google.
Logos que sí salen como glifo (veredicto de la tabla): WhatsApp, Instagram, Messenger, Facebook, Meta,
Perplexity, Shopify, Stripe, PayPal, Calendly; y en palabra ChatGPT, Apple Maps y Bing. Páginas:
portada `/es` y `/en` (ventana del agente, chip "Así está montada", portátil del proceso), IA para pymes
ES/EN, IA conversacional, SEO para IA, servicios ES/EN, tienda en línea, SEO local, sectores y artículos
del blog ("Pregúntale a tu IA"). El muestrario interno `/es/w-muestrario-marcas` (noindex, se borra
antes de cualquier merge a `main`) también pasa por el cerrojo.
