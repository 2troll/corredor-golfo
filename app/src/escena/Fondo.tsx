// El fondo cambia de color con el relato: noche azul en la portada, atardecer
// del desierto en el corredor, índigo en los datos, oro en el veredicto y el
// anochecer rojizo de Kansai al llegar a Japón. Cada capítulo tiene su paleta y
// entre dos capítulos se mezclan según la posición amortiguada del scroll.
import { useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { scroll, acota, suave } from '../lib/scroll'
import frag from './shaders/fondo.frag.glsl?raw'

const vert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }`

// [centro, borde, bruma] por capítulo, en el orden de CAPITULOS
const PALETAS: [string, string, string][] = [
  ['#0b1826', '#010306', '#1d3b5c'], // portada: noche sobre el Golfo
  ['#21150b', '#030201', '#6b4219'], // corredor: arena al atardecer
  ['#0a1d1f', '#010505', '#1b5a55'], // ahora: el verde del radar
  ['#0d1230', '#02030b', '#2b3a86'], // mercado: índigo de los datos
  ['#1c1024', '#050209', '#5b2e6b'], // cuándo: el cielo del Ramadán al anochecer
  ['#0a2019', '#010604', '#1d6b4f'], // gasto: el verde del Golfo
  ['#231a0b', '#050301', '#7a5a1d'], // veredicto: oro
  ['#240d12', '#060204', '#7d2a2e'], // el viaje: el bermellón de los torii
  ['#140a18', '#030106', '#4a2350'], // cierre: anochecer en Kansai
]

export default function Fondo() {
  const { viewport } = useThree()
  const pal = useMemo(() => PALETAS.map(p => p.map(h => new THREE.Color(h))), [])
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag, depthTest: false, depthWrite: false,
    uniforms: { uCentro: { value: new THREE.Color() }, uBorde: { value: new THREE.Color() }, uBruma: { value: new THREE.Color() },
      uTiempo: { value: 0 }, uAspecto: { value: 1 } },
  }), [])

  useFrame(st => {
    const p = acota(scroll.pos, 0, PALETAS.length - 1)
    const i = Math.min(PALETAS.length - 2, Math.floor(p)), t = suave(p - i)
    const u = mat.uniforms
    ;(u.uCentro.value as THREE.Color).copy(pal[i][0]).lerp(pal[i + 1][0], t)
    ;(u.uBorde.value as THREE.Color).copy(pal[i][1]).lerp(pal[i + 1][1], t)
    ;(u.uBruma.value as THREE.Color).copy(pal[i][2]).lerp(pal[i + 1][2], t)
    u.uTiempo.value = st.clock.elapsedTime
    u.uAspecto.value = viewport.aspect
  })

  return (
    <mesh renderOrder={-1000} frustumCulled={false} material={mat}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  )
}
