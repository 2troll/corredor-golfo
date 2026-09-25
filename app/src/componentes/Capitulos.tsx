// Los capítulos del relato. Cada cifra sale de datos.json (extraído del
// estudio) o de una fuente en vivo que se nombra al lado; las fechas de «lo
// que viene» son las que el estudio cita, con su apartado.
import { useRef, useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { datos, type Trafico } from '../tipos'
import { useAhora, useTiempo, hhmm, subsolar } from '../lib/vivo'

const fmt = (v: number): string => v.toLocaleString('es-ES', { useGrouping: true }).replace(/^(\d)(\d{3})$/, '$1.$2')
const dia = (iso: string): number => Date.parse(iso + 'T00:00:00Z')
const fechaLarga = (iso: string): string => new Date(dia(iso)).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

function Capitulo({ id, num, titulo, children, clase = '' }: { id: string; num: string; titulo: string; children: ReactNode; clase?: string }) {
  return (
    <section id={id} className={`capitulo ${clase}`}>
      <div className="texto">
        <p className="num">{num}</p>
        <h2 data-revela>{titulo}</h2>
        {children}
      </div>
    </section>
  )
}

/** Una cifra que cuenta desde cero al entrar en pantalla, conservando su formato. */
function Cuenta({ valor }: { valor: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useGSAP(() => {
    const m = valor.match(/[\d.]+(,\d+)?/); if (!m) return
    const dec = (m[1] || '').length - 1, fin = parseFloat(m[0].replace(/\./g, '').replace(',', '.'))
    const o = { v: 0 }
    gsap.to(o, {
      v: fin, duration: 1.8, ease: 'power3.out',
      scrollTrigger: { trigger: ref.current, start: 'top 85%' },
      onUpdate: () => { if (ref.current) ref.current.textContent = valor.replace(m[0], o.v.toLocaleString('es-ES',
        { minimumFractionDigits: Math.max(0, dec), maximumFractionDigits: Math.max(0, dec), useGrouping: true }).replace(/^(\d)(\d{3})$/, '$1.$2')) },
    })
  })
  return <span ref={ref}>{valor}</span>
}

export function Corredor() {
  const ops = datos.rutas.filter(r => r.estado === 'operativa')
  const semana = ops.reduce((s, r) => s + r.frecuencia, 0)
  return (
    <Capitulo id="corredor" num="01 · El corredor" titulo="Sin avión no hay mercado, y el avión es lo que falló en 2026.">
      <p data-revela>Seis orígenes en el Golfo, dos puertas en Japón. Cada arco es una ruta real; los que van en
        oro están anunciados y todavía no vuelan. Al bajar, la Tierra gira del Golfo a Kansai.</p>
      <div className="fichas" data-entra>
        <div><b>{semana}</b><span>vuelos directos por semana</span></div>
        <div><b>{(semana / 7).toLocaleString('es-ES', { maximumFractionDigits: 1 })}</b><span>salidas al día hacia Japón</span></div>
        <div><b>{ops.length}</b><span>rutas operativas</span></div>
      </div>
      <ul className="rutas" data-entra>
        {datos.rutas.filter(r => r.frecuencia).map((r, i) => (
          <li key={i} className={r.estado}>
            <span>{r.compania}</span><span>{r.origen.replace(/\s*\(.*/, '')} → {r.destino.replace(/\s*\(.*/, '')}</span>
            <span>{r.frecuencia}/sem</span>
          </li>
        ))}
      </ul>
    </Capitulo>
  )
}

// «Lo que viene»: fechas que el estudio cita, y el calendario hiyrí calculado con su propio código
const VIENE = [
  { f: '2026-10-26', t: 'Emirates duplica Narita', d: 'Segunda frecuencia diaria Dubái–Tokio.', ap: 'Estudio · Corredor aéreo' },
  { f: '2026-11-01', t: 'Se abre la ventana', d: 'De noviembre de 2026 a mayo de 2027: el momento para entrar.', ap: 'Estudio · Veredicto' },
  { f: '2026-11-17', t: 'Saudia inaugura Riad–Narita', d: 'Primera ruta directa entre Arabia Saudí y Japón desde 2022. Arabia Saudí es el 42,9 % del mercado.', ap: 'Estudio · Corredor aéreo' },
  { f: '2026-12-02', t: 'Día de la Unión, Emiratos', d: 'Con Baréin el 16 y Catar el 18: diciembre reúne tres fiestas nacionales del Golfo.', ap: 'Estudio · Estacionalidad' },
  ...datos.calendario.map(c => ({
    f: c.inicio,
    t: ({ ramadan: 'Empieza el Ramadán', eid_al_fitr: 'Eid al-Fitr', eid_al_adha: 'Eid al-Adha' } as const)[c.clave],
    d: ({ ramadan: 'Mes de preparar, no de vender.', eid_al_fitr: 'La mejor ventana del año: la demanda se libera.', eid_al_adha: 'Ventana corta y de ticket alto.' } as const)[c.clave],
    ap: 'Calendario hiyrí tabular (aproximado ±1 día)',
  })),
  { f: '2027-05-03', t: 'Arabian Travel Market, Dubái', d: 'La feria del corredor, del 3 al 6 de mayo. La presencia de JNTO está sin decidir.', ap: 'Estudio · Ir al mercado' },
  { f: '2027-05-31', t: 'Se cierra la ventana', d: 'Después llega el verano, que no es el pico del Golfo.', ap: 'Estudio · Veredicto' },
].sort((a, b) => a.f.localeCompare(b.f))

export function Ahora({ trafico }: { trafico: Trafico | null }) {
  const ahora = useAhora(15000)
  const w = useTiempo()
  const [la, lo] = subsolar(ahora)
  const hoy = Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate())
  const proximo = VIENE.findIndex(v => dia(v.f) >= hoy)
  return (
    <Capitulo id="ahora" num="02 · Ahora mismo, y lo que viene" titulo="Lo que está pasando mientras lee esto." clase="ancho">
      <div className="vivo" data-entra>
        <div className="celda">
          <span className="et"><i className="pulso" />En el aire sobre el Golfo</span>
          <b>{trafico ? trafico.golfo.n : '—'}</b>
          <span className="n">{trafico ? `OpenSky · ${hhmm(new Date(trafico.t * 1000))} UTC` : 'sin datos de tráfico ahora'}</span>
        </div>
        <div className="celda">
          <span className="et"><i className="pulso" />En el aire sobre Japón</span>
          <b>{trafico ? trafico.japon.n : '—'}</b>
          <span className="n">{trafico ? `${trafico.corredor.length} aviones del Golfo en ruta hacia el este u oeste` : ''}</span>
        </div>
        <div className="celda">
          <span className="et">Dubái</span>
          <b>{hhmm(ahora, 'Asia/Dubai')}</b>
          <span className="n">{w ? `${w.dubai.t} °C · ${w.dubai.cielo} · ${w.dubai.h} % humedad` : 'Open-Meteo'}</span>
        </div>
        <div className="celda">
          <span className="et">Osaka</span>
          <b>{hhmm(ahora, 'Asia/Tokyo')}</b>
          <span className="n">{w ? `${w.osaka.t} °C · ${w.osaka.cielo} · ${w.osaka.h} % humedad` : 'Open-Meteo'}</span>
        </div>
        <div className="celda larga">
          <span className="et">El sol, ahora</span>
          <span className="n">Es mediodía sobre {Math.abs(la).toFixed(0)}° {la >= 0 ? 'N' : 'S'}, {Math.abs(lo).toFixed(0)}° {lo >= 0 ? 'E' : 'O'}:
            la Tierra de fondo está iluminada así en este momento.</span>
        </div>
      </div>
      <h3 className="sub" data-revela>Lo que viene</h3>
      <ol className="viene">
        {VIENE.map((v, i) => {
          const dias = Math.round((dia(v.f) - hoy) / 864e5)
          return (
            <li key={v.f + v.t} data-entra className={dias < 0 ? 'pasado' : i === proximo ? 'proximo' : ''}>
              <span className="fecha">{fechaLarga(v.f)}</span>
              <span className="falta">{dias < 0 ? 'ya pasó' : dias === 0 ? 'hoy' : `en ${fmt(dias)} días`}</span>
              <b>{v.t}</b><span className="d">{v.d}</span><span className="ap">{v.ap}</span>
            </li>
          )
        })}
      </ol>
    </Capitulo>
  )
}

export function Mercado() {
  return (
    <Capitulo id="mercado" num="03 · El mercado" titulo="Pequeño, caído en 2026, y el segundo que más gasta.">
      <div className="tarjetas">
        {datos.tarjetas.map((t, i) => (
          <div key={i} className={`tarjeta ${i === 1 ? 'alerta' : i === 2 ? 'fuerte' : ''}`} data-entra>
            <span className="et">{t.et}</span><b><Cuenta valor={t.v} /></b><span className="n">{t.n}</span>
          </div>
        ))}
      </div>
      <p data-revela>Detrás, las llegadas mes a mes de 2023 a 2026. En coral, febrero a abril de 2026: el
        Ramadán y la suspensión de vuelos. En abril el Golfo cayó un 71,2 % mientras Turquía subía.</p>
    </Capitulo>
  )
}

export function Estacion() {
  return (
    <Capitulo id="estacion" num="04 · Cuándo" titulo="El pico del Golfo no está en verano. Está en diciembre y en abril.">
      <p data-revela>El reloj de detrás tiene doce meses: el anillo interior es el Golfo, el exterior España.
        Donde uno sube y el otro baja está la complementariedad. En coral, el Ramadán de 2027.</p>
      <div className="fichas" data-entra>
        <div><b>{datos.idxGolfo[11]}</b><span>diciembre, Golfo (España {datos.idxEspana[11]})</span></div>
        <div><b>{datos.idxGolfo[3]}</b><span>abril, Golfo (España {datos.idxEspana[3]})</span></div>
        <div><b>{datos.idxGolfo[7]}</b><span>agosto, Golfo (España {datos.idxEspana[7]})</span></div>
      </div>
      <p className="nota">Índice 100 = mes medio de 2023 a 2025. Fuente: JNTO, cálculo del estudio.</p>
    </Capitulo>
  )
}

export function Gasto() {
  const om = datos.gasto.find(g => g.destacado)!, media = datos.gasto.find(g => g.mercado === 'Media general')!
  return (
    <Capitulo id="gasto" num="05 · Cuánto gasta" titulo="Casi el doble de la media, y doce noches y media.">
      <p data-revela>Las torres son el gasto por visitante dentro de Japón. La verde es Oriente Medio:
        {' '}{fmt(om.yen)} ¥ frente a {fmt(media.yen)} ¥ de media. Es el segundo de veintitrés mercados.</p>
      <p className="nota">Agencia de Turismo de Japón, 2.º trimestre de 2026. «Oriente Medio» incluye Turquía e Israel: el estudio lo explica y propone cómo separarlo.</p>
    </Capitulo>
  )
}

const CLAVES = [
  { a: 'Qué hacer', b: 'Entrar sin montar estructura', c: 'Jornadas de guía en árabe a 39.600 ¥, sin riesgo de caja, y viajes completos cuando una agencia emisora los pida.' },
  { a: 'Cuándo', b: 'Noviembre de 2026 a mayo de 2027', c: 'Diciembre gana por demanda y por precio; abril es fuerte pero el más caro del año.' },
  { a: 'Cuánto', b: '9 viajes en el escenario base', c: '3.478.300 ¥ de margen al operador y 2.087.000 ¥ de honorarios, con los dos porcentajes como supuestos declarados.' },
  { a: 'El riesgo', b: 'La caja del operador', c: 'La barrera no es un registro: es que el operador anticipa hoteles antes de cobrar.' },
]
function Clave({ k }: { k: { a: string; b: string; c: string } }) {
  const [vuelta, setVuelta] = useState(false)
  return (
    <motion.button className="clave" onClick={() => setVuelta(v => !v)} onHoverStart={() => setVuelta(true)}
      onHoverEnd={() => setVuelta(false)} animate={{ rotateY: vuelta ? 180 : 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 16 }} aria-pressed={vuelta}>
      <span className="cara"><span className="et">{k.a}</span><b>{k.b}</b><span className="gira">↻</span></span>
      <span className="cara dorso">{k.c}</span>
    </motion.button>
  )
}
export function Veredicto() {
  return (
    <Capitulo id="veredicto" num="06 · Veredicto" titulo="Sí, pero como servicio de ticket alto y sin coste fijo." clase="ancho">
      <div className="claves">{CLAVES.map(k => <Clave key={k.a} k={k} />)}</div>
      <p className="nota">Pase el ratón o toque cada tarjeta. Las cifras son las del estudio: Costes y márgenes, y Escenarios.</p>
    </Capitulo>
  )
}

export function Cierre() {
  return (
    <Capitulo id="cierre" num="07 · Siguiente paso" titulo="Todo esto, con sus fuentes, en el estudio completo.">
      <p data-revela>Veintiún apartados, el simulador de costes, el globo con capas de NASA y el anexo con
        cada consulta y su respuesta.</p>
      <div className="acciones" data-entra>
        <a className="boton" href="../">Leer el estudio completo</a>
        <a className="boton claro" href="../#corredor">Abrir el globo en vivo</a>
      </div>
      <p className="contacto" data-entra>Tony Kansai Guide · <a href="mailto:tony@tonykansaiguide.com">tony@tonykansaiguide.com</a></p>
      <p className="nota">Datos en vivo: OpenSky Network, Open-Meteo y NASA. Cifras del mercado: JNTO y Agencia de Turismo de Japón, vía el estudio.</p>
    </Capitulo>
  )
}
