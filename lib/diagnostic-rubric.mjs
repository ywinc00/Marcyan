// ════════════════════════════════════════════════════════════════
//  lib/diagnostic-rubric.mjs — Criterio del diagnóstico nuevo (fase 1)
//  ────────────────────────────────────────────────────────────────
//  Convierte las MEDICIONES (lib/diagnostic-measure.mjs) en hallazgos con
//  prueba. Cada hallazgo lleva la cifra medida que lo sostiene; sin medición
//  no hay hallazgo, y lo que no se pudo medir se dice como tal.
//
//  Umbrales públicos de Google (Core Web Vitals, móvil):
//    LCP bueno ≤ 2,5 s · malo > 4 s   INP bueno ≤ 200 ms · malo > 500 ms
//    CLS bueno ≤ 0,1  · malo > 0,25
//  Reseñas: sin datos de la competencia todavía, umbrales prudentes
//  (0 = grave, < 10 = flojo, nota < 4,0 = flojo).
//
//  Marcy recibe esta lista (nunca el HTML ajeno) y la explica en lenguaje
//  llano. Puro: se prueba en scripts/test-diagnostic-measure.mjs.
// ════════════════════════════════════════════════════════════════

export const CWV = { lcp: [2.5, 4], inp: [200, 500], cls: [0.1, 0.25] };

const nivel = (v, [bueno, malo]) => (v === null || v === undefined ? null : v <= bueno ? 'bueno' : v > malo ? 'malo' : 'mejorable');

function hallazgo(id, area, gravedad, prueba) {
  return { id, area, gravedad, prueba };
}

/**
 * @param {{ web, ficha }} m  salida de measureBusiness
 * @returns {{ hallazgos: Array, sin_medir: string[], fortalezas: string[] }}
 */
export function judge(m) {
  const hallazgos = [];
  const sinMedir = [];
  const fortalezas = [];
  const web = m && m.web;
  const ficha = m && m.ficha;

  // ── Web (PageSpeed, navegador real) ──
  if (!web || !web.ok) {
    if (web && web.motivo === 'web-no-abre') hallazgos.push(hallazgo('web_no_abre', 'web', 'grave', { google: 'no pudo abrir la web' }));
    else if (web && web.motivo === 'sin-web') hallazgos.push(hallazgo('sin_web', 'web', 'grave', { web: 'no tiene' }));
    else sinMedir.push('web');
  } else {
    // Usuarios reales mandan sobre el laboratorio cuando existen.
    const real = web.usuarios_reales;
    const lcp = real && real.lcp_s !== null ? real.lcp_s : web.laboratorio.lcp_s;
    const fuente = real && real.lcp_s !== null ? 'usuarios_reales_' + real.ambito : 'laboratorio_movil';
    const nLcp = nivel(lcp, CWV.lcp);
    if (nLcp === 'malo') hallazgos.push(hallazgo('web_lenta', 'web', 'grave', { carga_s: lcp, fuente, bueno_hasta_s: CWV.lcp[0] }));
    else if (nLcp === 'mejorable') hallazgos.push(hallazgo('web_algo_lenta', 'web', 'media', { carga_s: lcp, fuente, bueno_hasta_s: CWV.lcp[0] }));
    else if (nLcp === 'bueno') fortalezas.push('web_rapida');

    if (real && nivel(real.inp_ms, CWV.inp) === 'malo') hallazgos.push(hallazgo('web_responde_lento', 'web', 'media', { respuesta_ms: real.inp_ms, bueno_hasta_ms: CWV.inp[0] }));
    const cls = real && real.cls !== null ? real.cls : web.laboratorio.cls;
    if (nivel(cls, CWV.cls) === 'malo') hallazgos.push(hallazgo('web_salta', 'web', 'media', { movimiento: cls, bueno_hasta: CWV.cls[0] }));
    if (web.laboratorio.peso_kb !== null && web.laboratorio.peso_kb > 5000) hallazgos.push(hallazgo('web_pesada', 'web', 'media', { peso_mb: Math.round(web.laboratorio.peso_kb / 102.4) / 10 }));

    const seo = web.seo_tecnico || {};
    if (seo['is-crawlable'] === false) hallazgos.push(hallazgo('google_no_puede_indexar', 'seo', 'grave', { auditoria: 'is-crawlable' }));
    if (seo['http-status-code'] === false) hallazgos.push(hallazgo('portada_con_error', 'seo', 'grave', { auditoria: 'http-status-code' }));
    if (seo['document-title'] === false) hallazgos.push(hallazgo('sin_titulo', 'seo', 'media', { auditoria: 'document-title' }));
    if (seo['meta-description'] === false) hallazgos.push(hallazgo('sin_descripcion', 'seo', 'leve', { auditoria: 'meta-description' }));
    if (seo['image-alt'] === false) hallazgos.push(hallazgo('imagenes_sin_texto', 'seo', 'leve', { auditoria: 'image-alt' }));
    if (web.puntuacion.seo !== null && web.puntuacion.seo >= 90) fortalezas.push('seo_tecnico_bien');
    if (web.puntuacion.accesibilidad !== null && web.puntuacion.accesibilidad < 70) hallazgos.push(hallazgo('dificil_de_usar', 'web', 'leve', { accesibilidad: web.puntuacion.accesibilidad }));
  }

  // ── Ficha de Google (Places) ──
  if (!ficha || !ficha.ok) sinMedir.push('ficha');
  else if (!ficha.encontrada) hallazgos.push(hallazgo('sin_ficha_google', 'ficha', 'grave', { busqueda: 'sin resultados por nombre y ciudad' }));
  else {
    const f = ficha.ficha;
    const conf = ficha.confianza;
    if (conf === 'baja') sinMedir.push('ficha_por_confirmar');
    else {
      if (f.estado && f.estado !== 'OPERATIONAL') hallazgos.push(hallazgo('ficha_cerrada', 'ficha', 'grave', { estado: f.estado }));
      if (f.resenas === 0) hallazgos.push(hallazgo('sin_resenas', 'resenas', 'grave', { resenas: 0 }));
      else if (f.resenas < 10) hallazgos.push(hallazgo('pocas_resenas', 'resenas', 'media', { resenas: f.resenas }));
      else fortalezas.push('resenas_suficientes');
      if (f.nota !== null && f.resenas > 0 && f.nota < 4) hallazgos.push(hallazgo('nota_baja', 'resenas', 'media', { nota: f.nota }));
      else if (f.nota !== null && f.nota >= 4.5 && f.resenas >= 10) fortalezas.push('buena_nota');
      if (!f.web) hallazgos.push(hallazgo('ficha_sin_web', 'ficha', 'media', { web_en_ficha: 'no' }));
      if (!f.tiene_telefono) hallazgos.push(hallazgo('ficha_sin_telefono', 'ficha', 'media', { telefono_en_ficha: 'no' }));
      if (!f.tiene_horario) hallazgos.push(hallazgo('ficha_sin_horario', 'ficha', 'leve', { horario_en_ficha: 'no' }));
    }
  }

  const orden = { grave: 0, media: 1, leve: 2 };
  hallazgos.sort((a, b) => orden[a.gravedad] - orden[b.gravedad]);
  return { hallazgos, sin_medir: sinMedir, fortalezas };
}

// ── Textos propios de cada hallazgo de la ficha (Marcy recibe ESTOS, nunca
//    texto escrito por el negocio: nombre o descripción son terreno ajeno). ──
export const FICHA_LABELS = {
  sin_ficha_google: { es: 'No aparece en Google Maps al buscar su nombre y ciudad', en: 'Does not show up on Google Maps when searching its name and city' },
  ficha_cerrada: { es: 'Google muestra el negocio como cerrado', en: 'Google shows the business as closed' },
  sin_resenas: { es: 'La ficha de Google no tiene reseñas', en: 'The Google listing has no reviews' },
  pocas_resenas: { es: 'La ficha tiene pocas reseñas (menos de 10)', en: 'The listing has few reviews (under 10)' },
  nota_baja: { es: 'La nota media está por debajo de 4', en: 'The average rating is below 4' },
  ficha_sin_web: { es: 'La ficha no enlaza ninguna web', en: 'The listing does not link to a website' },
  ficha_sin_telefono: { es: 'La ficha no tiene teléfono', en: 'The listing has no phone number' },
  ficha_sin_horario: { es: 'La ficha no tiene horario', en: 'The listing has no opening hours' },
};

/**
 * Resultado de la ficha para el chat: solo enteros, enums y textos de este
 * catálogo. Sin nombre, categoría ni enlaces del negocio.
 * @param {object} ficha  salida de measurePlace
 */
export function fichaForChat(ficha, lang = 'es') {
  if (!ficha || !ficha.ok) return { medida: false };
  if (!ficha.encontrada) return { medida: true, encontrada: false, hallazgos: [FICHA_LABELS.sin_ficha_google[lang === 'en' ? 'en' : 'es']] };
  if (ficha.confianza === 'baja') return { medida: true, encontrada: 'sin_confirmar' };
  const f = ficha.ficha;
  const ids = judge({ ficha }).hallazgos.map((h) => h.id);
  return {
    medida: true,
    encontrada: true,
    resenas: f.resenas,
    nota: f.nota,
    hallazgos: ids.map((id) => FICHA_LABELS[id] && FICHA_LABELS[id][lang === 'en' ? 'en' : 'es']).filter(Boolean),
  };
}
