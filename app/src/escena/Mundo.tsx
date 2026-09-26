// La vida sobre el globo, dentro de su grupo (gira con él):
// - los vuelos del corredor: aviones 3D con volumen y reflejos, estela de condensación
//   que se desvanece y luces de navegación que parpadean;
// - el tráfico real de OpenSky: una silueta por avión, orientada a su rumbo; los de
//   aerolíneas del Golfo en el corredor, en verde, avanzan con su velocidad real
//   desde la hora de la instantánea (hasta 20 minutos, después se quedan quietos);
// - pulsos de radar en los aeropuertos y una retícula tenue de meridianos y paralelos.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import type { Trafico } from '../tipos'
import { R, aPos, PALETA } from './geo'

/** Lo que el globo decide en cada fotograma y el mundo necesita saber. */
export const estadoMundo = { op: 1, dibujo: 1, tiempo: 0 }

const EJE_Y = new THREE.Vector3(0, 1, 0)

/** Base local en un punto de la esfera: Z hacia fuera, D hacia el rumbo, X a la derecha. */
function base(P: THREE.Vector3, rumbo: number, m: THREE.Matrix4, escala: number) {
  const Z = P.clone().normalize()
  const este = new THREE.Vector3().crossVectors(EJE_Y, Z).normalize()
  const norte = new THREE.Vector3().crossVectors(Z, este)
  const h = (rumbo * Math.PI) / 180
  const D = norte.multiplyScalar(Math.cos(h)).add(este.multiplyScalar(Math.sin(h)))
  const X = new THREE.Vector3().crossVectors(D, Z)
  return m.makeBasis(X.multiplyScalar(escala), D.multiplyScalar(escala), Z.multiplyScalar(escala)).setPosition(P)
}

/** Avión de pasajeros de pocos polígonos: morro hacia +y, arriba +z. */
function geoAvion(): THREE.BufferGeometry {
  const piezas: THREE.BufferGeometry[] = []
  const fus = new THREE.CapsuleGeometry(0.11, 1.5, 6, 12); piezas.push(fus) // eje y
  const ala = new THREE.Shape([[0.08, 0.25], [1.0, -0.2], [1.0, -0.34], [0.08, -0.18]].map(([x, y]) => new THREE.Vector2(x, y)))
  for (const s of [1, -1]) {
    const g = new THREE.ExtrudeGeometry(ala, { depth: 0.035, bevelEnabled: false }); g.translate(0, 0, -0.02)
    if (s < 0) g.scale(-1, 1, 1)
    piezas.push(g)
    const est = new THREE.ExtrudeGeometry(new THREE.Shape([[0.05, -0.62], [0.38, -0.84], [0.38, -0.92], [0.05, -0.8]].map(([x, y]) => new THREE.Vector2(x, y))), { depth: 0.025, bevelEnabled: false })
    if (s < 0) est.scale(-1, 1, 1)
    piezas.push(est)
    const motor = new THREE.CylinderGeometry(0.07, 0.07, 0.3, 10); motor.translate(0.42 * s, 0.1, -0.09); piezas.push(motor)
  }
  const deriva = new THREE.ExtrudeGeometry(new THREE.Shape([[-0.62, 0], [-0.9, 0], [-0.98, 0.45], [-0.84, 0.45]].map(([x, y]) => new THREE.Vector2(x, y))), { depth: 0.03, bevelEnabled: false })
  // la forma se dibuja con x = a lo largo e y = hacia arriba; se lleva a y = a lo largo, z = arriba
  deriva.translate(0, 0, -0.015)
  deriva.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)))
  piezas.push(deriva)
  const todo = mergeGeometries(piezas.map(p => (p.index ? p.toNonIndexed() : p)).map(p => { p.deleteAttribute('uv'); return p }))!
  todo.computeVertexNormals()
  return todo
}

/** Silueta plana de avión para el tráfico real: se lee a cualquier tamaño. */
function geoSilueta(): THREE.ShapeGeometry {
  const m: [number, number][] = [[0, 1], [0.07, 0.8], [0.08, 0.3], [0.95, -0.12], [0.95, -0.26], [0.08, -0.08],
    [0.06, -0.6], [0.36, -0.82], [0.36, -0.92], [0.02, -0.86], [0, -1]]
  const pts = [...m, ...m.slice(0, -1).reverse().map(([x, y]) => [-x, y] as [number, number])]
  return new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))))
}

const ESTELA = 44 // puntos de estela por avión

const trazoVert = /* glsl */ `
attribute float aT; attribute float aTam;
uniform float uPR, uOp;
varying float vA;
void main() {
  vA = (1.0 - aT) * (1.0 - aT) * uOp;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aTam * uPR * (1.0 - aT * 0.6) / -mv.z;
}`
const trazoFrag = /* glsl */ `
uniform vec3 uColor;
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = exp(-d * d * 3.5) * vA;
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor, a);
}`

interface Vuelo { curva: THREE.Curve<THREE.Vector3>; fase: number; vuelta: boolean }

const AEROPUERTOS: [number, number, boolean][] = [
  [25.25, 55.36, false], [25.27, 51.61, false], [24.43, 54.65, false], [24.96, 46.7, false],
  [34.43, 135.23, true], [35.76, 140.39, true], [35.55, 139.78, true],
]

export default function Mundo({ vuelos, trafico }: { vuelos: Vuelo[]; trafico: Trafico | null }) {
  const aviones = useRef<THREE.InstancedMesh>(null)
  const luces = useRef<THREE.Points>(null)
  const estelas = useRef<THREE.Points>(null)
  const reales = useRef<THREE.InstancedMesh>(null)
  const pulsos = useRef<THREE.Group>(null)

  const geo = useMemo(geoAvion, [])
  const silueta = useMemo(geoSilueta, [])
  const matAvion = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f4f6f7', roughness: 0.3, metalness: 0.25, envMapIntensity: 1.4,
    emissive: '#2a3a44', emissiveIntensity: 0.6, side: THREE.DoubleSide }), [])

  // estelas: ESTELA puntos por vuelo, del avión (aT = 0) a la cola de la estela (aT = 1)
  const estela = useMemo(() => {
    const n = vuelos.length * ESTELA, g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
    g.setAttribute('aT', new THREE.BufferAttribute(Float32Array.from({ length: n }, (_, i) => (i % ESTELA) / (ESTELA - 1)), 1))
    g.setAttribute('aTam', new THREE.BufferAttribute(Float32Array.from({ length: n }, (_, i) => 5 + 4 * (i % ESTELA) / ESTELA), 1))
    const mat = new THREE.ShaderMaterial({ vertexShader: trazoVert, fragmentShader: trazoFrag, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, uniforms: { uPR: { value: 1 }, uOp: { value: 1 }, uColor: { value: new THREE.Color(0.9, 0.95, 1.0) } } })
    return { g, mat }
  }, [vuelos])

  // luces de navegación: roja en el ala izquierda, verde en la derecha, destello blanco en la cola
  const nav = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vuelos.length * 3 * 3), 3))
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(vuelos.length * 3 * 3), 3))
    return g
  }, [vuelos])

  // tráfico real: silueta orientada a su rumbo
  const real = useMemo(() => {
    if (!trafico) return null
    const corr = trafico.corredor.map(([, la, lo, rumbo, vel]) => ({ la, lo, rumbo, vel, golfo: true }))
    const resto = [...trafico.golfo.p, ...trafico.japon.p].map(([la, lo, rumbo]) => ({ la, lo, rumbo, vel: 0, golfo: false }))
    return { lista: [...resto, ...corr], t: trafico.t }
  }, [trafico])

  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), P: new THREE.Vector3(), D: new THREE.Vector3(), Z: new THREE.Vector3(),
    X: new THREE.Vector3(), c: new THREE.Color(), s: new THREE.Vector3(0.032, 0.032, 0.032) }), [])

  useFrame((st, dt) => {
    const t = st.clock.elapsedTime, { op, dibujo } = estadoMundo
    const { m, P, D, Z, X } = tmp
    const listos = dibujo > 0.95
    // vuelos del corredor, con su estela y sus luces
    const ins = aviones.current, pos = estela.g.getAttribute('position') as THREE.BufferAttribute
    const npos = nav.getAttribute('position') as THREE.BufferAttribute, ncol = nav.getAttribute('color') as THREE.BufferAttribute
    if (ins) {
      vuelos.forEach((v, i) => {
        const k0 = (v.fase + t / 26) % 1
        const en = (k: number) => Math.min(0.999, Math.max(0.001, v.vuelta ? 1 - k : k))
        const k = en(k0)
        v.curva.getPointAt(k, P); v.curva.getTangentAt(k, D); if (v.vuelta) D.negate()
        Z.copy(P).normalize(); D.sub(X.copy(Z).multiplyScalar(D.dot(Z))).normalize(); X.crossVectors(D, Z)
        // los aviones despegan y aterrizan: más pequeños cerca de los extremos de la ruta
        const cerca = Math.min(1, Math.min(k0, 1 - k0) * 12)
        m.makeBasis(X, D, Z).scale(tmp.s.setScalar(0.032 * (0.45 + 0.55 * cerca))).setPosition(P)
        ins.setMatrixAt(i, m)
        // estela: puntos por detrás en la misma curva, ligeramente abiertos por el viento
        for (let j = 0; j < ESTELA; j++) {
          const kk = en(k0 - j * 0.0022)
          v.curva.getPointAt(kk, P)
          P.addScaledVector(Z, -0.004 + Math.sin(j * 0.4 + t) * 0.0006 * j / ESTELA)
          pos.setXYZ(i * ESTELA + j, P.x, P.y, P.z)
        }
        // luces: puntas de ala y cola, con parpadeo
        v.curva.getPointAt(k, P)
        const w = 0.032 * cerca, destello = (t * 1.3 + i * 0.37) % 1 < 0.08 ? 1 : 0.15
        const pts: [THREE.Vector3, [number, number, number]][] = [
          [P.clone().addScaledVector(X, -w * 0.98).addScaledVector(D, -w * 0.3), [2.2, 0.25, 0.2]],
          [P.clone().addScaledVector(X, w * 0.98).addScaledVector(D, -w * 0.3), [0.2, 2.2, 0.6]],
          [P.clone().addScaledVector(D, -w * 1.0).addScaledVector(Z, w * 0.4), [3 * destello, 3 * destello, 3 * destello]],
        ]
        pts.forEach(([p, c], j) => { npos.setXYZ(i * 3 + j, p.x, p.y, p.z); ncol.setXYZ(i * 3 + j, c[0], c[1], c[2]) })
      })
      ins.instanceMatrix.needsUpdate = true
      pos.needsUpdate = true; npos.needsUpdate = true; ncol.needsUpdate = true
      ins.visible = listos; if (estelas.current) estelas.current.visible = listos; if (luces.current) luces.current.visible = listos
      matAvion.opacity = op; matAvion.transparent = op < 0.99
      estela.mat.uniforms.uOp.value = op * 0.55; estela.mat.uniforms.uPR.value = st.gl.getPixelRatio()
    }

    // tráfico real, con navegación a estima para los del corredor
    const ri = reales.current
    if (ri && real) {
      const minutos = Math.min(20, Math.max(0, (Date.now() / 1000 - real.t) / 60))
      real.lista.forEach((a, i) => {
        let { la, lo } = a
        if (a.vel > 0) { // metros por segundo sobre el rumbo: grados de latitud y longitud recorridos
          const d = (a.vel * minutos * 60) / 111320, h = (a.rumbo * Math.PI) / 180
          la += d * Math.cos(h); lo += (d * Math.sin(h)) / Math.max(0.2, Math.cos((la * Math.PI) / 180))
        }
        base(aPos(la, lo, R * 1.006), a.rumbo, m, a.golfo ? 0.02 : 0.011)
        ri.setMatrixAt(i, m)
        ri.setColorAt(i, tmp.c.set(a.golfo ? '#4fd6b6' : '#e9b872').multiplyScalar(a.golfo ? 2.2 : 1.5))
      })
      ri.instanceMatrix.needsUpdate = true; if (ri.instanceColor) ri.instanceColor.needsUpdate = true
      ;(ri.material as THREE.MeshBasicMaterial).opacity = 0.9 * op
    }

    // pulsos de radar: dos anillos por aeropuerto, desfasados
    pulsos.current?.children.forEach((c, i) => {
      const f = ((t * 0.4 + (i % 2) * 0.5 + Math.floor(i / 2) * 0.13) % 1)
      c.scale.setScalar(0.01 + f * 0.07)
      ;((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = (1 - f) * (1 - f) * 0.8 * op
    })
    void dt
  })

  const reticula = useMemo(() => {
    const p: number[] = []
    const r = R * 1.0015
    for (let la = -75; la <= 75; la += 15) for (let lo = -180; lo < 180; lo += 3) {
      const a = aPos(la, lo, r), b = aPos(la, lo + 3, r); p.push(a.x, a.y, a.z, b.x, b.y, b.z)
    }
    for (let lo = -180; lo < 180; lo += 15) for (let la = -84; la < 84; la += 3) {
      const a = aPos(la, lo, r), b = aPos(la + 3, lo, r); p.push(a.x, a.y, a.z, b.x, b.y, b.z)
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
    return g
  }, [])

  return (
    <>
      <lineSegments geometry={reticula} renderOrder={1}>
        <lineBasicMaterial color="#9fd8ff" transparent opacity={0.035} depthWrite={false} />
      </lineSegments>

      <instancedMesh ref={aviones} args={[geo, matAvion, vuelos.length]} renderOrder={4} />
      <points ref={estelas} geometry={estela.g} material={estela.mat} renderOrder={4} frustumCulled={false} />
      <points ref={luces} geometry={nav} renderOrder={5} frustumCulled={false}>
        <pointsMaterial vertexColors size={0.02} sizeAttenuation transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </points>

      {real && (
        <instancedMesh ref={reales} args={[silueta, undefined, real.lista.length]} renderOrder={4} frustumCulled={false}>
          <meshBasicMaterial transparent depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
        </instancedMesh>
      )}

      <group ref={pulsos}>
        {AEROPUERTOS.flatMap(([la, lo, japon], i) => [0, 1].map(k => {
          const P = aPos(la, lo, R * 1.004)
          const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), P.clone().normalize())
          return (
            <mesh key={`${i}-${k}`} position={P} quaternion={q} renderOrder={3}>
              <ringGeometry args={[0.82, 1, 48]} />
              <meshBasicMaterial color={japon ? PALETA.oro : PALETA.verde} transparent depthWrite={false} side={THREE.DoubleSide}
                blending={THREE.AdditiveBlending} toneMapped={false} />
            </mesh>
          )
        }))}
      </group>
    </>
  )
}
