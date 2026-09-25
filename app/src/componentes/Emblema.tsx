// El emblema de la portada: un sello circular que resume el corredor. La mitad de
// arriba lleva estrellas de ocho puntas (el khatam de la geometría del Golfo); la
// de abajo, olas seigaiha (el patrón japonés del mar). Entre las dos, un anillo
// con las ciudades de salida y de llegada, una esfera graduada como una brújula y,
// en el centro, el arco del vuelo. Se dibuja a pluma al cargar y cada anillo gira
// a su ritmo; al abrir la portada se agranda y se desvanece.
import { useRef } from 'react'
import gsap from 'gsap'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { useGSAP } from '@gsap/react'

gsap.registerPlugin(DrawSVGPlugin)

const C = 500 // centro del lienzo de 1000 × 1000
const polar = (r: number, a: number): [number, number] => [C + r * Math.cos(a), C + r * Math.sin(a)]
const f = (n: number) => n.toFixed(1)

/** Estrella de ocho puntas: dos cuadrados girados 45° entre sí. */
function khatam(cx: number, cy: number, r: number, giro: number): string {
  const cuadrado = (d: number) => Array.from({ length: 4 }, (_, k) => {
    const a = giro + d + (k * Math.PI) / 2
    return `${k ? 'L' : 'M'}${f(cx + r * Math.cos(a))} ${f(cy + r * Math.sin(a))}`
  }).join(' ') + ' Z'
  return cuadrado(0) + ' ' + cuadrado(Math.PI / 4)
}

/** Una escama seigaiha: tres arcos concéntricos abiertos hacia fuera del círculo. */
function seigaiha(cx: number, cy: number, r: number, giro: number): string {
  return [1, 0.68, 0.36].map(k => {
    const rr = r * k
    const [x1, y1] = [cx + rr * Math.cos(giro + Math.PI / 2), cy + rr * Math.sin(giro + Math.PI / 2)]
    const [x2, y2] = [cx + rr * Math.cos(giro - Math.PI / 2), cy + rr * Math.sin(giro - Math.PI / 2)]
    return `M${f(x1)} ${f(y1)} A${f(rr)} ${f(rr)} 0 0 1 ${f(x2)} ${f(y2)}`
  }).join(' ')
}

const N = 28
const ESTRELLAS = Array.from({ length: N / 2 }, (_, i) => {
  const a = Math.PI + (i + 0.5) * (Math.PI / (N / 2)) // mitad de arriba
  const [x, y] = polar(392, a)
  return khatam(x, y, 17, a)
})
const ESCAMAS = Array.from({ length: N / 2 }, (_, i) => {
  const a = (i + 0.5) * (Math.PI / (N / 2)) // mitad de abajo
  const [x, y] = polar(386, a)
  return seigaiha(x, y, 24, a + Math.PI)
})
const MARCAS = Array.from({ length: 120 }, (_, i) => {
  const a = (i / 120) * Math.PI * 2, largo = i % 10 === 0 ? 18 : i % 5 === 0 ? 11 : 6
  const [x1, y1] = polar(318, a), [x2, y2] = polar(318 - largo, a)
  return `M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)}`
}).join(' ')
const TEXTO = 'DUBÁI · DOHA · ABU DABI · RIAD  —  関西  —  OSAKA · KIOTO · NARA · KOBE  —  الخليج  —  '

export default function Emblema() {
  const ref = useRef<SVGSVGElement>(null)
  useGSAP(() => {
    gsap.timeline({ delay: 0.4 })
      .from('.em-aro', { drawSVG: '50% 50%', duration: 2.2, ease: 'expo.inOut', stagger: 0.12 })
      .from('.em-khatam', { drawSVG: 0, duration: 1.4, ease: 'power2.inOut', stagger: { each: 0.05, from: 'center' } }, '<0.5')
      .from('.em-ola', { drawSVG: 0, duration: 1.4, ease: 'power2.inOut', stagger: { each: 0.05, from: 'center' } }, '<')
      .from('.em-marcas', { opacity: 0, duration: 1.6 }, '<0.3')
      .from('.em-texto', { opacity: 0, duration: 1.6 }, '<')
      .from('.em-vuelo', { drawSVG: 0, duration: 1.8, ease: 'power3.inOut' }, '<0.4')
      .from('.em-punto', { scale: 0, transformOrigin: '50% 50%', duration: 0.8, ease: 'back.out(3)', stagger: 0.4 }, '<')
    // cada anillo gira a su ritmo; el de las ciudades va al revés
    gsap.to('.em-giro-a', { rotation: 360, svgOrigin: `${C} ${C}`, duration: 240, ease: 'none', repeat: -1 })
    gsap.to('.em-giro-b', { rotation: -360, svgOrigin: `${C} ${C}`, duration: 160, ease: 'none', repeat: -1 })
    gsap.to('.em-giro-c', { rotation: 360, svgOrigin: `${C} ${C}`, duration: 120, ease: 'none', repeat: -1 })
    // al abrir la portada el emblema se acerca y se deshace
    gsap.to(ref.current, { scale: 1.6, opacity: 0, ease: 'power1.in',
      scrollTrigger: { trigger: '#portada', start: 'top top', end: '+=70%', scrub: 1 } })
  }, { scope: ref })

  return (
    <svg ref={ref} className="emblema" viewBox="0 0 1000 1000" aria-hidden="true">
      <defs><path id="em-circulo" d={`M${C} ${C} m-446 0 a446 446 0 1 1 892 0 a446 446 0 1 1 -892 0`} /></defs>
      <circle className="em-aro" cx={C} cy={C} r="480" />
      <circle className="em-aro fino" cx={C} cy={C} r="468" />
      <g className="em-giro-b"><text className="em-texto"><textPath href="#em-circulo">{TEXTO.repeat(2)}</textPath></text></g>
      <circle className="em-aro fino" cx={C} cy={C} r="424" />
      <g className="em-giro-a">
        {ESTRELLAS.map((d, i) => <path key={i} className="em-khatam" d={d} />)}
        {ESCAMAS.map((d, i) => <path key={i} className="em-ola" d={d} />)}
      </g>
      <circle className="em-aro fino" cx={C} cy={C} r="350" />
      <g className="em-giro-c"><path className="em-marcas" d={MARCAS} /></g>
      <circle className="em-aro" cx={C} cy={C} r="290" />
      <path className="em-vuelo" d={`M${C - 210} ${C + 60} Q${C} ${C - 170} ${C + 210} ${C + 20}`} />
      <circle className="em-punto golfo" cx={C - 210} cy={C + 60} r="7" />
      <circle className="em-punto kansai" cx={C + 210} cy={C + 20} r="7" />
    </svg>
  )
}
