// Servicios · arte de las tarjetas de "Empieza por tu caso" (rev1, importante 2: el tramo de
// perfil a FAQ no tenía ni un objeto ni una luz). TarjetasPerfil acepta `art` como SVG en cadena,
// a todo el ancho de la tarjeta, anclado abajo en la franja sin texto (104 px), en el acento al
// 35 % (currentColor). Dibujos de línea de los MISMOS objetos de la página, sin texto:
//   · web     → "Abro mi negocio": la web que asoma (barra, titular, líneas y el botón de llamar).
//   · escaner → "Ya tengo web pero no me llaman": el muro de señales del diagnóstico con su barra.
// Cada uno con un halo suave del acento (la luz del tramo). Ids de degradado únicos por página.
// Sin idioma: nada que traducir.

export const arteWeb = `<svg viewBox="0 0 450 104" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false">
<defs><radialGradient id="ws-art-web-g" cx="0.5" cy="1" r="0.75"><stop offset="0" stop-color="currentColor" stop-opacity=".55"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></radialGradient></defs>
<ellipse cx="225" cy="112" rx="230" ry="70" fill="url(#ws-art-web-g)"/>
<rect x="60.5" y="18.5" width="329" height="110" rx="12" stroke="currentColor" stroke-width="1.5"/>
<path d="M61 40.5h328" stroke="currentColor" stroke-width="1.2"/>
<circle cx="77" cy="29.5" r="3.5" fill="currentColor"/><circle cx="89" cy="29.5" r="3.5" fill="currentColor" opacity=".7"/><circle cx="101" cy="29.5" r="3.5" fill="currentColor" opacity=".45"/>
<rect x="82" y="56" width="148" height="9" rx="4.5" fill="currentColor"/>
<rect x="82" y="72" width="196" height="5" rx="2.5" fill="currentColor" opacity=".55"/>
<rect x="82" y="82" width="168" height="5" rx="2.5" fill="currentColor" opacity=".55"/>
<rect x="82" y="94" width="92" height="22" rx="11" fill="currentColor"/>
<rect x="300.5" y="56.5" width="68" height="60" rx="8" stroke="currentColor" stroke-width="1.2" opacity=".8"/>
</svg>`;

export const arteEscaner = `<svg viewBox="0 0 450 104" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false">
<defs><radialGradient id="ws-art-scan-g" cx="0.5" cy="0.62" r="0.6"><stop offset="0" stop-color="currentColor" stop-opacity=".6"/><stop offset="1" stop-color="currentColor" stop-opacity="0"/></radialGradient></defs>
<ellipse cx="225" cy="64" rx="200" ry="44" fill="url(#ws-art-scan-g)"/>
<g stroke="currentColor" stroke-width="1.2">
<rect x="-30.5" y="24.5" width="96" height="26" rx="8" opacity=".35"/><rect x="77.5" y="24.5" width="84" height="26" rx="8" opacity=".6"/><rect x="173.5" y="24.5" width="104" height="26" rx="8"/><rect x="289.5" y="24.5" width="88" height="26" rx="8" opacity=".6"/><rect x="389.5" y="24.5" width="96" height="26" rx="8" opacity=".35"/>
<rect x="15.5" y="62.5" width="104" height="26" rx="8" opacity=".45"/><rect x="131.5" y="62.5" width="90" height="26" rx="8" opacity=".8"/><rect x="233.5" y="62.5" width="96" height="26" rx="8" opacity=".8"/><rect x="341.5" y="62.5" width="100" height="26" rx="8" opacity=".45"/>
<rect x="-20.5" y="100.5" width="92" height="26" rx="8" opacity=".3"/><rect x="83.5" y="100.5" width="100" height="26" rx="8" opacity=".55"/><rect x="195.5" y="100.5" width="88" height="26" rx="8" opacity=".7"/><rect x="295.5" y="100.5" width="96" height="26" rx="8" opacity=".55"/>
</g>
<g fill="currentColor"><rect x="89" y="35" width="44" height="4" rx="2" opacity=".5"/><rect x="186" y="35" width="70" height="4" rx="2"/><rect x="301" y="35" width="52" height="4" rx="2" opacity=".5"/><rect x="143" y="73" width="54" height="4" rx="2" opacity=".7"/><rect x="246" y="73" width="62" height="4" rx="2" opacity=".7"/></g>
<rect x="159" y="53" width="132" height="6" rx="3" fill="currentColor"/>
</svg>`;
