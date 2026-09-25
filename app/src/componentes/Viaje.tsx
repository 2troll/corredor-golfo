// «El viaje»: el recorrido de un viajero del Golfo, de Dubái a las cuatro ciudades
// de Kansai. La sección se queda fija y las paradas pasan en horizontal con el
// scroll; cada medallón se dibuja a pluma (DrawSVG) al entrar en pantalla y un
// avión recorre la ruta de arriba al ritmo del viaje. Las frecuencias salen del
// estudio; los tiempos de tren son aproximados y así se dice.
import { useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { useGSAP } from '@gsap/react'
import { datos } from '../tipos'
import { Medallon } from './Dibujos'

gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MotionPathPlugin)

const frec = (origen: string): number =>
  datos.rutas.find(r => r.origen.startsWith(origen) && r.destino.startsWith('Osaka') && r.estado === 'operativa')?.frecuencia ?? 0
const h = datos.halal

const PARADAS = [
  { clave: 'dubai', paso: 'Sale', titulo: 'Del Golfo, en vuelo directo',
    texto: `Emirates vuela Dubái → Osaka Kansai ${frec('Dubái')} veces por semana y Qatar Airways, Doha → Osaka Kansai, ${frec('Doha')}. Son las dos únicas rutas directas del Golfo a Kansai.`,
    dato: `${frec('Dubái') + frec('Doha')}`, pie: 'vuelos directos a la semana hacia Kansai' },
  { clave: 'kix', paso: 'Aterriza', titulo: 'Una isla en la bahía de Osaka',
    texto: 'El aeropuerto de Kansai se construyó sobre una isla artificial. Desde allí salen trenes directos a Osaka y a Kioto: el viajero no pasa por Tokio.',
    dato: 'KIX', pie: 'la puerta de Kansai' },
  { clave: 'osaka', paso: 'Base', titulo: 'Osaka, donde se duerme',
    texto: `La base del servicio: el castillo, Dōtonbori y el nudo de trenes de toda la región. El estudio verificó, una a una, ${h.mezquitas} mezquitas, ${h.salas_oracion} salas de oración, ${h.restaurantes} restaurantes y ${h.hoteles} hoteles de la cadena halal.`,
    dato: String(h.mezquitas + h.salas_oracion + h.restaurantes + h.hoteles), pie: 'entradas halal verificadas' },
  { clave: 'kioto', paso: 'Excursión', titulo: 'Kioto, bajo los torii',
    texto: 'Los miles de torii bermellón de Fushimi Inari, templos y jardines. La jornada más fotogénica del circuito.',
    dato: '≈ 30 min', pie: 'de Osaka en tren' },
  { clave: 'nara', paso: 'Excursión', titulo: 'Nara, entre ciervos',
    texto: 'Los ciervos sueltos del parque de Nara, que se acercan a saludar, en la que fue la primera capital permanente de Japón. Media jornada tranquila, perfecta para familias.',
    dato: '≈ 45 min', pie: 'de Osaka en tren' },
  { clave: 'kobe', paso: 'Excursión', titulo: 'Kobe, puerto y primera mezquita',
    texto: 'La torre del puerto, la montaña detrás y la Mezquita de Kobe, de 1935: la primera de Japón. Para el viajero del Golfo, la parada que cierra el círculo.',
    dato: '≈ 25 min', pie: 'de Osaka en tren' },
]

export default function Viaje() {
  const ref = useRef<HTMLElement>(null)
  useGSAP(() => {
    const pista = ref.current!.querySelector<HTMLElement>('.pista-viaje')!
    const distancia = () => pista.scrollWidth - window.innerWidth
    const mov = gsap.to(pista, {
      x: () => -distancia(), ease: 'none',
      scrollTrigger: { trigger: ref.current, start: 'top top', end: () => '+=' + distancia(), pin: true, scrub: 1, invalidateOnRefresh: true },
    })
    // el avión de la cabecera recorre la ruta al ritmo de la pista
    gsap.to('.viaje-avion', { ease: 'none', motionPath: { path: '.viaje-ruta', align: '.viaje-ruta', alignOrigin: [0.5, 0.5], autoRotate: true },
      scrollTrigger: { trigger: ref.current, start: 'top top', end: () => '+=' + distancia(), scrub: 1 } })
    gsap.from('.viaje-ruta', { drawSVG: 0, ease: 'none',
      scrollTrigger: { trigger: ref.current, start: 'top top', end: () => '+=' + distancia(), scrub: 1 } })
    // cada medallón se dibuja a pluma cuando su parada entra en pantalla
    gsap.utils.toArray<HTMLElement>('.parada').forEach(p => {
      const st = { trigger: p, containerAnimation: mov, start: 'left 85%' }
      gsap.timeline({ scrollTrigger: st })
        .from(p.querySelectorAll('.aro'), { drawSVG: 0, duration: 1.1, ease: 'power2.inOut', stagger: 0.15 })
        .from(p.querySelectorAll('.trazos path'), { drawSVG: 0, duration: 1.3, ease: 'power1.inOut', stagger: 0.05 }, '<0.2')
        .from(p.querySelectorAll('.sol'), { scale: 0, transformOrigin: '50% 50%', duration: 1.2, ease: 'expo.out' }, '<')
        .from(p.querySelectorAll('.cuerpo > *'), { y: 28, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.07 }, '<0.3')
    })
    // los anillos de texto giran despacio, cada uno a su aire
    gsap.utils.toArray<SVGGElement>('.parada .giro').forEach((g, i) =>
      gsap.to(g, { rotation: i % 2 ? -360 : 360, svgOrigin: '100 100', duration: 90 + i * 7, ease: 'none', repeat: -1 }))
  }, { scope: ref })

  return (
    <section id="viaje" ref={ref} className="viaje">
      <div className="viaje-cabeza">
        <p className="num">07 · El viaje</p>
        <h2>De Dubái a Kansai, como lo vive el viajero.</h2>
        <svg className="viaje-mapa" viewBox="0 0 1000 60" preserveAspectRatio="none" aria-hidden="true">
          <path className="viaje-guia" d="M10 48 Q500 -20 990 48" />
          <path className="viaje-ruta" d="M10 48 Q500 -20 990 48" />
          <path className="viaje-avion" d="M-9 0 L6 -2 L9 0 L6 2 Z M-2 -1 L-5 -7 L-2 -7 L3 -1 M-2 1 L-5 7 L-2 7 L3 1" />
        </svg>
      </div>
      <div className="pista-viaje">
        {PARADAS.map((p, i) => (
          <article key={p.clave} className="parada">
            <Medallon clave={p.clave} id={`v${i}`} />
            <div className="cuerpo">
              <p className="paso"><span>{String(i + 1).padStart(2, '0')}</span>{p.paso}</p>
              <h3>{p.titulo}</h3>
              <p>{p.texto}</p>
              <p className="dato"><b>{p.dato}</b><span>{p.pie}</span></p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
