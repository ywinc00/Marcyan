// Archivo estático /w/iconos.svg: el sprite de los iconos-objeto (ver components/w/objects/sprite.ts).
import { SPRITE_SVG } from '../../components/w/objects/sprite';

export function GET() {
  return new Response(SPRITE_SVG, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8' } });
}
