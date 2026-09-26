// La escena fija detrás del relato: estrellas, el globo, las partículas de los
// datos y un postprocesado de cine (bloom, tono ACES, viñeta, grano y SMAA).
import { useFrame, useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, Noise, SMAA, ToneMapping, ChromaticAberration } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { Vector2 } from 'three'
import { useMemo } from 'react'
import type { Trafico } from '../tipos'
import { scroll } from '../lib/scroll'
import Globo from './Globo'
import Particulas from './Particulas'
import Fondo from './Fondo'

/** Paralaje leve con el puntero y un respiro de la cámara a lo largo de la página. */
function Camara() {
  const { camera, pointer } = useThree()
  useFrame((_, dt) => {
    const k = 1 - Math.exp(-dt * 2)
    camera.position.x += (pointer.x * 0.3 - camera.position.x) * k
    camera.position.y += (pointer.y * 0.2 + 0.1 - camera.position.y) * k
    camera.position.z = 6.4 - Math.sin(scroll.total * Math.PI) * 0.35
    camera.lookAt(0, 0, 0)
  })
  return null
}

// Diagnóstico: ?sin=particulas,post,globo apaga piezas para aislar un problema de rendimiento
const SIN = new Set(new URLSearchParams(location.search).get('sin')?.split(',') ?? [])

export default function Escena({ trafico }: { trafico: Trafico | null }) {
  const desvio = useMemo(() => new Vector2(0.0006, 0.0004), [])
  return (
    <>
      <color attach="background" args={['#02060a']} />
      <Fondo />
      <Stars radius={70} depth={50} count={4200} factor={2.6} saturation={0} fade speed={0.35} />
      <Camara />
      {!SIN.has('globo') && <Globo trafico={trafico} />}
      {!SIN.has('particulas') && <Particulas />}
      {!SIN.has('post') && <EffectComposer multisampling={0} enableNormalPass={false}>
        <SMAA />
        <Bloom mipmapBlur intensity={0.6} luminanceThreshold={0.82} luminanceSmoothing={0.2} radius={0.65} />
        {/* se tonifica antes de la aberración: sobre valores HDR los núcleos brillantes dejaban flecos magenta */}
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <ChromaticAberration offset={desvio} radialModulation modulationOffset={0.35} blendFunction={BlendFunction.NORMAL} />
        <Vignette offset={0.28} darkness={0.72} />
        <Noise premultiply opacity={0.35} blendFunction={BlendFunction.SOFT_LIGHT} />
      </EffectComposer>}
    </>
  )
}
