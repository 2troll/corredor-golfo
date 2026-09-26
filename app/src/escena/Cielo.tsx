// Lo que pasa detrás, en el cielo: estrellas fugaces de vez en cuando y un polvo
// luminoso en tres profundidades que se desplaza con el scroll (paralaje), para que
// el fondo nunca parezca una foto quieta.
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { scroll } from '../lib/scroll'

const FUGACES = 4

const fugazVert = /* glsl */ `
attribute float aT;
varying float vT;
void main() { vT = aT; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`
const fugazFrag = /* glsl */ `
uniform float uOp;
varying float vT;
void main() { gl_FragColor = vec4(vec3(1.0, 0.95, 0.85) * 2.0, pow(1.0 - vT, 2.2) * uOp); }`

const polvoVert = /* glsl */ `
attribute float aCapa; attribute float aAzar;
uniform float uScroll, uT, uPR;
varying float vA;
void main() {
  vec3 p = position;
  p.y += uScroll * (2.0 + aCapa * 6.0);           // las capas cercanas se mueven más
  p.y = mod(p.y + 6.0, 12.0) - 6.0;
  p.x += sin(uT * 0.1 + aAzar * 30.0) * 0.2;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vA = 0.25 + 0.35 * sin(uT * 0.6 + aAzar * 50.0) * 0.5 + 0.15;
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (6.0 + aCapa * 26.0) * uPR * (0.6 + aAzar * 0.8) / -mv.z;
}`
const polvoFrag = /* glsl */ `
varying float vA;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  gl_FragColor = vec4(vec3(0.75, 0.88, 1.0), exp(-d * d * 3.0) * vA * 0.35);
}`

export default function Cielo() {
  const lineas = useRef<THREE.LineSegments>(null)
  const estado = useMemo(() => Array.from({ length: FUGACES }, () => ({ inicio: -10, dur: 1, a: new THREE.Vector3(), d: new THREE.Vector3(), largo: 1 })), [])

  const fugaz = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FUGACES * 2 * 3), 3))
    g.setAttribute('aT', new THREE.BufferAttribute(Float32Array.from({ length: FUGACES * 2 }, (_, i) => i % 2), 1))
    const mat = new THREE.ShaderMaterial({ vertexShader: fugazVert, fragmentShader: fugazFrag, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, uniforms: { uOp: { value: 1 } } })
    return { g, mat }
  }, [])

  const polvo = useMemo(() => {
    const n = 420, p = new Float32Array(n * 3), capa = new Float32Array(n), az = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const c = i % 3 / 2 // 0 lejos, 0,5 medio, 1 cerca
      p.set([(Math.random() - 0.5) * 16, (Math.random() - 0.5) * 12, -6 + c * 9 + (Math.random() - 0.5)], i * 3)
      capa[i] = c; az[i] = Math.random()
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(p, 3))
    g.setAttribute('aCapa', new THREE.BufferAttribute(capa, 1))
    g.setAttribute('aAzar', new THREE.BufferAttribute(az, 1))
    const mat = new THREE.ShaderMaterial({ vertexShader: polvoVert, fragmentShader: polvoFrag, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, uniforms: { uScroll: { value: 0 }, uT: { value: 0 }, uPR: { value: 1 } } })
    return { g, mat }
  }, [])

  useFrame(st => {
    const t = st.clock.elapsedTime
    const pos = fugaz.g.getAttribute('position') as THREE.BufferAttribute
    estado.forEach((f, i) => {
      // cada una espera su turno al azar: una cada pocos segundos, nunca todas juntas
      if (t - f.inicio > f.dur + 2 + Math.random() * 60) {
        if (Math.random() < 0.004) {
          f.inicio = t; f.dur = 0.6 + Math.random() * 0.7; f.largo = 0.8 + Math.random() * 1.4
          f.a.set((Math.random() - 0.2) * 14, 3 + Math.random() * 3, -12 - Math.random() * 6)
          f.d.set(-0.8 - Math.random() * 0.5, -0.45 - Math.random() * 0.3, 0).normalize()
        }
      }
      const k = (t - f.inicio) / f.dur
      if (k < 0 || k > 1) { pos.setXYZ(i * 2, 0, 0, -100); pos.setXYZ(i * 2 + 1, 0, 0, -100); return }
      const cabeza = f.a.clone().addScaledVector(f.d, k * 9)
      const cola = cabeza.clone().addScaledVector(f.d, -f.largo * Math.sin(Math.PI * Math.min(1, k * 1.4)))
      pos.setXYZ(i * 2, cabeza.x, cabeza.y, cabeza.z); pos.setXYZ(i * 2 + 1, cola.x, cola.y, cola.z)
    })
    pos.needsUpdate = true
    polvo.mat.uniforms.uScroll.value = scroll.total
    polvo.mat.uniforms.uT.value = t
    polvo.mat.uniforms.uPR.value = st.gl.getPixelRatio()
  })

  return (
    <>
      <lineSegments ref={lineas} geometry={fugaz.g} material={fugaz.mat} renderOrder={-500} frustumCulled={false} />
      <points geometry={polvo.g} material={polvo.mat} renderOrder={-400} frustumCulled={false} />
    </>
  )
}
