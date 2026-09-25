#!/usr/bin/env node
// Extrae los datos de la experiencia del propio estudio (../index.html).
//
// No se copian cifras a mano: se leen las constantes que comprobar.py ya
// contrasta con JNTO y con el modelo, y se ejecutan en un contexto aislado
// (vm) las funciones del calendario hiyrí, así las fechas del Ramadán y de
// los Eid son las mismas en las dos páginas. Si falta algo, falla en voz alta.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import vm from 'node:vm'

const aqui = dirname(fileURLToPath(import.meta.url))
const html = readFileSync(join(aqui, '../../index.html'), 'utf8')

/** Texto de un bloque que abre en `desde` con [ { ( y cierra en su pareja. */
function bloque(desde) {
  const abre = html[desde], cierra = { '[': ']', '{': '}', '(': ')' }[abre]
  let n = 0, cadena = null
  for (let i = desde; i < html.length; i++) {
    const c = html[i]
    if (cadena) { if (c === '\\') i++; else if (c === cadena) cadena = null; continue }
    if (c === '"' || c === "'" || c === '`') { cadena = c; continue }
    if (c === abre) n++
    else if (c === cierra && --n === 0) return html.slice(desde, i + 1)
  }
  throw new Error(`bloque sin cerrar en ${desde}`)
}

function constante(nombre) {
  const m = new RegExp(`const ${nombre}\\s*=\\s*`).exec(html)
  if (!m) throw new Error(`no encuentro const ${nombre} en index.html`)
  return vm.runInNewContext(`(${bloque(m.index + m[0].length)})`)
}

function funcion(nombre) {
  const i = html.indexOf(`function ${nombre}(`)
  if (i < 0) throw new Error(`no encuentro function ${nombre} en index.html`)
  return html.slice(i, i + bloque(html.indexOf('{', i)).length + (html.indexOf('{', i) - i))
}

// El calendario 2027 se calcula con el código del estudio, no con uno nuevo
const ctx = vm.createContext({})
vm.runInContext(funcion('hiyriAGreg') + '\n' + funcion('calendario'), ctx)
const cal = vm.runInContext('calendario(2027)', ctx).map(c => ({
  ...c, inicio: new Date(c.inicio).toISOString().slice(0, 10), fin: new Date(c.fin).toISOString().slice(0, 10),
}))

// Las cuatro tarjetas del veredicto, tal como las lee quien abre el estudio
const tarjetas = [...html.matchAll(
  /<div class="tarj[^"]*"><span class="et">([^<]+)<\/span>\s*<span class="v">([^<]+)<\/span><span class="n">([^<]+)<\/span>/g,
)].slice(0, 4).map(([, et, v, n]) => ({ et, v, n }))
if (tarjetas.length !== 4) throw new Error(`esperaba 4 tarjetas del veredicto y hay ${tarjetas.length}`)

// El titular y la entradilla de la portada del estudio, sin reescribirlos
const titular = /<header class="portada">[\s\S]*?<h1>([\s\S]*?)<\/h1>/.exec(html)?.[1]
const entradilla = /<p class="entradilla">([\s\S]*?)<\/p>/.exec(html)?.[1]?.replace(/\s+/g, ' ').trim()
if (!titular || !entradilla) throw new Error('no encuentro el titular o la entradilla de la portada')

const datos = {
  titular, entradilla,
  generado: new Date().toISOString(),
  fuente: 'Extraído de ../index.html por scripts/extraer-datos.mjs',
  serie: constante('SERIE'),
  idxGolfo: constante('IDX_G'),
  idxEspana: constante('IDX_E'),
  meses: constante('MES'),
  gasto: constante('MERCADOS_GASTO').map(([mercado, yen, destacado]) => ({ mercado, yen, destacado })),
  rutas: constante('RUTAS').map(([compania, origen, destino, frecuencia, puerta, estado, lat, lon]) =>
    ({ compania, origen, destino, frecuencia, puerta, estado, lat, lon })),
  puertas: constante('PUERTAS'),
  halal: constante('HALAL'),
  calendario: cal,
  tarjetas,
}

const suma = a => a.reduce((s, v) => s + (v ?? 0), 0)
const total2025 = suma(datos.serie[2025])
// comprobación cruzada: la suma de la serie tiene que dar la cifra de la portada del estudio
if (!tarjetas[0].v.replace(/\./g, '').includes(String(total2025)))
  throw new Error(`la serie de 2025 suma ${total2025} y la tarjeta dice ${tarjetas[0].v}`)

writeFileSync(join(aqui, '../src/datos.json'), JSON.stringify(datos, null, 1))
console.log(`datos.json: ${datos.rutas.length} rutas, ${datos.gasto.length} mercados, ` +
  `${cal.length} fechas del calendario, 2025 = ${total2025} llegadas`)
