// Los datos del estudio como partículas que cambian de forma en la GPU.
//
// Forma 0: los continentes del globo (muestreados de la máscara de agua de
// NASA), para que al dejar el globo parezca que la Tierra se deshace en datos.
// Forma 1: llegadas mes a mes 2023-2026 (una columna por mes y año).
// Forma 2: el reloj de estacionalidad (Golfo dentro, España fuera, Ramadán).
// Forma 3: gasto por visitante, una torre por mercado.
// Cada forma tiene el mismo número de partículas, repartidas en proporción al
// dato: una columna el doble de alta tiene el doble de partículas.
import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Billboard, Text, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { datos } from '../tipos'
import { scroll, peso, suave, acota } from '../lib/scroll'
import { R, aPos, Q_CORREDOR, PALETA } from './geo'
import { FUENTE_MONO } from './Globo'
import vert from './shaders/particulas.vert.glsl?raw'
import frag from './shaders/particulas.frag.glsl?raw'

const N = 26000
const IMG = import.meta.env.BASE_URL + '../img/'

type Punto = [number, number, number, THREE.Color]

/** Generador determinista: la misma nube de puntos en cada visita. */
function azar(semilla: number) {
  let s = semilla >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296)
}

/** Reparte `n` puntos dentro de una caja, en proporción a su volumen respecto a `total`. */
function caja(out: Punto[], rnd: () => number, cx: number, cz: number, ancho: number, fondo: number, alto: number, color: THREE.Color, n: number) {
  for (let i = 0; i < n; i++) {
    // más densidad en las aristas: la columna se lee como un volumen, no como una nube
    const borde = rnd() < 0.45
    let x = (rnd() - 0.5) * ancho, z = (rnd() - 0.5) * fondo
    if (borde) { if (rnd() < 0.5) x = Math.sign(x || 1) * ancho / 2; else z = Math.sign(z || 1) * fondo / 2 }
    out.push([cx + x, rnd() * alto, cz + z, color])
  }
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
    const v = aPos(la, lo, R * 1.006).applyQuaternion(Q_CORREDOR)
    out.push([v.x, v.y, v.z, PALETA.hielo.clone().lerp(PALETA.verde, rnd() * 0.5)])
  }
  return out
}

function formaSerie(rnd: () => number): Punto[] {
  const out: Punto[] = [], anos = ['2023', '2024', '2025', '2026']
  const total = anos.reduce((s, a) => s + datos.serie[a].reduce<number>((t, v) => t + (v ?? 0), 0), 0)
  anos.forEach((a, j) => datos.serie[a].forEach((v, m) => {
    if (v == null) return
    const color = a === '2026' ? (m >= 1 && m <= 3 ? PALETA.coral : PALETA.verde) : PALETA.pizarra.clone().lerp(PALETA.hielo, j * 0.12)
    caja(out, rnd, (m - 5.5) * 0.3, (j - 1.5) * 0.42, 0.2, 0.26, (v / 9000) * 1.9, color, Math.round((v / total) * N * 0.92))
  }))
  // un plano de base muy tenue, para que las columnas se apoyen en algo
  while (out.length < N) out.push([(rnd() - 0.5) * 3.8, 0, (rnd() - 0.5) * 1.9, PALETA.pizarra.clone().multiplyScalar(0.45)])
  return out
}

function formaReloj(rnd: () => number, ram: Set<number>): Punto[] {
  const out: Punto[] = [], H = (v: number) => (v / 180) * 1.35
  const total = datos.idxGolfo.reduce((s, v) => s + v, 0) + datos.idxEspana.reduce((s, v) => s + v, 0)
  for (let m = 0; m < 12; m++) {
    const a = (m / 12) * Math.PI * 2
    for (const [v, r, color] of [[datos.idxGolfo[m], 0.72, PALETA.verde], [datos.idxEspana[m], 1.08, PALETA.oro]] as const) {
      const n = Math.round((v / total) * N * 0.8)
      for (let i = 0; i < n; i++) {
        const da = (rnd() - 0.5) * 0.2, dr = (rnd() - 0.5) * 0.12
        out.push([Math.sin(a + da) * (r + dr), rnd() * H(v), -Math.cos(a + da) * (r + dr), color])
      }
    }
  }
  // la esfera del reloj: el disco del índice 100 y el Ramadán en coral sobre el suelo
  while (out.length < N) {
    const a = rnd() * Math.PI * 2, r = 0.35 + rnd() * 1.0, mes = Math.floor(((a / (Math.PI * 2)) * 12 + 0.5) % 12)
    const enRam = ram.has(mes)
    const nivel = rnd() < 0.35 && !enRam ? H(100) : 0
    out.push([Math.sin(a) * r, nivel, -Math.cos(a) * r, enRam ? PALETA.coral : PALETA.pizarra.clone().multiplyScalar(nivel ? 0.7 : 0.4)])
  }
  return out
}

function formaGasto(rnd: () => number): Punto[] {
  const out: Punto[] = [], total = datos.gasto.reduce((s, g) => s + g.yen, 0), n = datos.gasto.length
  datos.gasto.forEach((g, i) => {
    const color = g.destacado ? PALETA.verde : g.mercado === 'Media general' ? PALETA.hielo : PALETA.pizarra
    caja(out, rnd, (i - (n - 1) / 2) * 0.36, 0, 0.22, 0.22, (g.yen / 560000) * 1.9, color, Math.round((g.yen / total) * N * 0.9))
  })
  while (out.length < N) out.push([(rnd() - 0.5) * 3.6, 0, (rnd() - 0.5) * 0.7, PALETA.pizarra.clone().multiplyScalar(0.4)])
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
    const formas = [formaTierra(agua.image as HTMLImageElement, rnd), formaSerie(rnd), formaReloj(rnd, ram), formaGasto(rnd)].map(f => aN(f, rnd))
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

  useFrame((st, dt) => {
    const p = puntos.current; if (!p) return
    // la nube vive entre el final de «ahora» y el final del gasto
    const w = Math.max(peso(3), peso(4), peso(5), acota((scroll.pos - 2.35) * 2.5) * acota((5.9 - scroll.pos) * 2))
    p.visible = w > 0.01
    u.uOp.value = suave(w)
    u.uTiempo.value = st.clock.elapsedTime
    u.uPR.value = gl.getPixelRatio()
    // etapa continua: 0 = Tierra en 2.5, 1 = serie en 3, 2 = reloj en 4, 3 = torres en 5
    const e = scroll.pos < 3 ? acota((scroll.pos - 2.5) * 2) : 1 + acota(scroll.pos - 3.15, 0, 2) * 1.08
    u.uEtapa.value += (Math.min(3, e) - u.uEtapa.value) * (1 - Math.exp(-dt * 5))
    // la Tierra de partículas coincide con el globo; los datos, más pequeños y a la derecha
    const enTierra = 1 - acota(u.uEtapa.value)
    const escala = THREE.MathUtils.lerp(0.9, 0.72, enTierra) // 0,72 = tamaño del globo en el relevo
    p.scale.setScalar(escala)
    p.position.set(lado * THREE.MathUtils.lerp(0.8, 1, enTierra), THREE.MathUtils.lerp(-0.6, 0, enTierra), 0)
    const giro = st.clock.elapsedTime * 0.06
    p.rotation.set(THREE.MathUtils.lerp(0.42, 0, enTierra), THREE.MathUtils.lerp(-0.55 + Math.sin(giro) * 0.25, 0, enTierra), 0)
    // rótulos de cada forma, visibles sólo cuando la forma está hecha
    rotulos.current.forEach((r, k) => {
      if (!r) return
      const vis = acota(1 - Math.abs(u.uEtapa.value - (k + 1)) * 2.5) * suave(w)
      r.visible = vis > 0.02
      r.position.copy(p.position); r.rotation.copy(p.rotation); r.scale.copy(p.scale)
      r.traverse(o => { const m = (o as THREE.Mesh).material as THREE.Material | undefined; if (m && 'opacity' in m) { m.transparent = true; m.opacity = vis } })
    })
  })

  const txt = { font: FUENTE_MONO, letterSpacing: 0.05, outlineWidth: 0.003, outlineColor: '#02070b' }
  const n = datos.gasto.length
  return (
    <>
      <points ref={puntos} geometry={geo} material={material} frustumCulled={false} />

      {/* 1 · serie: años a un lado, meses delante */}
      <group ref={el => { rotulos.current[0] = el }}>
        {['2023', '2024', '2025', '2026'].map((a, j) => (
          <Billboard key={a} position={[2.0, 0.02, (j - 1.5) * 0.42]}>
            <Text {...txt} fontSize={0.07} color={a === '2026' ? '#4fd6b6' : '#8aa0a6'} anchorX="left">{a}</Text>
          </Billboard>
        ))}
        {datos.meses.map((m, i) => (
          <Billboard key={m} position={[(i - 5.5) * 0.3, -0.02, 1.02]}>
            <Text {...txt} fontSize={0.06} color={i >= 1 && i <= 3 ? '#ef7a5f' : '#a9bbbc'}>{m}</Text>
          </Billboard>
        ))}
        <Billboard position={[(3 - 5.5) * 0.3, (6322 / 9000) * 1.9 + 0.22, 0.63]}>
          <Text {...txt} fontSize={0.07} color="#ef7a5f">abr 2026 · 1.819 (−71,2 %)</Text>
        </Billboard>
      </group>

      {/* 2 · reloj: meses alrededor */}
      <group ref={el => { rotulos.current[1] = el }}>
        {datos.meses.map((m, i) => {
          const a = (i / 12) * Math.PI * 2
          return (
            <Billboard key={m} position={[Math.sin(a) * 1.45, 0.02, -Math.cos(a) * 1.45]}>
              <Text {...txt} fontSize={0.075} color={ram.has(i) ? '#ef7a5f' : i === 11 || i === 3 ? '#4fd6b6' : '#a9bbbc'}>{m}</Text>
            </Billboard>
          )
        })}
        <Billboard position={[0, (100 / 180) * 1.35 + 0.08, -1.2]}>
          <Text {...txt} fontSize={0.055} color="#74898a">100 · mes medio</Text>
        </Billboard>
      </group>

      {/* 3 · gasto: mercado debajo, importe sobre los dos que importan */}
      <group ref={el => { rotulos.current[2] = el }}>
        {datos.gasto.map((g, i) => {
          const x = (i - (n - 1) / 2) * 0.36, h = (g.yen / 560000) * 1.9
          return (
            <group key={g.mercado}>
              <Billboard position={[x, -0.08, 0.3]}>
                <Text {...txt} fontSize={0.05} maxWidth={0.34} textAlign="center" color={g.destacado ? '#4fd6b6' : '#8aa0a6'}>{g.mercado}</Text>
              </Billboard>
              {(g.destacado || g.mercado === 'Media general') && (
                <Billboard position={[x, h + 0.14, 0]}>
                  <Text font={import.meta.env.BASE_URL + 'fuentes/source-serif-600.woff'} fontSize={0.1}
                    color={g.destacado ? '#4fd6b6' : '#cfdcda'} outlineWidth={0.004} outlineColor="#02070b">
                    {g.yen.toLocaleString('es-ES')} ¥
                  </Text>
                </Billboard>
              )}
            </group>
          )
        })}
      </group>
    </>
  )
}
