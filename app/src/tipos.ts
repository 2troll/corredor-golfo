// Forma de datos.json, que genera scripts/extraer-datos.mjs a partir del estudio.
import crudo from './datos.json'

export interface Ruta {
  compania: string; origen: string; destino: string; frecuencia: number
  puerta: string; estado: 'operativa' | 'anunciada' | 'sin ruta'; lat: number; lon: number
}
export interface Mercado { mercado: string; yen: number; destacado: boolean }
export interface Fecha { clave: 'ramadan' | 'eid_al_fitr' | 'eid_al_adha'; inicio: string; fin: string }
export interface Tarjeta { et: string; v: string; n: string }
export interface Datos {
  titular: string; entradilla: string; generado: string
  serie: Record<string, (number | null)[]>
  idxGolfo: number[]; idxEspana: number[]; meses: string[]
  gasto: Mercado[]; rutas: Ruta[]; puertas: Record<string, [number, number]>
  calendario: Fecha[]; tarjetas: Tarjeta[]
}
export const datos = crudo as unknown as Datos

/** Instantánea de OpenSky que publica la tarea de GitHub. */
export interface Trafico {
  t: number
  golfo: { n: number; p: [number, number, number][] }
  japon: { n: number; p: [number, number, number][] }
  corredor: [string, number, number, number, number, number][]
}
