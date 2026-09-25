// Estado del scroll compartido entre el DOM (GSAP ScrollTrigger) y la escena 3D.
//
// No es estado de React a propósito: cambia en cada fotograma y la escena lo
// lee dentro de useFrame. Si fuera estado de React, cada píxel de scroll
// volvería a renderizar el árbol entero.
export const scroll = {
  /** capítulo continuo: 2.5 = a mitad del capítulo 2 */
  pos: 0,
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
  { id: 'cierre', titulo: 'Siguiente paso' },
] as const

/** Peso de un capítulo en la posición actual: 1 en su centro, 0 a `ancho` capítulos. */
export const peso = (c: number, ancho = 0.85): number => Math.max(0, 1 - Math.abs(scroll.pos - c) / ancho)
export const suave = (t: number): number => t * t * (3 - 2 * t)
export const acota = (v: number, a = 0, b = 1): number => Math.min(b, Math.max(a, v))
