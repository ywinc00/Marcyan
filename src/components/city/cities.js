// Lo que cambia de una ciudad a otra en el hub "el viaje" (Houston, Miami): datos del planeta, puntos de la portada,
// encuadre del acercamiento, mapa de zonas y silueta del pie. Todo lo demás (motor, historia, ritmo) es común.
// Las coordenadas son [longitud, latitud]. Las distancias de los puntos se miden en km desde el centro de la ciudad.
export const CITIES = {
  houston: {
    center: [-95.369, 29.760],
    start: [-97, 33],                                  // cara del planeta al empezar
    globe: '/geo/houston-globo-110.json',
    globe50: '/geo/mundo-50.json',
    // portada, escritorio: escala final (km a px, por el factor de tamaño de la pantalla) y dónde se posa la ciudad
    // dentro de la lente (fracciones del radio del planeta respecto a su centro)
    desk: { kmpx: 3.3, target: [0.107, -0.027] },
    // puntos de la portada, en el orden de sus textos: arriba, izquierda, abajo, encendido (busca y encuentra)
    // Pasadena (70,5 % hispano, censo 2020) y Gulfton (inmigración centroamericana), y el poder de compra de Katy y
    // The Woodlands
    zones: [
      { at: [-95.489, 30.166], side: 'up', wire: 54, dx: -70 },
      { at: [-95.824, 29.786], side: 'up', wire: 86, dx: -150 },
      { at: [-95.478, 29.718], side: 'down', wire: 70, dx: -230 },
      { at: [-95.209, 29.691], side: 'up', wire: 70, dx: -120, lit: true },
    ],
    mobile: 'houston',
    map: {
      file: '/geo/houston-mapa.json',
      // el encuadre final: toda el área metropolitana con la bahía de Galveston a la derecha
      view: [[-95.93, 29.49], [-94.86, 30.23]],
      at: { 'Houston': [-95.369, 29.760], 'Katy': [-95.824, 29.786], 'Sugar Land': [-95.635, 29.620], 'The Woodlands': [-95.489, 30.166], 'Pearland': [-95.286, 29.564], 'Pasadena': [-95.209, 29.691] },
    },
  },
  miami: {
    center: [-80.1918, 25.7617],
    start: [-90, 30],
    globe: '/geo/miami-globo-110.json',
    globe50: '/geo/mundo-50.json',
    // el área es mucho más compacta que la de Houston (las zonas caben en 27 × 20 km): el acercamiento llega más cerca
    desk: { kmpx: 11.5, target: [0.2, -0.02] },
    // Hialeah (95 % hispano, raíz cubana), Doral (comunidad venezolana), Kendall y Miami Beach (encendido)
    zones: [
      { at: [-80.2781, 25.8576], side: 'up', wire: 56, dx: -100 },
      { at: [-80.3553, 25.8195], side: 'down', wire: 46, dx: -210 },
      { at: [-80.3173, 25.6793], side: 'down', wire: 60, dx: -150 },
      { at: [-80.1300, 25.7907], side: 'up', wire: 70, dx: -120, lit: true },
    ],
    mobile: 'miami',
    map: {
      file: '/geo/miami-mapa.json',
      // el encuadre final: de Kendall y Doral al oeste hasta el mar, con Miami Beach y la bahía a la derecha
      view: [[-80.47, 25.62], [-80.07, 25.99]],
      at: { 'Miami': [-80.1918, 25.7617], 'Doral': [-80.3553, 25.8195], 'Hialeah': [-80.2781, 25.8576], 'Miami Beach': [-80.1300, 25.7907], 'Coral Gables': [-80.2684, 25.7215], 'Kendall': [-80.3173, 25.6793], 'Aventura': [-80.1392, 25.9565] },
    },
  },
};
