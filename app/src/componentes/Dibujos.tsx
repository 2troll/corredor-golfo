// Dibujos de línea del viaje, en una caja de 200 × 200. Cada trazo es un <path>
// suelto para que DrawSVG pueda dibujarlos uno detrás de otro, como a pluma.
// Los que se repiten (torii, olas, celosía de la torre) se generan con código.

/** Un torii visto de frente: kasagi curvado, nuki recto y dos pilares. */
function torii(cx: number, base: number, alto: number, ancho: number): string[] {
  const x1 = cx - ancho / 2, x2 = cx + ancho / 2, top = base - alto
  const vuelo = ancho * 0.12
  return [
    `M${x1 - vuelo} ${top + alto * 0.02} Q${cx} ${top - alto * 0.1} ${x2 + vuelo} ${top + alto * 0.02}`,
    `M${x1 - vuelo * 0.4} ${top + alto * 0.1} H${x2 + vuelo * 0.4}`,
    `M${x1 - vuelo * 0.2} ${top + alto * 0.26} H${x2 + vuelo * 0.2}`,
    `M${x1 + ancho * 0.12} ${top + alto * 0.06} V${base}`,
    `M${x2 - ancho * 0.12} ${top + alto * 0.06} V${base}`,
    `M${cx} ${top + alto * 0.1} V${top + alto * 0.26}`,
  ]
}

/** Olas suaves de lado a lado, a la altura `y`. */
const olas = (y: number, x0 = 20, x1 = 180, paso = 20): string =>
  `M${x0} ${y} ` + Array.from({ length: Math.round((x1 - x0) / paso) }, () => `q${paso / 4} -3 ${paso / 2} 0 t${paso / 2} 0`).join(' ')

/** La celosía de la torre de Kobe: hiperboloide de líneas cruzadas. */
function celosia(): string[] {
  const out: string[] = []
  const borde = (t: number, lado: number) => { // t de 0 (arriba) a 1 (abajo): cintura en el tercio superior
    const y = 52 + t * 108, cintura = 4 + 10 * Math.pow(Math.abs(t - 0.32) / 0.68, 1.6) + (t < 0.32 ? (0.32 - t) * 22 : 0)
    return [124 + lado * cintura, y] as const
  }
  out.push(`M${Array.from({ length: 21 }, (_, i) => borde(i / 20, -1).join(' ')).join(' L')}`)
  out.push(`M${Array.from({ length: 21 }, (_, i) => borde(i / 20, 1).join(' ')).join(' L')}`)
  for (let i = 0; i < 6; i++) {
    const a = i / 6, b = (i + 1) / 6
    const [xa, ya] = borde(a, -1), [xb, yb] = borde(b, 1), [xc, yc] = borde(a, 1), [xd, yd] = borde(b, -1)
    out.push(`M${xa} ${ya} L${xb} ${yb}`, `M${xc} ${yc} L${xd} ${yd}`)
  }
  return out
}

export const DIBUJOS: Record<string, string[]> = {
  dubai: [
    'M18 150 H182',
    'M92 150 V96 H95 V72 H97 V52 H99 V30 L100 12 L101 30 V52 H103 V72 H105 V96 H108 V150',
    'M58 150 V106 H71 V150', 'M74 150 V93 L80 86 L86 93 V150', 'M116 150 V100 H127 V150',
    'M131 150 V112 Q137 104 143 112 V150',
    'M150 150 Q151 104 172 92 L172 150', 'M156 150 Q158 116 172 106',
    olas(162), olas(172, 40, 160),
    'M72 180 H112 L105 188 H79 Z', 'M91 180 V156 L108 176', 'M91 160 L80 176',
  ],
  kix: [
    olas(150), olas(162, 30, 170), olas(174, 44, 156),
    'M52 140 H148 L156 146 H44 Z',
    'M20 146 L44 146', 'M156 146 L182 136',
    'M30 110 Q100 30 170 62',
    'M122 74 L150 60 L154 63 L132 76 L140 88 L136 90 L124 80 L110 86 L108 84 Z',
  ],
  osaka: [
    'M52 160 L64 128 H136 L148 160 Z', 'M58 146 H142', 'M60 138 H140',
    'M70 128 V112 H130 V128', 'M60 112 Q100 100 140 112',
    'M76 112 V98 H124 V112', 'M66 98 Q100 86 134 98', 'M92 98 L100 90 L108 98',
    'M84 98 V84 H116 V98', 'M74 84 Q100 72 126 84',
    'M90 84 V72 H110 V84', 'M80 72 Q100 56 120 72', 'M95 61 L100 55 L105 61',
    'M96 112 V104 H104 V112',
    olas(170, 24, 176), olas(180, 44, 156),
  ],
  kioto: [
    ...torii(100, 170, 120, 124),
    ...torii(100, 150, 78, 80),
    ...torii(100, 138, 52, 52),
    ...torii(100, 131, 34, 34),
    'M28 172 L86 131', 'M172 172 L114 131', 'M20 172 H180',
  ],
  nara: [
    'M40 162 H172',
    'M62 118 Q64 100 92 100 Q122 98 134 106 Q140 112 136 124 Q120 130 92 128 Q70 128 62 118 Z',
    'M128 104 L138 80', 'M136 112 L148 84',
    'M136 80 Q140 70 150 71 L164 77 Q160 84 148 84',
    'M146 72 L139 63 L149 68',
    'M150 71 L147 52 M147 60 L139 52 M147 56 L153 46',
    'M155 73 L160 56 M159 62 L167 55',
    'M74 126 L71 160', 'M84 128 L87 160', 'M120 127 L117 160', 'M131 122 L135 160',
    'M62 112 L55 107',
  ],
  kobe: [
    'M34 150 V114 L36 106 L38 114 V150', 'M66 150 V114 L68 106 L70 114 V150',
    'M42 150 V132 Q52 112 62 132 V150', 'M52 118 V112',
    'M104 52 H144 V45 H104 Z', 'M124 45 V28',
    ...celosia(),
    'M20 160 H182', olas(170, 24, 176), olas(180, 44, 160),
  ],
}

/** Rótulo trilingüe de cada parada: español, japonés y árabe. */
export const NOMBRES: Record<string, [string, string, string]> = {
  dubai: ['Dubái', 'ドバイ', 'دبي'],
  kix: ['Kansai (KIX)', '関西国際空港', 'مطار كانساي'],
  osaka: ['Osaka', '大阪', 'أوساكا'],
  kioto: ['Kioto', '京都', 'كيوتو'],
  nara: ['Nara', '奈良', 'نارا'],
  kobe: ['Kobe', '神戸', 'كوبي'],
}

/** Fotos reales de cada parada (Wikimedia Commons, 3.840 px). En el medallón va la versión
 *  de 900 px; la de 4K sólo se descarga si el lector la abre a pantalla completa. */
// encuadre: alineación de preserveAspectRatio (el <image> de SVG no tiene object-position)
export const FOTOS: Record<string, { autor: string; licencia: string; url: string; encuadre: string }> = {
  dubai: { autor: "imran shahabuddin", licencia: "CC BY 2.0", url: "https://commons.wikimedia.org/wiki/File:Burj_Khalifa_(worlds_tallest_building)_and_the_Dubai_skyline_(25781049892).jpg", encuadre: 'xMidYMid' },
  kix: { autor: "国土地理院", licencia: "Attribution", url: "https://commons.wikimedia.org/wiki/File:Kansai_International_Airport_Aerial_photograph.2007.jpg", encuadre: 'xMidYMid' },
  osaka: { autor: "Dick Thomas Johnson", licencia: "CC BY 2.0", url: "https://commons.wikimedia.org/wiki/File:Osaka_Castle_2022-04-23.jpg", encuadre: 'xMaxYMid' },
  kioto: { autor: "Basile Morin", licencia: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Double_torii_path_at_Fushimi_Inari_Taisha_Shrine,_Kyoto,_Japan.jpg", encuadre: 'xMidYMid' },
  nara: { autor: "Marek Ślusarczyk (Tupungato)", licencia: "CC BY 3.0", url: "https://commons.wikimedia.org/wiki/File:003_Nara_deer_in_Japan_-_deer_of_Nara_Park_under_autumn_leaves.jpg", encuadre: 'xMidYMax' },
  kobe: { autor: "Martin Falbisoner", licencia: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Kobe_Port_Tower_and_Maritime_Museum,_November_2016.jpg", encuadre: 'xMinYMid' },
}
const IMG = import.meta.env.BASE_URL + '../img/viaje/'
export const foto = (clave: string, grande = false): string => `${IMG}${clave}${grande ? '' : '-900'}.jpg`

/** El medallón: círculo, anillo con el nombre en tres alfabetos, el dibujo a pluma y, al
 *  terminar de dibujarse, la foto real que aparece debajo del boceto. */
export function Medallon({ clave, id }: { clave: string; id: string }) {
  const [es, ja, ar] = NOMBRES[clave]
  const texto = `${es.toUpperCase()} · ${ja} · ${ar} · `
  return (
    <svg className="medallon" viewBox="-20 -20 240 240" aria-hidden="true">
      <defs>
        <path id={`anillo-${id}`} d="M100 100 m-104 0 a104 104 0 1 1 208 0 a104 104 0 1 1 -208 0" />
        <clipPath id={`recorte-${id}`}><circle cx="100" cy="100" r="89" /></clipPath>
      </defs>
      <circle className="aro" cx="100" cy="100" r="96" />
      <circle className="aro fino" cx="100" cy="100" r="90" />
      <g className="giro"><text className="anillo"><textPath href={`#anillo-${id}`}>{texto.repeat(3)}</textPath></text></g>
      <circle className="sol" cx="100" cy="92" r="46" />
      <image className="foto" href={foto(clave)} x="11" y="11" width="178" height="178" clipPath={`url(#recorte-${id})`}
        preserveAspectRatio={`${FOTOS[clave].encuadre} slice`} />
      <g className="trazos">{DIBUJOS[clave].map((d, i) => <path key={i} d={d} />)}</g>
    </svg>
  )
}
