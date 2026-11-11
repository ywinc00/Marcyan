// Negocio de ejemplo PROPIO de cada página (v8, dueño 2026-11-08): cada barrio y cada ciudad
// enseña su negocio con su ficha, su color y su mapa, para que tres landings no parezcan la misma.
// Sin reseñas, sin precios y sin teléfonos reales (contrato de objetos de ejemplo).
import type { NegocioFicha } from './FichaMapa.astro';

export type NegocioId = 'clinica' | 'taller' | 'carga' | 'cafe' | 'barberia';

export function fichaDe(id: NegocioId, lang: 'es' | 'en' = 'es'): NegocioFicha {
  const en = lang === 'en';
  switch (id) {
    case 'clinica': return {
      nombre: en ? 'Your Clinic' : 'Tu Clínica', cat: en ? 'Dentist · First Colony, Sugar Land' : 'Dentista · First Colony, Sugar Land',
      svc: en ? 'cleanings · braces · emergencies' : 'limpieza · ortodoncia · urgencias', ico: 'diente',
      acc: '#1f4a3a', on: '#f7f4ee', tile: '#e6ece6', tileInk: '#1f4a3a', mapa: 1,
      sr: en ? 'Example map listing of a dental clinic in Sugar Land.' : 'Ficha de mapa de ejemplo de una clínica dental de Sugar Land.',
    };
    case 'taller': return {
      nombre: en ? 'Your Auto Shop' : 'Tu Taller', cat: en ? 'Auto repair · Katy' : 'Taller mecánico · Katy',
      svc: en ? 'brakes · oil · A/C' : 'frenos · aceite · aire acondicionado', ico: 'llave',
      acc: '#141414', on: '#fafaf8', tile: '#f4e7df', tileInk: '#9c3a12', mapa: 2,
      sr: en ? 'Example map listing of an auto repair shop in Katy.' : 'Ficha de mapa de ejemplo de un taller mecánico de Katy.',
    };
    case 'carga': return {
      nombre: en ? 'Your Freight' : 'Tu Carga', cat: en ? 'Freight forwarder · Doral' : 'Agencia de carga · Doral',
      svc: en ? 'air · ocean · customs' : 'aéreo · marítimo · aduanas', ico: 'avion',
      acc: '#101113', on: '#f2f0eb', tile: '#ffe3da', tileInk: '#c23a17', mapa: 3,
      sr: en ? 'Example map listing of a freight forwarder in Doral.' : 'Ficha de mapa de ejemplo de una agencia de carga de Doral.',
    };
    case 'cafe': return {
      nombre: en ? 'Your Café' : 'Tu Café', cat: en ? 'Cuban café · Hialeah' : 'Cafetería cubana · Hialeah',
      svc: en ? 'walk-up window · pastelitos · to go' : 'ventanita · pastelitos · para llevar', ico: 'taza',
      acc: '#b4492f', on: '#fff8ef', tile: '#f6e3d6', tileInk: '#8a3220', mapa: 4,
      grupos: en
        ? [{ d: 'Every day', dias: [0, 1, 2, 3, 4, 5, 6], h: '6 AM to 8 PM', cierra: '8 PM', abre: '6 AM', a: 6, c: 20 }]
        : [{ d: 'Todos los días', dias: [0, 1, 2, 3, 4, 5, 6], h: '6 a. m. a 8 p. m.', cierra: '8 p. m.', abre: '6 a. m.', a: 6, c: 20 }],
      sr: en ? 'Example map listing of a Cuban café in Hialeah.' : 'Ficha de mapa de ejemplo de una cafetería cubana de Hialeah.',
    };
    case 'barberia': return {
      nombre: en ? 'Your Barbershop' : 'Tu Barbería', cat: en ? 'Barbershop · Little Havana, Miami' : 'Barbería · Pequeña Habana, Miami',
      svc: en ? 'cuts · beard · walk-ins' : 'cortes · barba · sin cita', ico: 'tijera',
      acc: '#1b2a4a', on: '#f4f1ea', tile: '#e4e8f1', tileInk: '#1b2a4a', mapa: 3,
      sr: en ? 'Example map listing of a barbershop in Little Havana, Miami.' : 'Ficha de mapa de ejemplo de una barbería de la Pequeña Habana, en Miami.',
    };
  }
}

/** Negocio de cada barrio (el mismo que enseña su portada). */
export const NEGOCIO_BARRIO: Record<string, NegocioId> = { 'sugar-land': 'clinica', katy: 'taller', doral: 'carga', hialeah: 'cafe' };
