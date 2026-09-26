// Los datos del estudio como partículas que cambian de forma en la GPU.
//
// Forma 0: los continentes del globo (muestreados de la máscara de agua de
// NASA), para que al dejar el globo parezca que la Tierra se deshace en datos.
// Después, cada dato se convierte en un objeto que se entiende sin leer ejes:
// Forma 1: el avión (el mercado depende del corredor aéreo).
// Forma 2: la luna creciente y doce cuentas en órbita, una por mes, del tamaño
//          de las llegadas del Golfo (el calendario hiyrí manda en la demanda).
// Forma 3: dos pilas de monedas, Oriente Medio frente a la media, en proporción.
import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard, Text, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { datos } from '../tipos'
import { scroll, suave, acota } from '../lib/scroll'
import { R, aPos, PALETA } from './geo'
import { FUENTE_MONO, transGlobo } from './Globo'
import vert from './shaders/particulas.vert.glsl?raw'
import frag from './shaders/particulas.frag.glsl?raw'

const N = 22000
const IMG = import.meta.env.BASE_URL + '../img/'

type Punto = [number, number, number, THREE.Color]

/** Generador determinista: la misma nube de puntos en cada visita. */
function azar(semilla: number) {
  let s = semilla >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

/** Lleva cualquier lista de puntos a exactamente N, repitiendo o descartando al azar. */
function aN(p: Punto[], rnd: () => number): Punto[] {
  if (p.length >= N) return p.sort(() => rnd() - 0.5).slice(0, N)
  const out = p.slice()
  while (out.length < N) { const o = p[Math.floor(rnd() * p.length)]; out.push([o[0] + (rnd() - 0.5) * 0.01, o[1], o[2] + (rnd() - 0.5) * 0.01, o[3]]) }
  return out
}

function formaTierra(mascara: HTMLImageElement, rnd: () => number): Punto[] {
  const W = 720, H = 360, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.drawImage(mascara, 0, 0, W, H)
  const px = g.getImageData(0, 0, W, H).data
  const out: Punto[] = []
  let intentos = 0
  while (out.length < N && intentos++ < N * 40) {
    // muestreo uniforme sobre la esfera, no sobre el rectángulo
    const lo = rnd() * 360 - 180, la = (Math.asin(rnd() * 2 - 1) * 180) / Math.PI
    const x = Math.floor(((lo + 180) / 360) * (W - 1)), y = Math.floor(((90 - la) / 180) * (H - 1))
    if (px[(y * W + x) * 4] > 90) continue // agua
    const v = aPos(la, lo, R * 1.004) // sin girar: la nube copia el giro del globo en cada fotograma
    out.push([v.x, v.y, v.z, PALETA.hielo.clone().lerp(PALETA.verde, rnd() * 0.5)])
  }
  return out
}

/** Punto al azar sobre la superficie de un tubo (eje x) de radio variable. */
function tubo(out: Punto[], rnd: () => number, n: number, x0: number, x1: number, radio: (t: number) => number,
  cy: number, cz: number, color: (t: number, a: number) => THREE.Color) {
  for (let i = 0; i < n; i++) {
    const t = rnd(), a = rnd() * Math.PI * 2, r = radio(t)
    out.push([x0 + (x1 - x0) * t, cy + Math.cos(a) * r, cz + Math.sin(a) * r, color(t, a)])
  }
}

/** Punto al azar sobre un cuadrilátero plano (ala, timón), con un leve grosor. */
function placa(out: Punto[], rnd: () => number, n: number, a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3,
  grosor: THREE.Vector3, color: (u: number, v: number) => THREE.Color) {
  const p = new THREE.Vector3(), q = new THREE.Vector3()
  for (let i = 0; i < n; i++) {
    const u = rnd(), v = rnd()
    p.copy(a).lerp(b, u); q.copy(d).lerp(c, u); p.lerp(q, v).addScaledVector(grosor, (rnd() - 0.5) * 2)
    out.push([p.x, p.y, p.z, color(u, v)])
  }
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

/** 1 · El mercado es el avión: un bimotor de largo radio hecho de luz, con la cola en el
 *  oro de las aerolíneas del Golfo. Sin avión no hay mercado, que es la tesis del estudio. */
function formaAvion(rnd: () => number): Punto[] {
  const out: Punto[] = []
  const blanco = PALETA.hielo.clone().lerp(new THREE.Color('#ffffff'), 0.35).multiplyScalar(0.72) // sin quemar con el bloom
  // fuselaje: morro redondeado, cola que se estrecha y sube; franja verde bajo las ventanillas
  const radio = (t: number) => 0.16 * (t > 0.86 ? Math.sqrt(Math.max(0, 1 - ((t - 0.86) / 0.14) ** 2)) : t < 0.22 ? 0.35 + 0.65 * (t / 0.22) : 1)
  tubo(out, rnd, Math.round(N * 0.36), -1.6, 1.6, radio, 0, 0, (t, a) =>
    Math.abs(Math.cos(a) + 0.1) < 0.06 ? PALETA.verde : t < 0.2 ? PALETA.oro.clone().lerp(blanco, t * 5) : blanco)
  // ventanillas: una línea de puntos brillantes a cada lado
  for (let i = 0; i < N * 0.025; i++) {
    const x = -1.05 + rnd() * 2.2, lado = rnd() < 0.5 ? -1 : 1
    out.push([Math.round(x * 22) / 22, 0.055, lado * 0.152, new THREE.Color('#fff4d6')])
  }
  // alas en flecha, con los extremos verdes
  for (const s of [-1, 1]) placa(out, rnd, Math.round(N * 0.17), V(0.42, -0.05, 0.1 * s), V(-0.28, -0.05, 0.1 * s),
    V(-0.78, 0.06, 1.7 * s), V(-0.5, 0.06, 1.7 * s), V(0, 0.012, 0), (_u, v) => v > 0.93 ? PALETA.verde : blanco)
  // motores bajo las alas
  for (const s of [-1, 1]) tubo(out, rnd, Math.round(N * 0.035), 0.05, 0.55, t => 0.075 * (t < 0.1 ? 0.85 : 1), -0.16, 0.62 * s,
    t => t > 0.92 ? PALETA.verde : blanco)
  // estabilizadores y deriva en oro
  for (const s of [-1, 1]) placa(out, rnd, Math.round(N * 0.035), V(-1.22, 0.06, 0.05 * s), V(-1.5, 0.06, 0.05 * s),
    V(-1.72, 0.1, 0.62 * s), V(-1.58, 0.1, 0.62 * s), V(0, 0.008, 0), () => blanco)
  placa(out, rnd, Math.round(N * 0.07), V(-1.12, 0.12, 0), V(-1.52, 0.12, 0), V(-1.76, 0.78, 0), V(-1.56, 0.78, 0),
    V(0, 0, 0.01), (_u, v) => PALETA.oro.clone().lerp(PALETA.coral, v * 0.3))
  // estela de condensación detrás de los motores
  while (out.length < N) {
    const s = rnd() < 0.5 ? -1 : 1, t = rnd()
    out.push([0.05 - t * 3.2, -0.16 + (rnd() - 0.5) * 0.05 * (1 + t * 4), 0.62 * s + (rnd() - 0.5) * 0.05 * (1 + t * 4),
      PALETA.pizarra.clone().lerp(blanco, 0.6 * (1 - t))])
  }
  return out
}

/** 2 · El calendario es la luna: un creciente (el calendario hiyrí, que mueve el Ramadán
 *  y los Eid) rodeado por un anillo de doce cuentas, una por mes. Cada cuenta crece con el
 *  índice de llegadas del Golfo: las gordas son diciembre y abril, no el verano. */
function formaLuna(rnd: () => number, ram: Set<number>): Punto[] {
  const out: Punto[] = []
  // el creciente es una lente de cara al lector: disco menos disco desplazado, con un grosor
  // que se abomba hacia el centro; así se reconoce desde cualquier giro leve de la cámara
  const R0 = 0.8, dx = 0.36, dy = 0.14, Rc = 0.74
  const nLuna = Math.round(N * 0.5)
  while (out.length < nLuna) {
    const x = (rnd() * 2 - 1) * R0, y = (rnd() * 2 - 1) * R0, r2 = x * x + y * y
    if (r2 > R0 * R0 || (x - dx) ** 2 + (y - dy) ** 2 < Rc * Rc) continue
    const grosor = 0.16 * Math.sqrt(1 - r2 / (R0 * R0))
    const superficie = rnd() < 0.75 ? (rnd() < 0.5 ? -1 : 1) : rnd() * 2 - 1 // casi todo en las caras: se lee el volumen
    const borde = Math.min(Math.sqrt(r2) / R0, 1)
    out.push([x, y, superficie * grosor, PALETA.oro.clone().lerp(new THREE.Color('#fff2d2'), borde * 0.6).multiplyScalar(0.85)])
  }
  const total = datos.idxGolfo.reduce((s, v) => s + v, 0)
  datos.idxGolfo.forEach((v, m) => {
    const a = (m / 12) * Math.PI * 2 - Math.PI / 2, centro = V(Math.cos(a) * 1.55, 0, Math.sin(a) * 1.55)
    const r = 0.05 + 0.13 * Math.cbrt(v / 180), color = ram.has(m) ? PALETA.coral : m === 11 || m === 3 ? PALETA.verde : PALETA.hielo
    const n = Math.round((v / total) * N * 0.36)
    for (let i = 0; i < n; i++) {
      const d = V(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1); if (d.lengthSq() > 1) { i--; continue }
      const p = d.multiplyScalar(r).add(centro)
      out.push([p.x, p.y, p.z, color])
    }
  })
  // la órbita que une las cuentas y un polvo de estrellas alrededor
  while (out.length < N) {
    if (rnd() < 0.6) { const a = rnd() * Math.PI * 2; out.push([Math.cos(a) * 1.55, (rnd() - 0.5) * 0.01, Math.sin(a) * 1.55, PALETA.pizarra]) }
    else { const d = V(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(1.9 + rnd() * 1.2); out.push([d.x, d.y, d.z, PALETA.pizarra.clone().multiplyScalar(0.7)]) }
  }
  return out
}

/** Una pila de monedas: canto de cada moneda, la cara de arriba con un reborde. */
function pila(out: Punto[], rnd: () => number, n: number, cx: number, cz: number, monedas: number, color: THREE.Color, base: number) {
  const r = 0.34, g = 0.052, paso = 0.06
  for (let i = 0; i < n; i++) {
    const k = Math.floor(rnd() * monedas), a = rnd() * Math.PI * 2, y = base + k * paso
    const tapa = k === monedas - 1 && rnd() < 0.45
    const rr = tapa ? (rnd() < 0.35 ? r * 0.82 : Math.sqrt(rnd()) * r) : r
    const ondulado = tapa ? 0 : 0.006 * Math.sin(a * 60) // el estriado del canto
    out.push([cx + Math.cos(a) * (rr + ondulado), y + (tapa ? g : rnd() * g), cz + Math.sin(a) * (rr + ondulado),
      color.clone().multiplyScalar(tapa ? 1.15 : 0.8 + 0.3 * Math.abs(Math.cos(a - 0.6)))])
  }
}

/** 3 · El gasto son monedas: dos pilas, una por el visitante de Oriente Medio y otra por la
 *  media de los veintitrés mercados. La del Golfo casi dobla a la otra, como en los datos. */
function formaMonedas(rnd: () => number): Punto[] {
  const out: Punto[] = []
  const me = datos.gasto.find(g => g.destacado)!, media = datos.gasto.find(g => g.mercado === 'Media general')!
  const mMe = 26, mMedia = Math.max(1, Math.round(mMe * media.yen / me.yen)), base = -0.8
  pila(out, rnd, Math.round(N * 0.6), -0.5, 0, mMe, PALETA.oro, base)
  pila(out, rnd, Math.round(N * 0.3), 0.5, 0, mMedia, PALETA.hielo.clone().lerp(PALETA.pizarra, 0.35), base)
  // unas monedas sueltas en el suelo y un plano de sombra
  while (out.length < N) {
    if (rnd() < 0.5) { const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 1.6; out.push([Math.cos(a) * r, base - 0.004, Math.sin(a) * r * 0.6, PALETA.pizarra.clone().multiplyScalar(0.35)]) }
    else { const k = Math.floor(rnd() * 3), c = [[0.05, 0.55], [1.2, -0.25], [-1.15, 0.45]][k], a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 0.3
      out.push([c[0] + Math.cos(a) * r, base + 0.01, c[1] + Math.sin(a) * r, PALETA.oro.clone().multiplyScalar(0.7)]) }
  }
  return out
}

export default function Particulas() {
  const agua = useTexture(IMG + 'agua.jpg')
  const { viewport, gl } = useThree()
  const puntos = useRef<THREE.Points>(null)
  const rotulos = useRef<(THREE.Group | null)[]>([])

  const ram = useMemo(() => {
    const r = datos.calendario.find(c => c.clave === 'ramadan')!, s = new Set<number>()
    for (let d = new Date(r.inicio); d <= new Date(r.fin); d.setUTCDate(d.getUTCDate() + 1)) s.add(d.getUTCMonth())
    return s
  }, [])

  const geo = useMemo(() => {
    const rnd = azar(2027)
    const formas = [formaTierra(agua.image as HTMLImageElement, rnd), formaAvion(rnd), formaLuna(rnd, ram), formaMonedas(rnd)].map(f => aN(f, rnd))
    const g = new THREE.BufferGeometry()
    formas.forEach((f, k) => {
      const p = new Float32Array(N * 3), c = new Float32Array(N * 3)
      f.forEach(([x, y, z, col], i) => { p.set([x, y, z], i * 3); c.set([col.r, col.g, col.b], i * 3) })
      g.setAttribute(`aP${k}`, new THREE.BufferAttribute(p, 3))
      g.setAttribute(`aC${k}`, new THREE.BufferAttribute(c, 3))
    })
    g.setAttribute('position', g.getAttribute('aP0'))
    g.setAttribute('aAzar', new THREE.BufferAttribute(Float32Array.from({ length: N }, () => rnd()), 1))
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 4)
    return g
  }, [agua, ram])

  const u = useMemo(() => ({ uEtapa: { value: 0 }, uTiempo: { value: 0 }, uTam: { value: 26 }, uPR: { value: gl.getPixelRatio() }, uOp: { value: 0 } }), [gl])
  // material imperativo: con <shaderMaterial uniforms> los valores de cada fotograma no llegaban a la GPU
  const material = useMemo(() => new THREE.ShaderMaterial({ uniforms: u, vertexShader: vert, fragmentShader: frag,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }), [u])
  const lado = viewport.aspect > 1.1 ? viewport.width * 0.2 : 0
  const tmp = useMemo(() => ({ e: new THREE.Euler(), q: new THREE.Quaternion() }), [])

  useFrame(st => {
    const p = puntos.current; if (!p) return
    const pos = scroll.pos
    // la nube aparece mientras el globo se deshace (2,2) y se apaga cuando se rehace (6,5)
    const w = acota((pos - 2.2) / 0.35) * acota((6.55 - pos) / 0.35)
    p.visible = w > 0.01
    u.uOp.value = suave(w)
    u.uTiempo.value = st.clock.elapsedTime
    u.uPR.value = gl.getPixelRatio()
    // etapa continua: 0 = Tierra hasta 2,7; 1 = serie en 3; 2 = reloj en 4; 3 = torres en 5;
    // 4 = otra vez la Tierra en 6, justo antes de que el globo se rehaga encima
    // cada forma se queda quieta mientras su capítulo está en el centro y el cambio ocurre entre
    // dos capítulos (del 0,3 al 0,7): el lector nunca lee un texto delante de una forma a medias
    const entre = (x: number) => Math.floor(x) + acota((x - Math.floor(x) - 0.3) / 0.4)
    const e = pos < 3 ? acota((pos - 2.6) / 0.4) : pos < 5 ? 1 + entre(pos - 3) : pos < 5.4 ? 3 : 3 + acota((pos - 5.4) / 0.6)
    u.uEtapa.value = Math.min(4, e) // scroll.pos ya viene amortiguado: sin segundo filtro que lo retrase
    // cuánto es Tierra ahora: 1 al principio y al final; ahí la nube copia al globo exactamente
    const enTierra = u.uEtapa.value < 1 ? 1 - u.uEtapa.value : u.uEtapa.value > 3 ? u.uEtapa.value - 3 : 0
    const k = suave(enTierra)
    p.scale.setScalar(THREE.MathUtils.lerp(0.9, transGlobo.s, k))
    p.position.set(THREE.MathUtils.lerp(lado * 0.85, transGlobo.x, k), 0, 0)
    const giro = st.clock.elapsedTime * 0.06
    tmp.e.set(0.3, -0.5 + Math.sin(giro) * 0.3, 0.06 * Math.sin(giro * 1.7)) // un leve alabeo, como en vuelo
    tmp.q.setFromEuler(tmp.e).slerp(transGlobo.q, k)
    p.quaternion.copy(tmp.q)
    // rótulos de cada forma, visibles sólo cuando la forma está hecha
    rotulos.current.forEach((r, k) => {
      if (!r) return
      const vis = acota(1 - Math.abs(u.uEtapa.value - (k + 1)) * 2.5) * suave(w)
      r.visible = vis > 0.02
      r.position.copy(p.position); r.quaternion.copy(p.quaternion); r.scale.copy(p.scale)
      r.traverse(o => { const m = (o as THREE.Mesh).material as THREE.Material | undefined; if (m && 'opacity' in m) { m.transparent = true; m.opacity = vis } })
    })
  })

  const txt = { font: FUENTE_MONO, letterSpacing: 0.05, outlineWidth: 0.003, outlineColor: '#02070b' }
  const cifra = { font: import.meta.env.BASE_URL + 'fuentes/source-serif-600.woff', outlineWidth: 0.004, outlineColor: '#02070b' }
  const fmtN = (v: number) => v.toLocaleString('es-ES').replace(/^(\d)(\d{3})$/, '$1.$2')
  const llegadas2025 = datos.serie['2025'].reduce<number>((t, v) => t + (v ?? 0), 0)
  const me = datos.gasto.find(g => g.destacado)!, media = datos.gasto.find(g => g.mercado === 'Media general')!
  const gastoPilas = [
    { nombre: 'Oriente Medio', yen: me.yen, x: -0.5, alto: -0.8 + 26 * 0.06, color: '#e9b872' },
    { nombre: 'media de 23 mercados', yen: media.yen, x: 0.5, alto: -0.8 + Math.round(26 * media.yen / me.yen) * 0.06, color: '#cfdcda' },
  ]
  return (
    <>
      <points ref={puntos} geometry={geo} material={material} frustumCulled={false} />

      {/* 1 · el avión: la cifra del mercado sobre el ala */}
      <group ref={el => { rotulos.current[0] = el }}>
        <Billboard position={[0.35, 1.0, 0]}>
          <Text {...cifra} fontSize={0.16} color="#e6ecea">{fmtN(llegadas2025)}</Text>
          <Text {...txt} fontSize={0.055} position={[0, -0.14, 0]} color="#a9bbbc">viajeros del Golfo en 2025</Text>
          <Text {...txt} fontSize={0.055} position={[0, -0.23, 0]} color="#ef7a5f">abril de 2026: −71,2 %</Text>
        </Billboard>
      </group>

      {/* 2 · la luna: los meses que importan junto a su cuenta */}
      <group ref={el => { rotulos.current[1] = el }}>
        {[[11, 'diciembre · pico'], [3, 'abril · pico'], [7, 'agosto · bajo']].map(([m, t]) => {
          const a = ((m as number) / 12) * Math.PI * 2 - Math.PI / 2
          return (
            <Billboard key={m} position={[Math.cos(a) * 1.55, 0.42, Math.sin(a) * 1.55]}>
              <Text {...txt} fontSize={0.075} color={m === 7 ? '#a9bbbc' : '#4fd6b6'}>{t as string}</Text>
            </Billboard>
          )
        })}
        {[...ram].slice(0, 1).map(m => {
          const a = (m / 12) * Math.PI * 2 - Math.PI / 2
          return (
            <Billboard key="ram" position={[Math.cos(a) * 1.55, -0.3, Math.sin(a) * 1.55]}>
              <Text {...txt} fontSize={0.07} color="#ef7a5f">Ramadán 2027</Text>
            </Billboard>
          )
        })}
      </group>

      {/* 3 · las monedas: importe sobre cada pila y a quién corresponde */}
      <group ref={el => { rotulos.current[2] = el }}>
        {gastoPilas.map(g => (
          <Billboard key={g.nombre} position={[g.x, g.alto + 0.28, 0]}>
            <Text {...cifra} fontSize={0.13} color={g.color}>{g.yen.toLocaleString('es-ES')} ¥</Text>
            <Text {...txt} fontSize={0.055} position={[0, -0.13, 0]} color="#a9bbbc">{g.nombre}</Text>
          </Billboard>
        ))}
      </group>
    </>
  )
}
