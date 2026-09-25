// Datos en vivo, todos gratis y sin clave. Cada fuente puede fallar sola: el
// componente que la usa muestra lo que haya y dice de dónde sale.
import { useEffect, useState } from 'react'
import type { Trafico } from '../tipos'

const TRAFICO = 'https://raw.githubusercontent.com/2troll/corredor-golfo/datos/trafico.json'
const METEO = 'https://api.open-meteo.com/v1/forecast'

export const hhmm = (d: Date, tz = 'UTC'): string =>
  new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: tz }).format(d)

/** Instantánea de OpenSky; se descarta si tiene más de seis horas. */
export function useTrafico(): Trafico | null {
  const [t, setT] = useState<Trafico | null>(null)
  useEffect(() => {
    let vivo = true
    const pide = () => fetch(TRAFICO, { cache: 'no-cache' })
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: Trafico) => { if (vivo && Date.now() / 1000 - d.t < 6 * 3600) setT(d) })
      .catch(() => {})
    pide()
    const id = setInterval(pide, 5 * 60e3)
    return () => { vivo = false; clearInterval(id) }
  }, [])
  return t
}

export interface Clima { t: number; h: number; cielo: string }
const CIELO = (c: number): string => c === 0 ? 'despejado' : c <= 2 ? 'poco nuboso' : c === 3 ? 'cubierto'
  : c <= 48 ? 'niebla' : c <= 57 ? 'llovizna' : c <= 67 ? 'lluvia' : c <= 77 ? 'nieve'
  : c <= 82 ? 'chubascos' : c <= 86 ? 'nieve' : 'tormenta'

interface RespuestaMeteo { current: { temperature_2m: number; relative_humidity_2m: number; weather_code: number } }

/** Tiempo actual en Dubái y Osaka (Open-Meteo). */
export function useTiempo(): { dubai: Clima; osaka: Clima } | null {
  const [w, setW] = useState<{ dubai: Clima; osaka: Clima } | null>(null)
  useEffect(() => {
    fetch(`${METEO}?latitude=25.2,34.69&longitude=55.27,135.5&current=temperature_2m,weather_code,relative_humidity_2m`)
      .then(r => (r.ok ? r.json() : Promise.reject(r.status)))
      .then(([a, b]: RespuestaMeteo[]) => {
        const c = (x: RespuestaMeteo): Clima => ({ t: Math.round(x.current.temperature_2m), h: x.current.relative_humidity_2m, cielo: CIELO(x.current.weather_code) })
        setW({ dubai: c(a), osaka: c(b) })
      })
      .catch(() => {})
  }, [])
  return w
}

/** Un reloj que vuelve a pintar cada `ms`. */
export function useAhora(ms = 1000): Date {
  const [d, setD] = useState(() => new Date())
  useEffect(() => { const id = setInterval(() => setD(new Date()), ms); return () => clearInterval(id) }, [ms])
  return d
}

/** Punto subsolar (aproximación de Cooper): dónde es mediodía ahora mismo. */
export function subsolar(d = new Date()): [number, number] {
  const dia = (d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 0)) / 864e5
  const decl = -23.44 * Math.cos((2 * Math.PI / 365) * (dia + 10))
  return [decl, -15 * (d.getUTCHours() + d.getUTCMinutes() / 60 - 12)]
}

/** Ayer en UTC (AAAA-MM-DD): la imagen diaria de NASA de hoy aún no está completa. */
export const ayerUTC = (): string => new Date(Date.now() - 864e5).toISOString().slice(0, 10)
