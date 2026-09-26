// Los objetos sólidos en los que se materializan las partículas: un avión de largo
// radio, la Luna (textura de NASA, creciente por la luz real de un lado) con doce
// cuentas en órbita, y dos pilas de monedas de metal. Se construyen con geometría
// de three.js, sin modelos externos, y las partículas se muestrean de su propia
// superficie: cuando el enjambre llega, cada punto cae exactamente sobre el objeto.
//
// Aparecen y se van con una disolución por ruido (uDis) y un borde que brilla, la
// misma idea que el globo, inyectada en los materiales físicos de three.js.
import * as THREE from 'three'
import { MeshSurfaceSampler } from 'three/examples/jsm/math/MeshSurfaceSampler.js'
import { datos } from '../tipos'

export type Punto = [number, number, number, THREE.Color]

/** Dirección del sol de la Luna en su propio espacio: detrás y a la derecha, creciente a la derecha. */
const SOL_LUNA = [0.62, 0.18, -0.76]

/** Añade a un material estándar la disolución por ruido con borde luminoso. */
function disolvible<T extends THREE.Material>(mat: T, uDis: { value: number }, fase = false): T {
  mat.transparent = false
  mat.onBeforeCompile = sh => {
    sh.uniforms.uDis = uDis
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPosObj;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vPosObj = (instanceMatrix * vec4(position, 1.0)).xyz;
        #else
          vPosObj = position;
        #endif`)
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uDis;
        varying vec3 vPosObj;
        float hashD(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float ruidoD(vec3 p) {
          vec3 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(hashD(i), hashD(i + vec3(1,0,0)), u.x), mix(hashD(i + vec3(0,1,0)), hashD(i + vec3(1,1,0)), u.x), u.y),
                     mix(mix(hashD(i + vec3(0,0,1)), hashD(i + vec3(1,0,1)), u.x), mix(hashD(i + vec3(0,1,1)), hashD(i + vec3(1,1,1)), u.x), u.y), u.z);
        }`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        float nD = 0.6 * ruidoD(vPosObj * 5.0) + 0.4 * ruidoD(vPosObj * 17.0);
        float frenteD = nD - uDis;
        if (frenteD < 0.0) discard;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(0.31, 0.84, 0.71) * (1.0 - smoothstep(0.0, 0.06, frenteD)) * step(0.001, uDis) * 4.0;`)
    // la fase de la Luna: el sol está fijo en el espacio del objeto, así el creciente coincide
    // con el de las partículas; la cara oscura conserva un 7 % (la luz cenicienta de la Tierra)
    if (fase) sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `
        float luzL = smoothstep(-0.06, 0.28, dot(normalize(vPosObj), normalize(vec3(${SOL_LUNA.join(', ')}))));
        outgoingLight *= mix(0.07, 1.0, luzL);
        outgoingLight += vec3(0.31, 0.84, 0.71) * (1.0 - smoothstep(0.0, 0.06, frenteD)) * step(0.001, uDis) * 4.0;
        #include <opaque_fragment>`)
  }
  return mat
}

/** Textura de la librea: blanco, línea verde bajo las ventanillas y la cola dorada. */
function librea(): THREE.CanvasTexture {
  const W = 1024, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H
  const g = c.getContext('2d')!
  g.fillStyle = '#f2f4f3'; g.fillRect(0, 0, W, H)
  // u = alrededor del fuselaje, v = a lo largo (0 cola, 1 morro); tras girar el torno, los costados
  // quedan en u = 0 (que también es 1) y u = 0,5
  for (const lado of [0, 0.5, 1]) {
    const x = lado * W
    g.fillStyle = '#2aa88a'; g.fillRect(x - 10, H * 0.12, 20, H * 0.72)
    g.fillStyle = '#1b2a33'
    for (let y = H * 0.2; y < H * 0.82; y += 9) g.fillRect(x - 26, y, 7, 5)
    g.fillRect(x - 30, H * 0.1, 14, 14) // cabina (flipY: arriba del lienzo = morro)
  }
  g.fillStyle = '#d9a95a'; g.fillRect(0, H * 0.93, W, H * 0.07) // la cola, en oro
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8
  return t
}

function planta(puntos: [number, number][], grosor: number, bisel = 0.012): THREE.ExtrudeGeometry {
  const s = new THREE.Shape(); puntos.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y)))
  const g = new THREE.ExtrudeGeometry(s, { depth: grosor, bevelEnabled: true, bevelThickness: bisel, bevelSize: bisel, bevelSegments: 3, curveSegments: 8 })
  g.translate(0, 0, -grosor / 2)
  return g
}

/** Luz principal de estudio, dentro de cada objeto: se apaga con él (la Luna necesita su lado oscuro). */
function luzClave(): THREE.Group {
  const g = new THREE.Group()
  const k = new THREE.DirectionalLight('#fff6ea', 2.2); k.position.set(-1.5, 2.5, 2.5)
  const r = new THREE.DirectionalLight('#9fd8ff', 1.1); r.position.set(2.5, 0.5, -2)
  g.add(k, r, new THREE.AmbientLight('#8aa0a6', 0.25))
  return g
}

function crearAvion(uDis: { value: number }): THREE.Group {
  const g = new THREE.Group(); g.name = 'avion'
  const pintura = disolvible(new THREE.MeshPhysicalMaterial({ map: librea(), roughness: 0.32, metalness: 0.15, clearcoat: 1, clearcoatRoughness: 0.08 }), uDis)
  const gris = disolvible(new THREE.MeshPhysicalMaterial({ color: '#c9d0d4', roughness: 0.4, metalness: 0.55, clearcoat: 0.6 }), uDis)
  const oro = disolvible(new THREE.MeshPhysicalMaterial({ color: '#d9a95a', roughness: 0.25, metalness: 0.75, clearcoat: 1 }), uDis)
  const metal = disolvible(new THREE.MeshStandardMaterial({ color: '#8d979d', roughness: 0.25, metalness: 1 }), uDis)
  const oscuro = disolvible(new THREE.MeshStandardMaterial({ color: '#0b1014', roughness: 0.6, metalness: 0.3 }), uDis)

  // fuselaje torneado: morro ojival, cuerpo recto y cono de cola que sube
  const perfil: THREE.Vector2[] = []
  for (let i = 0; i <= 60; i++) {
    const t = i / 60, y = -1.6 + t * 3.2 // a lo largo
    let r = 0.16
    if (t > 0.86) r = 0.16 * Math.sqrt(Math.max(0.0001, 1 - ((t - 0.86) / 0.14) ** 2)) // morro
    else if (t < 0.24) r = 0.16 * (0.18 + 0.82 * Math.sin((t / 0.24) * Math.PI / 2)) // cola
    perfil.push(new THREE.Vector2(r, y))
  }
  const cuerpo = new THREE.Mesh(new THREE.LatheGeometry(perfil, 64), pintura)
  cuerpo.rotation.z = -Math.PI / 2 // del eje y al eje x: el morro mira a +x
  g.add(cuerpo)

  // alas en flecha con diedro, estabilizadores y deriva dorada
  for (const s of [-1, 1]) {
    const ala = new THREE.Mesh(planta([[0.42, 0], [-0.3, 0], [-0.8, 1.7], [-0.52, 1.7]], 0.028), gris)
    ala.rotation.x = s * Math.PI / 2; ala.rotation.y = 0; ala.position.set(0, -0.05, 0)
    ala.rotateOnAxis(new THREE.Vector3(1, 0, 0), s * -0.07) // diedro
    g.add(ala)
    const est = new THREE.Mesh(planta([[-1.2, 0], [-1.5, 0], [-1.72, 0.62], [-1.58, 0.62]], 0.018), gris)
    est.rotation.x = s * Math.PI / 2; est.position.set(0, 0.07, 0)
    g.add(est)
    // motor: góndola torneada con toma oscura y tobera metálica
    const gond: THREE.Vector2[] = [[0.0, 0.0], [0.07, 0.02], [0.082, 0.1], [0.08, 0.38], [0.058, 0.5], [0.0, 0.52]].map(([r, y]) => new THREE.Vector2(r, y))
    const motor = new THREE.Mesh(new THREE.LatheGeometry(gond, 40), metal)
    motor.rotation.z = Math.PI / 2; motor.position.set(0.58, -0.17, 0.62 * s)
    g.add(motor)
    const toma = new THREE.Mesh(new THREE.CircleGeometry(0.066, 32), oscuro)
    toma.rotation.y = Math.PI / 2; toma.position.set(0.575, -0.17, 0.62 * s)
    g.add(toma)
    const pilon = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.09, 0.02), gris)
    pilon.position.set(0.3, -0.1, 0.62 * s); g.add(pilon)
  }
  g.add(luzClave())
  const deriva = new THREE.Mesh(planta([[-1.1, 0.1], [-1.52, 0.1], [-1.78, 0.8], [-1.56, 0.8]], 0.022), oro)
  g.add(deriva)
  return g
}

/** Moneda torneada con reborde: el canto y el anillo levantado se leen como metal acuñado. */
function geoMoneda(): THREE.LatheGeometry {
  const p = [[0, 0], [0.33, 0], [0.342, 0.006], [0.345, 0.026], [0.342, 0.046], [0.33, 0.052], [0.3, 0.052], [0.295, 0.045], [0, 0.043]]
  return new THREE.LatheGeometry(p.map(([r, y]) => new THREE.Vector2(r, y)), 72)
}

export const PILAS = { base: -0.8, paso: 0.06, altas: 26 }

function crearMonedas(uDis: { value: number }): THREE.Group {
  const g = new THREE.Group(); g.name = 'monedas'
  const me = datos.gasto.find(x => x.destacado)!, media = datos.gasto.find(x => x.mercado === 'Media general')!
  const bajas = Math.max(1, Math.round(PILAS.altas * media.yen / me.yen))
  const geo = geoMoneda()
  const oro = disolvible(new THREE.MeshPhysicalMaterial({ color: '#e3b45c', roughness: 0.3, metalness: 0.92, clearcoat: 0.5, emissive: '#6b4a14', emissiveIntensity: 0.35 }), uDis)
  const plata = disolvible(new THREE.MeshPhysicalMaterial({ color: '#dfe6ea', roughness: 0.28, metalness: 0.92, clearcoat: 0.5, emissive: '#3c4a52', emissiveIntensity: 0.35 }), uDis)
  const rnd = (() => { let s = 7; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296) })()
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p = new THREE.Vector3(), uno = new THREE.Vector3(1, 1, 1)
  const pila = (n: number, cx: number, mat: THREE.Material, sueltas: [number, number, number][]) => {
    const im = new THREE.InstancedMesh(geo, mat, n + sueltas.length)
    for (let i = 0; i < n; i++) {
      // pilas hechas a mano: cada moneda un poco desplazada y girada
      p.set(cx + (rnd() - 0.5) * 0.02, PILAS.base + i * PILAS.paso, (rnd() - 0.5) * 0.02)
      q.setFromEuler(e.set((rnd() - 0.5) * 0.02, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.02))
      im.setMatrixAt(i, m.compose(p, q, uno))
    }
    sueltas.forEach(([x, z, inclina], k) => {
      p.set(x, PILAS.base + 0.02, z); q.setFromEuler(e.set(inclina, rnd() * 6, 0))
      im.setMatrixAt(n + k, m.compose(p, q, uno))
    })
    g.add(im)
  }
  g.add(luzClave())
  pila(PILAS.altas, -0.5, oro, [[0.05, 0.6, 0.05], [-1.15, 0.45, 0.12]])
  pila(bajas, 0.5, plata, [[1.2, -0.25, 0.08]])
  return g
}

function crearLuna(uDis: { value: number }, mapa: THREE.Texture, relieve: THREE.Texture): THREE.Group {
  const g = new THREE.Group(); g.name = 'luna'
  mapa.colorSpace = THREE.SRGBColorSpace
  // material sin luces de escena: la iluminación la pone la fase; el relieve oscurece los mares
  const luna = new THREE.Mesh(new THREE.SphereGeometry(0.8, 96, 64),
    disolvible(new THREE.MeshBasicMaterial({ map: mapa, aoMap: relieve, aoMapIntensity: 0.6, color: '#f4efe6' }), uDis, true))
  luna.name = 'esfera'
  g.add(luna)
  // doce cuentas de vidrio en órbita, del tamaño de las llegadas del Golfo de cada mes
  const ram = new Set<number>()
  const r = datos.calendario.find(c => c.clave === 'ramadan')
  if (r) for (let d = new Date(r.inicio); d <= new Date(r.fin); d.setUTCDate(d.getUTCDate() + 1)) ram.add(d.getUTCMonth())
  datos.idxGolfo.forEach((v, mes) => {
    const a = (mes / 12) * Math.PI * 2 - Math.PI / 2
    const color = ram.has(mes) ? '#ef7a5f' : mes === 11 || mes === 3 ? '#4fd6b6' : '#9fd8ff'
    const cuenta = new THREE.Mesh(new THREE.SphereGeometry(0.05 + 0.13 * Math.cbrt(v / 180), 32, 24),
      disolvible(new THREE.MeshPhysicalMaterial({ color, emissive: color, emissiveIntensity: 0.35, roughness: 0.08, metalness: 0, clearcoat: 1 }), uDis))
    cuenta.position.set(Math.cos(a) * 1.55, 0, Math.sin(a) * 1.55)
    g.add(cuenta)
  })
  const orbita = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.004, 8, 180),
    disolvible(new THREE.MeshStandardMaterial({ color: '#5a7580', emissive: '#5a7580', emissiveIntensity: 0.6 }), uDis))
  orbita.rotation.x = Math.PI / 2
  g.add(orbita)
  return g
}

export interface Objetos { raiz: THREE.Group; formas: THREE.Group[]; dis: { value: number }[] }

export function crearObjetos(mapaLuna: THREE.Texture, relieveLuna: THREE.Texture): Objetos {
  const dis = [{ value: 1 }, { value: 1 }, { value: 1 }]
  const formas = [crearAvion(dis[0]), crearLuna(dis[1], mapaLuna, relieveLuna), crearMonedas(dis[2])]
  const raiz = new THREE.Group(); formas.forEach(f => raiz.add(f))
  return { raiz, formas, dis }
}

/** N puntos sobre la superficie de un objeto, repartidos por área y con el color de cada
 *  material. Para la Luna sólo se toma la cara iluminada: el enjambre dibuja el creciente. */
export function muestrear(obj: THREE.Group, n: number, rnd: () => number): Punto[] {
  obj.updateMatrixWorld(true)
  const piezas: { geo: THREE.BufferGeometry; mats: THREE.Matrix4[]; color: THREE.Color; area: number; esfera: boolean }[] = []
  obj.traverse(o => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    const mat = m.material as THREE.MeshStandardMaterial
    const color = mat.map ? new THREE.Color('#e8eef0') : mat.color.clone()
    const mats: THREE.Matrix4[] = []
    if ((m as THREE.InstancedMesh).isInstancedMesh) {
      const im = m as THREE.InstancedMesh, t = new THREE.Matrix4()
      for (let i = 0; i < im.count; i++) { im.getMatrixAt(i, t); mats.push(m.matrixWorld.clone().multiply(t)) }
    } else mats.push(m.matrixWorld.clone())
    const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry
    const pos = g.getAttribute('position'), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3()
    let area = 0
    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2)
      area += b.sub(a).cross(c.sub(a)).length() / 2
    }
    piezas.push({ geo: g, mats, color, area: area * mats.length, esfera: m.name === 'esfera' })
  })
  const total = piezas.reduce((s, p) => s + p.area, 0)
  const out: Punto[] = []
  const p = new THREE.Vector3(), nrm = new THREE.Vector3(), luz = new THREE.Vector3(...SOL_LUNA).normalize()
  for (const pz of piezas) {
    const sampler = new MeshSurfaceSampler(new THREE.Mesh(pz.geo))
    // determinista: la misma nube en cada visita (el método existe, los tipos de three aún no lo declaran)
    ;(sampler as unknown as { setRandomGenerator(f: () => number): void }).setRandomGenerator(rnd)
    sampler.build()
    const k = Math.round((pz.area / total) * n)
    for (let i = 0; i < k; i++) {
      sampler.sample(p, nrm)
      const mat = pz.mats[Math.floor(rnd() * pz.mats.length)]
      p.applyMatrix4(mat)
      if (pz.esfera && nrm.dot(luz) < 0.05) { i--; continue }
      out.push([p.x, p.y, p.z, pz.color])
    }
  }
  return out
}
