// La Tierra en 4K con el sol de este momento, las nubes reales de ayer (NASA
// VIIRS), las rutas del corredor como líneas con degradado y flujo, los aviones
// de cada ruta y el tráfico real de OpenSky. Visible en portada, corredor,
// «ahora» y cierre; entre medias se deshace en partículas (ver Particulas.tsx).
import { useEffect, useMemo, useRef } from 'react'
import Mundo, { estadoMundo } from './Mundo'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { datos, type Trafico } from '../tipos'
import { scroll, suave, acota } from '../lib/scroll'
import { subsolar, ayerUTC } from '../lib/vivo'
import { R, aPos, arco, Q_CORREDOR, Q_GOLFO, Q_JAPON, PALETA } from './geo'
import tierraVert from './shaders/tierra.vert.glsl?raw'
import tierraFrag from './shaders/tierra.frag.glsl?raw'
import nubesFrag from './shaders/nubes.frag.glsl?raw'
import atmosferaVert from './shaders/atmosfera.vert.glsl?raw'
import atmosferaFrag from './shaders/atmosfera.frag.glsl?raw'
import rutaVert from './shaders/ruta.vert.glsl?raw'
import rutaFrag from './shaders/ruta.frag.glsl?raw'

const IMG = import.meta.env.BASE_URL + '../img/'
export const FUENTE_MONO = import.meta.env.BASE_URL + 'fuentes/plex-mono-500.woff'
const GIBS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0'
  // 2048 px bastan para las nubes (van por encima del relieve 4K) y la carga es cuatro veces menor
  + '&CRS=EPSG:4326&BBOX=-90,-180,90,180&WIDTH=2048&HEIGHT=1024&FORMAT=image/jpeg&LAYERS=VIIRS_NOAA20_CorrectedReflectance_TrueColor'

const SIN = new Set(new URLSearchParams(location.search).get('sin')?.split(',') ?? [])

/** Cuánto se ha deshecho el globo en partículas: 0 entero, 1 del todo. Se deshace al
 *  llegar a los datos y se rehace después del gasto, cuando las partículas vuelven a
 *  ser continentes. Por tramos: una mezcla de pesos lo atenuaba entre capítulos. */
export const disolucion = (): number => {
  const p = scroll.pos
  if (p < 2.25) return 0
  if (p < 2.75) return suave((p - 2.25) / 0.5)
  if (p < 6.05) return 1
  return 1 - suave(acota((p - 6.05) / 0.5))
}
export const pesoGlobo = (): number => 1 - disolucion()

/** Dónde está el globo en cada fotograma: las partículas lo copian para nacer justo
 *  encima de sus continentes y volver a ellos. */
export const transGlobo = { q: new THREE.Quaternion(), x: 0, s: 1 }

interface RutaDibujada { puntos: THREE.Vector3[]; curva: THREE.CatmullRomCurve3; anunciada: boolean; frecuencia: number }

export default function Globo({ trafico }: { trafico: Trafico | null }) {
  const [dia, noche, agua, relieve, nubesGen] = useTexture([
    IMG + 'dia-4k.jpg', IMG + 'noche-4k.jpg', IMG + 'agua.jpg', IMG + 'relieve.jpg', IMG + 'nubes.jpg'])
  const { gl, viewport } = useThree()
  useMemo(() => {
    dia.colorSpace = noche.colorSpace = THREE.SRGBColorSpace
    for (const t of [dia, noche]) t.anisotropy = gl.capabilities.getMaxAnisotropy()
  }, [dia, noche, gl])

  const grupo = useRef<THREE.Group>(null)
  const rotulos = useRef<THREE.Group>(null)
  const tierra = useRef<THREE.Mesh>(null)
  // ocultación de rótulos por la cara de la esfera: un producto escalar por ciudad, en vez
  // del raycast de drei contra 25.000 triángulos en cada fotograma, que daba tirones
  const spans = useRef<Record<string, HTMLSpanElement | null>>({})
  const ciudades = useMemo(() => ({ Dubái: aPos(25.25, 55.36), Doha: aPos(25.27, 51.61), Riad: aPos(24.71, 46.68),
    Osaka: aPos(34.43, 135.23), Tokio: aPos(35.76, 140.39) } as Record<string, THREE.Vector3>), [])
  const ultimoW = useRef('')

  const u = useMemo(() => ({
    tierra: { uDia: { value: dia }, uNoche: { value: noche }, uAgua: { value: agua }, uRelieve: { value: relieve },
      uSol: { value: new THREE.Vector3(1, 0, 0) }, uArriba: { value: new THREE.Vector3(0, 1, 0) }, uOp: { value: 1 }, uDis: { value: 0 } },
    nubes: { uNubes: { value: nubesGen as THREE.Texture }, uSol: { value: new THREE.Vector3(1, 0, 0) }, uReal: { value: 0 }, uOp: { value: 1 } },
    halo: { uOp: { value: 1 } },
  }), [dia, noche, agua, relieve, nubesGen])

  // las nubes reales de ayer, si NASA responde; si no, se quedan las genéricas
  useEffect(() => {
    if (SIN.has('nasa')) return
    new THREE.TextureLoader().load(`${GIBS}&TIME=${ayerUTC()}`, t => {
      t.anisotropy = gl.capabilities.getMaxAnisotropy()
      u.nubes.uNubes.value = t; u.nubes.uReal.value = 1
    }, undefined, () => {})
  }, [gl, u])

  const rutas = useMemo<RutaDibujada[]>(() => datos.rutas.filter(r => r.frecuencia).map((r, i) => {
    const d = datos.puertas[r.puerta]
    const a = aPos(r.lat, r.lon), b = aPos(d[0], d[1])
    const puntos = arco(a, b, 0.08 + (0.15 * a.angleTo(b)) / Math.PI + i * 0.012)
    return { puntos, curva: new THREE.CatmullRomCurve3(puntos), anunciada: r.estado === 'anunciada', frecuencia: r.frecuencia }
  }), [])
  // un tubo por ruta con su shader: degradado, estela y trazado progresivo
  // el material se crea aquí y no como <shaderMaterial>: así los uniforms que se actualizan
  // en cada fotograma son exactamente los que lee la GPU
  const tubos = useMemo(() => rutas.map((r, i) => {
    const u = { uT: { value: 0 }, uFase: { value: i * 0.29 }, uDibujo: { value: 0 }, uOp: { value: 0 }, uAnunciada: { value: r.anunciada ? 1 : 0 },
      uA: { value: r.anunciada ? PALETA.oro : PALETA.verde }, uB: { value: PALETA.oro } }
    return {
      geo: new THREE.TubeGeometry(r.curva, 200, r.anunciada ? 0.0034 : 0.003 + r.frecuencia * 0.0002, 8, false),
      u,
      mat: new THREE.ShaderMaterial({ uniforms: u, vertexShader: rutaVert, fragmentShader: rutaFrag, transparent: true,
        depthWrite: false, blending: THREE.AdditiveBlending }),
    }
  }), [rutas])

  // un avión por cada tres frecuencias semanales, la mitad de vuelta
  const vuelos = useMemo(() => rutas.filter(r => !r.anunciada).flatMap((r, i) => {
    const n = Math.max(1, Math.round(r.frecuencia / 3))
    return Array.from({ length: n }, (_, k) => ({ curva: r.curva, fase: (k / n + i * 0.37) % 1, vuelta: k % 2 === 1 }))
  }), [rutas])
  const tmp = useMemo(() => ({ q: new THREE.Quaternion(), m: new THREE.Matrix4(), P: new THREE.Vector3(), D: new THREE.Vector3(),
    X: new THREE.Vector3(), Z: new THREE.Vector3(), s: new THREE.Vector3(0.022, 0.022, 0.022), gira: new THREE.Quaternion(),
    eY: new THREE.Vector3(0, 1, 0) }), [])
  const lado = viewport.aspect > 1.1 ? viewport.width * 0.2 : 0

  useFrame((st, dt) => {
    const g = grupo.current; if (!g) return
    const dis = disolucion()
    const t = st.clock.elapsedTime
    const { q, gira, eY } = tmp
    // orientación: en la portada se mece; en el corredor viaja del Golfo a Japón; al final,
    // en el viaje, vuelve a Japón para aterrizar en Kansai. El transform se calcula aunque
    // el globo esté deshecho: las partículas lo necesitan para volver a él.
    const p = scroll.pos
    if (p < 1) q.copy(Q_CORREDOR).premultiply(gira.setFromAxisAngle(eY, Math.sin(t * 0.08) * 0.45))
    else if (p < 2) q.copy(Q_GOLFO).slerp(Q_JAPON, suave(acota(p - 1)))
    else if (p < 6.6) q.copy(Q_JAPON).slerp(Q_CORREDOR, suave(acota(p - 2)))
    else q.copy(Q_CORREDOR).slerp(Q_JAPON, suave(acota((p - 6.6) / 0.8)))
    g.quaternion.slerp(q, 1 - Math.exp(-dt * 3))
    const s = 1 + (p < 0.5 ? 0.22 * (1 - scroll.puertas) : 0) + 0.08 * suave(acota(1 - Math.abs(p - 7.2) / 0.8))
    g.scale.setScalar(g.scale.x + (s - g.scale.x) * (1 - Math.exp(-dt * 3)))
    const x = p < 0.5 || p > 6.7 ? 0 : lado
    g.position.x += (x - g.position.x) * (1 - Math.exp(-dt * 3))
    transGlobo.q.copy(g.quaternion); transGlobo.x = g.position.x; transGlobo.s = g.scale.x

    g.visible = dis < 0.995
    // los rótulos HTML no heredan la visibilidad del grupo: se apagan aquí, antes de salir
    if (!g.visible) { if (ultimoW.current !== '0') { document.documentElement.style.setProperty('--w-globo', '0'); ultimoW.current = '0' } return }
    u.tierra.uDis.value = dis
    // rutas, nubes y halo se apagan en la primera mitad de la disolución: lo último en irse es la tierra
    const op = 1 - suave(acota(dis * 2))
    const [la, lo] = subsolar()
    const sol = aPos(la, lo).normalize().applyQuaternion(g.quaternion)
    u.tierra.uSol.value.copy(sol); u.nubes.uSol.value.copy(sol)
    u.tierra.uArriba.value.set(0, 1, 0).applyQuaternion(g.quaternion)
    u.nubes.uOp.value = op; u.halo.uOp.value = op

    // las rutas se dibujan con el scroll del capítulo del corredor y el flujo corre
    const dibujo = scroll.pos < 0.8 ? 0.1 : acota((scroll.pos - 0.8) * 1.4)
    tubos.forEach(tb => { tb.u.uT.value = t; tb.u.uDibujo.value = dibujo; tb.u.uOp.value = op })
    estadoMundo.op = op; estadoMundo.dibujo = dibujo
    // los rótulos HTML no heredan la visibilidad del grupo: usan una variable CSS
    // sólo se toca el estilo cuando cambia: escribir en <html> en cada fotograma recalcula toda la página
    const wg = ((scroll.pos < 0.6 && scroll.puertas < 0.4) || scroll.pos > 6.55 ? 0 : op).toFixed(2)
    if (wg !== ultimoW.current) { document.documentElement.style.setProperty('--w-globo', wg); ultimoW.current = wg }
    const cam = tmp.P.copy(st.camera.position).sub(g.position).normalize()
    for (const [n, v] of Object.entries(ciudades)) {
      const el = spans.current[n]; if (!el) continue
      const cara = tmp.D.copy(v).applyQuaternion(g.quaternion).dot(cam) > 0.08 ? 'visible' : 'hidden'
      if (el.style.visibility !== cara) el.style.visibility = cara
    }
  })

  return (
    <group ref={grupo}>
      {/* orden de dibujo explícito: todas estas piezas son transparentes y comparten centro,
          y sin él three.js puede pintar la Tierra encima de las rutas */}
      <mesh ref={tierra} renderOrder={0}>
        <sphereGeometry args={[R, 192, 128]} />
        <shaderMaterial uniforms={u.tierra} vertexShader={tierraVert} fragmentShader={tierraFrag} transparent />
      </mesh>
      <mesh scale={1.011} renderOrder={1}>
        <sphereGeometry args={[R, 160, 110]} />
        <shaderMaterial uniforms={u.nubes} vertexShader={tierraVert} fragmentShader={nubesFrag} transparent depthWrite={false} />
      </mesh>
      <mesh scale={1.1} renderOrder={2}>
        <sphereGeometry args={[R, 64, 48]} />
        <shaderMaterial uniforms={u.halo} vertexShader={atmosferaVert} fragmentShader={atmosferaFrag}
          side={THREE.BackSide} blending={THREE.AdditiveBlending} transparent depthWrite={false} />
      </mesh>

      {!SIN.has('lineas') && tubos.map((tb, i) => (
        <mesh key={i} geometry={tb.geo} material={tb.mat} renderOrder={3} />
      ))}

      <Mundo vuelos={vuelos} trafico={trafico} />

      {!SIN.has('rotulos') && <group ref={rotulos}>
        {/* las tres ciudades del Golfo caen a pocos píxeles: cada rótulo se aparta hacia su lado */}
        {([['Dubái', 25.25, 55.36, '70%, 55%'], ['Doha', 25.27, 51.61, '0, -120%'], ['Riad', 24.71, 46.68, '-75%, 55%'],
          ['Osaka', 34.43, 135.23, '60%, 70%'], ['Tokio', 35.76, 140.39, '60%, -70%']] as const)
          .map(([n, la, lo, desvio]) => {
            const oro = lo > 100
            return (
              <group key={n} position={aPos(la, lo, R * 1.012)}>
                <mesh><sphereGeometry args={[0.012, 16, 16]} /><meshBasicMaterial color={oro ? PALETA.oro : PALETA.verde} toneMapped={false} transparent /></mesh>
                <Html center distanceFactor={7} zIndexRange={[5, 0]} className="etiqueta3d">
                  <span ref={el => { spans.current[n] = el }} className={oro ? 'oro' : ''} style={{ opacity: 'var(--w-globo, 0)', transform: `translate(${desvio})`, display: 'inline-block' }}>{n}</span>
                </Html>
              </group>
            )
          })}
      </group>}
    </group>
  )
}
