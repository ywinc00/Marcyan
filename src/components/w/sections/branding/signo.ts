// Signo de la marca de EJEMPLO "Tu Marca" (G08 ronda 1, I3): monograma "m." en un círculo.
// Sustituye al sello dentado con estrella de 4 puntas (la chispa se lee como el icono de "IA", E-56).
// Una sola geometría para el sello relleno (SelloMarca), las láminas del personalizador y el plano
// del hero (PlanoTuMarca), en una caja de 200 × 200 con centro 100,100:
//   disco r 92 · "m" de dos arcos de radio 18 con astas en x 58, 94 y 130 (trazo 15, de y 69 a 131)
//   · punto final r 8,5 en 152,124 (la "m." de la palabra).
// Diseñado por nosotros; nunca la marca de un cliente (E-32, E-47).
export const SIGNO = {
  r: 92,
  trazo: 15,
  m: 'M58 131V87a18 18 0 0 1 36 0V131M94 87a18 18 0 0 1 36 0V131',
  punto: { cx: 152, cy: 124, r: 8.5 },
  /** Guías de construcción: astas, altura de x y línea base. */
  astas: [58, 94, 130],
  xAlto: 69,
  base: 131,
} as const;
