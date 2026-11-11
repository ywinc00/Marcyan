// ─────────────────────────────────────────────────────────────
// Registro de iconos-objeto (design/rediseno-workos.md §2.8).
// Clave = `id` del producto en src/i18n/pricing.ts (que NO se toca).
// tone: acento del icono (teal solo en los dos productos de IA).
// glyph: nombre del dibujo, solo documental (el marcado vive en glyphs.ts).
// ─────────────────────────────────────────────────────────────

export type IconoTone = 'gold' | 'teal';
export type IconoId =
  | 'diseno-web'
  | 'seo-local'
  | 'ia-conversacional'
  | 'ecommerce'
  | 'branding'
  | 'seo-ia'
  | 'mantenimiento';

export interface IconoObjetoDef {
  id: IconoId;
  tone: IconoTone;
  glyph: string;
}

export const ICONOS: Record<IconoId, IconoObjetoDef> = {
  'diseno-web': { id: 'diseno-web', tone: 'gold', glyph: 'pantalla' },
  'seo-local': { id: 'seo-local', tone: 'gold', glyph: 'pin' },
  'ia-conversacional': { id: 'ia-conversacional', tone: 'teal', glyph: 'burbuja-marcy' },
  ecommerce: { id: 'ecommerce', tone: 'gold', glyph: 'bolsa' },
  branding: { id: 'branding', tone: 'gold', glyph: 'sello' },
  'seo-ia': { id: 'seo-ia', tone: 'teal', glyph: 'chispa-ia' },
  mantenimiento: { id: 'mantenimiento', tone: 'gold', glyph: 'llave' },
};
