// La portada: dos hojas que se abren como la tapa de un informe y dejan ver
// la Tierra detrás. La apertura va atada al scroll (scrub), así que se puede
// abrir y volver a cerrar.
import { useRef } from 'react'
import gsap from 'gsap'
import { SplitText } from 'gsap/SplitText'
import { useGSAP } from '@gsap/react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { datos } from '../tipos'
import { scroll } from '../lib/scroll'

export default function Portada() {
  const ref = useRef<HTMLElement>(null)
  useGSAP(() => {
    // al cargar, el título aparece letra a letra sobre las hojas cerradas
    const sp = SplitText.create('.tapa h1', { type: 'chars,words', mask: 'chars' })
    gsap.timeline({ delay: 0.25 })
      .from('.tapa .epig', { opacity: 0, y: 12, duration: .8, ease: 'power2.out' })
      .from(sp.chars, { yPercent: 120, duration: 1, ease: 'expo.out', stagger: .018 }, '<.1')
      .from('.tapa .pie > *', { opacity: 0, y: 10, stagger: .08, duration: .7 }, '-=.5')
      .from('.tapa .baja', { opacity: 0, duration: .8 }, '-=.2')

    // las hojas se abren con el scroll: giran sobre sus bisagras y se apartan
    gsap.timeline({
      scrollTrigger: { trigger: ref.current, start: 'top top', end: '+=85%', scrub: 1,
        onUpdate: (s: ScrollTrigger) => { scroll.puertas = s.progress } },
    })
      .to('.hoja.izq', { rotateY: 72, xPercent: -18, ease: 'power2.in' }, 0)
      .to('.hoja.der', { rotateY: -72, xPercent: 18, ease: 'power2.in' }, 0)
      .to('.tapa', { opacity: 0, scale: .92, ease: 'power1.in' }, 0)
      .to('.hojas', { opacity: 0, ease: 'power2.in' }, .45)
      .from('.tras-tapa', { opacity: 0, y: 40 }, .55)
  }, { scope: ref })

  return (
    <section id="portada" ref={ref} className="portada">
      <div className="fijo">
        <div className="hojas" aria-hidden="true">
          <div className="hoja izq"><span className="lomo">ESTUDIO · 2026</span></div>
          <div className="hoja der"><span className="lomo">GOLFO → KANSAI</span></div>
        </div>
        <div className="tapa">
          <p className="epig">Estudio de viabilidad · Dubái → Kansai</p>
          <h1>El corredor del Golfo</h1>
          <div className="pie">
            <span>Mercado</span><span>Corredor aéreo</span><span>Lo que viene</span><span>Datos en vivo</span>
          </div>
          <p className="baja">Desliza para abrir</p>
        </div>
        <div className="tras-tapa">
          <p className="epig">La conclusión, antes que los datos</p>
          <h2 dangerouslySetInnerHTML={{ __html: datos.titular }} />
        </div>
      </div>
    </section>
  )
}
