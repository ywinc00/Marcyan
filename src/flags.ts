// Feature flags build-time (Growth OS).
// GROWTH_OS: activa el "Diagnóstico digital gratis", las herramientas y el teaser.
// Si se pone en false, las páginas nuevas hacen return temprano (404-ish) y el
// teaser no se renderiza — el build simplemente las omite del recorrido público.
export const GROWTH_OS = true;
