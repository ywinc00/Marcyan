// PostCSS — breakpoints únicos como fuente de verdad.
// @csstools/postcss-global-data hace que los @custom-media de src/styles/media.css
// estén disponibles en TODA hoja procesada (incluido cada <style> scopeado de Astro),
// y postcss-custom-media los expande a (min-width: …). Así "@media (--md)" funciona
// en cualquier componente sin repetir valores de breakpoint.
import postcssGlobalData from '@csstools/postcss-global-data';
import postcssCustomMedia from 'postcss-custom-media';

export default {
  plugins: [
    postcssGlobalData({ files: ['src/styles/media.css'] }),
    postcssCustomMedia(),
  ],
};
