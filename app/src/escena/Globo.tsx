// La Tierra en 4K con el sol de este momento, las nubes reales de ayer (NASA
// VIIRS), las rutas del corredor como líneas con degradado y flujo, los aviones
// de cada ruta y el tráfico real de OpenSky. Visible en portada, corredor,
// «ahora» y cierre; entre medias se deshace en partículas (ver Particulas.tsx).
import { useEffect, useMemo, useRef, type RefObject } from 'react'
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

/** Opacidad del globo: entero desde la portada hasta «ahora», se deshace en partículas al
 *  llegar a los datos y vuelve para el cierre. Una curva por tramos, no una mezcla de
 *  pesos: con la mezcla se atenuaba a mitad de camino entre dos capítulos. */
export const pesoGlobo = (): number => {
  const p = scroll.pos
  if (p < 2.4) return 1
  if (p < 2.9) return 1 - (p - 2.4) / 0.5
  return acota((p - 6.3) / 0.5)
}

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
  const aviones = useRef<THREE.InstancedMesh>(null)
  const rotulos = useRef<THREE.Group>(null)
  const tierra = useRef<THREE.Mesh>(null)

  const u = useMemo(() => ({
    tierra: { uDia: { value: dia }, uNoche: { value: noche }, uAgua: { value: agua }, uRelieve: { value: relieve },
      uSol: { value: new THREE.Vector3(1, 0, 0) }, uArriba: { value: new THREE.Vector3(0, 1, 0) }, uOp: { value: 1 } },
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
      geo: new THREE.TubeGeometry(r.curva, 200, r.anunciada ? 0.0035 : 0.0032 + r.frecuencia * 0.00045, 10, false),
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
  const forma = useMemo(() => {
    const s = new THREE.Shape()
    const m: [number, number][] = [[0, 1], [0.05, 0.86], [0.065, 0.36], [0.95, -0.1], [0.95, -0.22], [0.065, -0.06],
      [0.055, -0.62], [0.34, -0.84], [0.34, -0.94], [0.02, -0.88], [0, -1]]
    ;[...m, ...m.slice(0, -1).reverse().map(([x, y]) => [-x, y] as [number, number])]
      .forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)))
    return new THREE.ShapeGeometry(s)
  }, [])

  const trafico3d = useMemo(() => {
    if (!trafico) return null
    const p = [...trafico.golfo.p, ...trafico.japon.p]
    const pos = new Float32Array(p.length * 3)
    p.forEach(([la, lo], i) => { const v = aPos(la, lo, R * 1.012); pos.set([v.x, v.y, v.z], i * 3) })
    return pos
  }, [trafico])

  const tmp = useMemo(() => ({ q: new THREE.Quaternion(), m: new THREE.Matrix4(), P: new THREE.Vector3(), D: new THREE.Vector3(),
    X: new THREE.Vector3(), Z: new THREE.Vector3(), s: new THREE.Vector3(0.022, 0.022, 0.022), gira: new THREE.Quaternion(),
    eY: new THREE.Vector3(0, 1, 0) }), [])
  const lado = viewport.aspect > 1.1 ? viewport.width * 0.2 : 0

  useFrame((st, dt) => {
    const g = grupo.current; if (!g) return
    const w = pesoGlobo()
    g.visible = w > 0.01
    // los rótulos HTML no heredan la visibilidad del grupo: se apagan aquí, antes de salir
    if (!g.visible) { document.documentElement.style.setProperty('--w-globo', '0'); return }
    const t = st.clock.elapsedTime
    const { q, gira, eY } = tmp
    // orientación: en la portada se mece; en el corredor viaja del Golfo a Japón
    if (scroll.pos < 1) q.copy(Q_CORREDOR).premultiply(gira.setFromAxisAngle(eY, Math.sin(t * 0.08) * 0.45))
    else if (scroll.pos < 2) q.copy(Q_GOLFO).slerp(Q_JAPON, suave(acota(scroll.pos - 1)))
    else q.copy(Q_JAPON).slerp(Q_CORREDOR, suave(acota(scroll.pos - 2)))
    g.quaternion.slerp(q, 1 - Math.exp(-dt * 4))
    const s = 0.62 + 0.38 * suave(w) + (scroll.pos < 0.5 ? 0.22 * (1 - scroll.puertas) : 0)
    g.scale.setScalar(s)
    const x = scroll.pos < 0.5 || scroll.pos > 6.5 ? 0 : lado
    g.position.x += (x - g.position.x) * (1 - Math.exp(-dt * 3))

    const op = suave(w)
    const [la, lo] = subsolar()
    const sol = aPos(la, lo).normalize().applyQuaternion(g.quaternion)
    u.tierra.uSol.value.copy(sol); u.nubes.uSol.value.copy(sol)
    u.tierra.uArriba.value.set(0, 1, 0).applyQuaternion(g.quaternion)
    u.tierra.uOp.value = op; u.nubes.uOp.value = op; u.halo.uOp.value = op

    // las rutas se dibujan con el scroll del capítulo del corredor y el flujo corre
    const dibujo = scroll.pos < 0.8 ? 0.1 : acota((scroll.pos - 0.8) * 1.4)
    tubos.forEach(tb => { tb.u.uT.value = t; tb.u.uDibujo.value = dibujo; tb.u.uOp.value = op })
    const ins = aviones.current
    if (ins) {
      const { m, P, D, X, Z } = tmp
      vuelos.forEach((a, i) => {
        let k = (a.fase + t / 16) % 1
        if (a.vuelta) k = 1 - k
        a.curva.getPointAt(k, P); a.curva.getTangentAt(k, D)
        if (a.vuelta) D.negate()
        Z.copy(P).normalize(); D.sub(X.copy(Z).multiplyScalar(D.dot(Z))).normalize(); X.crossVectors(D, Z)
        m.makeBasis(X, D, Z).scale(tmp.s).setPosition(P)
        ins.setMatrixAt(i, m)
      })
      ins.instanceMatrix.needsUpdate = true
      ins.visible = dibujo > 0.95
    }
    // los rótulos HTML no heredan la visibilidad del grupo: usan una variable CSS
    document.documentElement.style.setProperty('--w-globo', (scroll.pos < 0.6 && scroll.puertas < 0.4 ? 0 : op).toFixed(3))
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

      <instancedMesh ref={aviones} args={[forma, undefined, vuelos.length]} renderOrder={4}>
        <meshBasicMaterial color={[2.2, 2.2, 2.2]} side={THREE.DoubleSide} toneMapped={false} />
      </instancedMesh>

      {trafico3d && (
        <points renderOrder={4}>
          <bufferGeometry><bufferAttribute attach="attributes-position" args={[trafico3d, 3]} /></bufferGeometry>
          <pointsMaterial color={[2.4, 1.9, 1.1]} size={0.016} sizeAttenuation transparent opacity={0.9} depthWrite={false} toneMapped={false} />
        </points>
      )}

      {!SIN.has('rotulos') && <group ref={rotulos}>
        {/* las tres ciudades del Golfo caen a pocos píxeles: cada rótulo se aparta hacia su lado */}
        {([['Dubái', 25.25, 55.36, '70%, 55%'], ['Doha', 25.27, 51.61, '0, -120%'], ['Riad', 24.71, 46.68, '-75%, 55%'],
          ['Osaka', 34.43, 135.23, '60%, 70%'], ['Tokio', 35.76, 140.39, '60%, -70%']] as const)
          .map(([n, la, lo, desvio]) => {
            const oro = lo > 100
            return (
              <group key={n} position={aPos(la, lo, R * 1.012)}>
                <mesh><sphereGeometry args={[0.012, 16, 16]} /><meshBasicMaterial color={oro ? PALETA.oro : PALETA.verde} toneMapped={false} transparent /></mesh>
                <Html center distanceFactor={7} occlude={[tierra as RefObject<THREE.Object3D>]} zIndexRange={[5, 0]} className="etiqueta3d">
                  <span className={oro ? 'oro' : ''} style={{ opacity: 'var(--w-globo, 0)', transform: `translate(${desvio})`, display: 'inline-block' }}>{n}</span>
                </Html>
              </group>
            )
          })}
      </group>}
    </group>
  )
}
