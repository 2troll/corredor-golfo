// El relato: una escena 3D fija detrás y ocho capítulos que se leen con el
// scroll. Lenis suaviza el scroll; GSAP ScrollTrigger traduce cada capítulo a
// una posición continua (scroll.pos) que la escena lee en cada fotograma.
import { Suspense, useEffect, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import { ACESFilmicToneMapping } from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { useGSAP } from '@gsap/react'
import Lenis from 'lenis'
import Snap from 'lenis/snap'
import { PerformanceMonitor } from '@react-three/drei'
import Escena from './escena/Escena'
import Portada from './componentes/Portada'
import { Corredor, Ahora, Mercado, Estacion, Gasto, Veredicto, Cierre } from './componentes/Capitulos'
import Viaje from './componentes/Viaje'
import { scroll, CAPITULOS, amortigua } from './lib/scroll'
import { useTrafico, useTiempo, useAhora, hhmm } from './lib/vivo'
import type { Trafico } from './tipos'

gsap.registerPlugin(ScrollTrigger, SplitText, ScrambleTextPlugin, useGSAP)

/** Pantalla de carga: el progreso real de las texturas 4K y las fuentes 3D. */
function Cargador() {
  const { progress, active } = useProgress()
  const [fuera, setFuera] = useState(false)
  // se va al terminar la carga, o a los ocho segundos pase lo que pase: nunca deja la página tapada
  useEffect(() => { const id = setTimeout(() => setFuera(true), 8000); return () => clearTimeout(id) }, [])
  useEffect(() => { if (!active && progress >= 100) { const id = setTimeout(() => setFuera(true), 450); return () => clearTimeout(id) } }, [active, progress])
  return (
    <div className={`cargador ${fuera ? 'fuera' : ''}`} aria-hidden={fuera}>
      <p className="marca">El corredor del Golfo</p>
      <div className="barra"><i style={{ transform: `scaleX(${progress / 100})` }} /></div>
      <p className="pct">{Math.round(progress).toString().padStart(3, '0')} · texturas NASA 4K</p>
    </div>
  )
}

/** Cinta superior con lo que está pasando ahora mismo. */
function Cinta({ trafico }: { trafico: Trafico | null }) {
  const ahora = useAhora(20000), w = useTiempo()
  const items = [
    trafico && `${trafico.golfo.n} aviones en el aire sobre el Golfo`,
    trafico && `${trafico.japon.n} sobre Japón`,
    trafico && `${trafico.corredor.length} aviones del Golfo en el corredor`,
    `Dubái ${hhmm(ahora, 'Asia/Dubai')}${w ? ` · ${w.dubai.t} °C ${w.dubai.cielo}` : ''}`,
    `Osaka ${hhmm(ahora, 'Asia/Tokyo')}${w ? ` · ${w.osaka.t} °C ${w.osaka.cielo}` : ''}`,
    'Saudia Riad–Narita · 17 nov 2026',
    'Ventana de entrada · nov 2026 – may 2027',
  ].filter(Boolean) as string[]
  const fila = items.map((t, i) => <span key={i}><i />{t}</span>)
  return (
    <div className="cinta" role="marquee" aria-label="Datos en vivo">
      <b>EN VIVO</b>
      <div className="pista"><div>{fila}{fila}</div></div>
    </div>
  )
}

function Indice() {
  const [actual, setActual] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setActual(Math.min(CAPITULOS.length - 1, Math.max(0, Math.round(scroll.pos)))), 200)
    return () => clearInterval(id)
  }, [])
  return (
    <nav className="indice" aria-label="Capítulos">
      {CAPITULOS.map((c, i) => (
        <a key={c.id} href={`#${c.id}`} className={i === actual ? 'aqui' : ''} aria-current={i === actual ? 'step' : undefined}>
          <i /><span>{c.titulo}</span>
        </a>
      ))}
    </nav>
  )
}

export default function App() {
  const raiz = useRef<HTMLDivElement>(null)
  const trafico = useTrafico()
  const [dpr, setDpr] = useState(() => Math.min(1.5, window.devicePixelRatio))
  const baja = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

  // Scroll suave, sincronizado con ScrollTrigger (si nadie ha pedido menos movimiento)
  useEffect(() => {
    if (baja) return
    const lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9 })
    lenis.on('scroll', ScrollTrigger.update)
    const tic = (t: number) => lenis.raf(t * 1000)
    gsap.ticker.add(tic); gsap.ticker.lagSmoothing(0)
    // Paradas: el centro de cada capítulo (donde su forma está completa) y cada parada del
    // viaje. Si el lector suelta la rueda cerca de una, el scroll termina de llegar solo:
    // la animación nunca se queda congelada a medio transformar.
    const snap = new Snap(lenis, { type: 'proximity', distanceThreshold: '42%', debounce: 160, duration: 1.1,
      easing: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) })
    let quitar: (() => void)[] = []
    const paradas = () => {
      quitar.forEach(q => q()); quitar = []
      const pts = [0]
      CAPITULOS.forEach(c => {
        if (c.id === 'portada' || c.id === 'viaje') return
        const st = ScrollTrigger.getById(`cap-${c.id}`); if (st) pts.push((st.start + st.end) / 2)
      })
      const pin = ScrollTrigger.getById('viaje-pin')
      if (pin) for (let k = 0; k <= 5; k++) pts.push(pin.start + ((pin.end - pin.start) * k) / 5)
      quitar = pts.map(y => snap.add(Math.round(y)))
    }
    ScrollTrigger.addEventListener('refresh', paradas)
    ScrollTrigger.refresh()
    const clic = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]'); if (!a) return
      e.preventDefault()
      // al centro del capítulo, donde su forma está completa; el viaje, al principio de su pista
      const id = a.getAttribute('href')!.slice(1)
      const st = ScrollTrigger.getById(id === 'viaje' ? 'viaje-pin' : `cap-${id}`)
      const destino = !st ? a.getAttribute('href')! : id === 'viaje' ? st.start : id === 'portada' ? 0 : Math.round((st.start + st.end) / 2)
      lenis.scrollTo(destino, { duration: 1.6 })
    }
    document.addEventListener('click', clic)
    return () => { gsap.ticker.remove(tic); ScrollTrigger.removeEventListener('refresh', paradas); snap.destroy(); lenis.destroy(); document.removeEventListener('click', clic) }
  }, [baja])

  useGSAP(() => {
    CAPITULOS.forEach((c, i) => {
      ScrollTrigger.create({
        id: `cap-${c.id}`, trigger: `#${c.id}`, start: 'top center', end: 'bottom center',
        onUpdate: s => { scroll.objetivo = i - 0.5 + s.progress },
      })
    })
    ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => { scroll.total = s.progress } })
    // la escena no lee el scroll crudo sino uno amortiguado: cero tirones entre capítulos
    const muelle = (_: number, dtMs: number) => amortigua(dtMs / 1000)
    gsap.ticker.add(muelle)
    return () => gsap.ticker.remove(muelle)
    // titulares y párrafos marcados entran palabra a palabra, desde detrás de una máscara
    gsap.utils.toArray<HTMLElement>('[data-revela]').forEach(el => {
      const sp = SplitText.create(el, { type: 'words', mask: 'words' })
      gsap.from(sp.words, { yPercent: 110, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.026,
        scrollTrigger: { trigger: el, start: 'top 84%' } })
    })
    // la cabecera de cada capítulo («03 · El mercado») se descifra como un panel de salidas,
    // pasando por letras árabes antes de quedarse en español
    gsap.utils.toArray<HTMLElement>('.capitulo .num, .viaje-cabeza .num').forEach(el => {
      const texto = el.textContent ?? ''
      gsap.to(el, { duration: 1.1, ease: 'none', scrambleText: { text: texto, chars: 'ابتثجحخدرسشصطعفقكلمنهوي0123456789', speed: 0.8, revealDelay: 0.2 },
        scrollTrigger: { trigger: el, start: 'top 85%' } })
    })
    // las piezas suben e inclinan hacia delante, como una lámina que se asienta
    gsap.utils.toArray<HTMLElement>('[data-entra]').forEach(el => {
      gsap.from(el, { y: 70, rotateX: -22, opacity: 0, transformPerspective: 1000, transformOrigin: '50% 100%',
        duration: 1.2, ease: 'power4.out', scrollTrigger: { trigger: el, start: 'top 90%' } })
    })
    // los paneles de texto aparecen con un barrido de luz en el borde
    gsap.utils.toArray<HTMLElement>('.capitulo .texto').forEach(el => {
      gsap.fromTo(el, { '--barrido': '-30%' }, { '--barrido': '130%', duration: 1.8, ease: 'power2.inOut',
        scrollTrigger: { trigger: el, start: 'top 75%' } })
    })
  }, { scope: raiz })

  return (
    <div ref={raiz} className="app">
      <div className="lienzo" aria-hidden="true">
        <Canvas dpr={dpr} camera={{ position: [0, 0.1, 6.4], fov: 38 }}
          gl={{ antialias: false, powerPreference: 'high-performance', toneMapping: ACESFilmicToneMapping }}>
          {/* si el equipo no llega a 50 fps, baja la resolución antes de que se note el tirón */}
          <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(Math.min(1.5, window.devicePixelRatio))} flipflops={3} onFallback={() => setDpr(1)} />
          <Suspense fallback={null}><Escena trafico={trafico} /></Suspense>
        </Canvas>
      </div>
      <Cargador />
      <Cinta trafico={trafico} />
      <Indice />
      <main>
        <Portada />
        <Corredor />
        <Ahora trafico={trafico} />
        <Mercado />
        <Estacion />
        <Gasto />
        <Veredicto />
        <Viaje />
        <Cierre />
      </main>
    </div>
  )
}
