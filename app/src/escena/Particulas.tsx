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
import { crearObjetos, muestrear, PILAS, type Punto } from './Objetos'
import vert from './shaders/particulas.vert.glsl?raw'
import frag from './shaders/particulas.frag.glsl?raw'

const N = 22000
const IMG = import.meta.env.BASE_URL + '../img/'


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

export default function Particulas() {
  const [agua, mapaLuna, relieveLuna] = useTexture([IMG + 'agua.jpg', IMG + 'luna.jpg', IMG + 'luna-relieve.jpg'])
  const obj = useMemo(() => crearObjetos(mapaLuna, relieveLuna), [mapaLuna, relieveLuna])
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
    const formas = [formaTierra(agua.image as HTMLImageElement, rnd), ...obj.formas.map(f => muestrear(f, N, rnd))].map(f => aN(f, rnd))
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
  }, [agua, obj])

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
    // los objetos sólidos se materializan cuando el enjambre ya ha llegado, y se deshacen
    // antes de que salga: las partículas quedan como un brillo alrededor
    obj.raiz.position.copy(p.position); obj.raiz.quaternion.copy(p.quaternion); obj.raiz.scale.copy(p.scale)
    let solido = 0
    obj.formas.forEach((f, k) => {
      const cerca = acota((0.32 - Math.abs(u.uEtapa.value - (k + 1))) / 0.24) * acota(w * 1.5)
      obj.dis[k].value = 1 - suave(cerca)
      f.visible = cerca > 0.001
      solido = Math.max(solido, suave(cerca))
    })
    u.uOp.value = suave(w) * (1 - 0.94 * solido)
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
    { nombre: 'Oriente Medio', yen: me.yen, x: -0.5, alto: PILAS.base + PILAS.altas * PILAS.paso, color: '#e9b872' },
    { nombre: 'media de 23 mercados', yen: media.yen, x: 0.5, alto: PILAS.base + Math.round(PILAS.altas * media.yen / me.yen) * PILAS.paso, color: '#cfdcda' },
  ]
  return (
    <>
      <points ref={puntos} geometry={geo} material={material} frustumCulled={false} />
      <primitive object={obj.raiz} />

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
