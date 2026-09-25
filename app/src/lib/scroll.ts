// Estado del scroll compartido entre el DOM (GSAP ScrollTrigger) y la escena 3D.
//
// No es estado de React a propósito: cambia en cada fotograma y la escena lo
// lee dentro de useFrame. Si fuera estado de React, cada píxel de scroll
// volvería a renderizar el árbol entero.
export const scroll = {
  /** capítulo continuo y amortiguado: 2.5 = a mitad del capítulo 2. Es lo que lee la escena */
  pos: 0,
  /** dónde está de verdad el scroll; `pos` lo persigue con un muelle */
  objetivo: 0,
  /** velocidad del muelle, para que no haya frenazos */
  vel: 0,
  /** progreso de toda la página, 0..1 */
  total: 0,
  /** cuánto se han abierto las hojas de la portada, 0..1 */
  puertas: 0,
}

export const CAPITULOS = [
  { id: 'portada', titulo: 'Portada' },
  { id: 'corredor', titulo: 'El corredor' },
  { id: 'ahora', titulo: 'Ahora y lo que viene' },
  { id: 'mercado', titulo: 'El mercado' },
  { id: 'estacion', titulo: 'Cuándo' },
  { id: 'gasto', titulo: 'Cuánto gasta' },
  { id: 'veredicto', titulo: 'Veredicto' },
  { id: 'viaje', titulo: 'El viaje' },
  { id: 'cierre', titulo: 'Siguiente paso' },
] as const

/** Peso de un capítulo en la posición actual: 1 en su centro, 0 a `ancho` capítulos. */
export const peso = (c: number, ancho = 0.85): number => Math.max(0, 1 - Math.abs(scroll.pos - c) / ancho)
export const suave = (t: number): number => t * t * (3 - 2 * t)
export const acota = (v: number, a = 0, b = 1): number => Math.min(b, Math.max(a, v))

/** Muelle críticamente amortiguado: `pos` alcanza a `objetivo` sin rebotar ni dar
 *  tirones, aunque la rueda del ratón avance a saltos. Se llama una vez por fotograma. */
export function amortigua(dt: number): void {
  const w = 7 // rigidez: más alto, más pegado al dedo
  const d = scroll.pos - scroll.objetivo
  const a = -w * w * d - 2 * w * scroll.vel
  scroll.vel += a * Math.min(dt, 0.05)
  scroll.pos += scroll.vel * Math.min(dt, 0.05)
  if (Math.abs(d) > 3) { scroll.pos = scroll.objetivo; scroll.vel = 0 } // saltos del índice: sin viaje eterno
}
