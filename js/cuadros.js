/* Cuadros interactivos del estudio con Apache ECharts (licencia Apache 2.0).
 *
 * Tres vistas que las tablas no dejan ver de un golpe:
 *  - #e-composicion: anillo del mercado arabófono, CCG por dentro y países por fuera;
 *  - #e-corredor: diagrama de Sankey origen → aerolínea → puerta de Japón, con el
 *    grosor en vuelos por semana y lo anunciado aparte;
 *  - #e-estacion: el año en polar, Golfo contra España, para ver que se turnan.
 *
 * ECharts (1 MB) sólo se descarga cuando el lector se acerca al primer cuadro. Los
 * colores salen de las variables CSS de la página y se repintan al cambiar de tema.
 * Los datos de ruta y estacionalidad son las constantes del propio estudio (RUTAS,
 * IDX_G, IDX_E, MES); la composición es la tabla del apartado 03. */
(function () {
  'use strict'
  const CDN = 'https://cdn.jsdelivr.net/npm/echarts@5.5.1/dist/echarts.min.js'
  const cajas = [...document.querySelectorAll('.ech')]
  if (!cajas.length) return

  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim()
  const paleta = () => ({
    tinta: css('--tinta'), tinta2: css('--tinta2'), tinta3: css('--tinta3'), linea: css('--linea'),
    marea: css('--marea'), duna: css('--duna'), coral: css('--coral'), sup: css('--sup'),
    mono: css('--mono') || 'monospace', cuerpo: css('--cuerpo') || 'sans-serif',
  })
  const fmt = v => v.toLocaleString('es-ES').replace(/^(\d)(\d{3})$/, '$1.$2')
  const baja = matchMedia('(prefers-reduced-motion: reduce)').matches

  // ── composición del mercado arabófono (tabla del apartado 03) ──────────────
  const CCG = [['Arabia Saudí', 22408], ['Emiratos', 15183], ['Kuwait', 5901], ['Catar', 4902], ['Baréin · Omán', 3810]]
  const ARABOFONO = 76456, EGIPTO = 7229
  const opcComposicion = p => {
    const ccg = CCG.reduce((s, [, v]) => s + v, 0)
    const resto = ARABOFONO - ccg - EGIPTO
    return {
      animationDuration: baja ? 0 : 1400, animationEasing: 'cubicOut',
      tooltip: { trigger: 'item', backgroundColor: p.sup, borderColor: p.linea, textStyle: { color: p.tinta, fontFamily: p.cuerpo },
        formatter: d => `<b>${d.name}</b><br>${fmt(d.value)} entradas · ${(d.value / ARABOFONO * 100).toFixed(1).replace('.', ',')} % del arabófono` },
      series: [{
        type: 'sunburst', radius: ['18%', '92%'], sort: null, nodeClick: false,
        itemStyle: { borderColor: p.sup, borderWidth: 2 },
        label: { color: p.tinta, fontFamily: p.cuerpo, fontSize: 11, minAngle: 9 },
        emphasis: { focus: 'ancestor' },
        levels: [{}, { r0: '18%', r: '46%', label: { rotate: 0, fontWeight: 600 } }, { r0: '48%', r: '92%', label: { rotate: 'tangential' } }],
        data: [
          { name: 'CCG · seis países', value: ccg, itemStyle: { color: p.marea },
            children: CCG.map(([n, v], i) => ({ name: n, value: v, itemStyle: { color: p.marea, opacity: 1 - i * 0.13 } })) },
          { name: 'Resto arabófono', value: ARABOFONO - ccg, itemStyle: { color: p.duna },
            children: [{ name: 'Egipto', value: EGIPTO, itemStyle: { color: p.duna } },
              { name: 'Otros árabes', value: resto, itemStyle: { color: p.duna, opacity: 0.6 } }] },
        ],
      }],
      graphic: [{ type: 'text', left: 'center', top: 'middle', style: { text: `+${Math.round((ARABOFONO / ccg - 1) * 100)} %`,
        fill: p.duna, font: `600 22px ${p.cuerpo}`, textAlign: 'center' } }],
    }
  }

  // ── Sankey del corredor ─────────────────────────────────────────────────────
  const opcCorredor = p => {
    const rutas = (typeof RUTAS !== 'undefined' ? RUTAS : []).filter(r => r[3] > 0)
    const nodos = new Map(), enlaces = new Map()
    const nodo = (n, c) => { if (!nodos.has(n)) nodos.set(n, { name: n, itemStyle: { color: c } }) }
    const enlace = (a, b, v, anunciada) => {
      const k = a + '→' + b + (anunciada ? '*' : '')
      const e = enlaces.get(k) || { source: a, target: b, value: 0, anunciada }
      e.value += v; enlaces.set(k, e)
    }
    rutas.forEach(([cia, origen, destino, frec, puerta, estado]) => {
      const o = origen.replace(/\s*\(.*/, ''), d = puerta === 'KIX' ? 'Kansai (KIX)' : 'Tokio (NRT · HND)'
      const anunciada = estado === 'anunciada'
      nodo(o, p.marea); nodo(cia, p.tinta2); nodo(d, puerta === 'KIX' ? p.duna : p.tinta3)
      enlace(o, cia, frec, anunciada); enlace(cia, d, frec, anunciada)
    })
    return {
      animationDuration: baja ? 0 : 1600,
      tooltip: { trigger: 'item', backgroundColor: p.sup, borderColor: p.linea, textStyle: { color: p.tinta, fontFamily: p.cuerpo },
        formatter: d => d.dataType === 'edge' ? `${d.data.source} → ${d.data.target}<br><b>${d.data.value}</b> vuelos por semana${d.data.anunciada ? ' · anunciado' : ''}` : `<b>${d.name}</b>` },
      series: [{
        type: 'sankey', left: 8, right: 120, top: 12, bottom: 12, nodeWidth: 12, nodeGap: 14, draggable: false,
        emphasis: { focus: 'adjacency' },
        label: { color: p.tinta, fontFamily: p.cuerpo, fontSize: 12 },
        lineStyle: { color: 'gradient', curveness: 0.5, opacity: 0.35 },
        data: [...nodos.values()],
        links: [...enlaces.values()].map(e => e.anunciada
          ? { ...e, lineStyle: { color: p.duna, opacity: 0.28, type: 'dashed' } } : e),
      }],
    }
  }

  // ── estacionalidad en polar ─────────────────────────────────────────────────
  const opcEstacion = p => {
    const g = typeof IDX_G !== 'undefined' ? IDX_G : [], e = typeof IDX_E !== 'undefined' ? IDX_E : []
    const meses = typeof MES !== 'undefined' ? MES : []
    return {
      animationDuration: baja ? 0 : 1500, animationEasing: 'elasticOut',
      legend: { bottom: 0, textStyle: { color: p.tinta2, fontFamily: p.cuerpo }, itemWidth: 12, itemHeight: 8 },
      tooltip: { trigger: 'axis', backgroundColor: p.sup, borderColor: p.linea, textStyle: { color: p.tinta, fontFamily: p.cuerpo } },
      angleAxis: { type: 'category', data: meses, startAngle: 90, axisLine: { lineStyle: { color: p.linea } },
        axisLabel: { color: p.tinta2, fontFamily: p.mono, fontSize: 11 } },
      radiusAxis: { max: 180, interval: 50, axisLabel: { color: p.tinta3, fontSize: 10 }, splitLine: { lineStyle: { color: p.linea, type: 'dashed' } }, axisLine: { show: false } },
      polar: { radius: ['8%', '78%'], center: ['50%', '47%'] },
      series: [
        { type: 'bar', name: 'Golfo', coordinateSystem: 'polar', data: g, itemStyle: { color: p.marea, borderRadius: 3 }, barGap: '-100%', z: 3 },
        { type: 'bar', name: 'España', coordinateSystem: 'polar', data: e, itemStyle: { color: p.duna, opacity: 0.45, borderRadius: 3 }, z: 2 },
      ],
    }
  }

  const OPCIONES = { 'e-composicion': opcComposicion, 'e-corredor': opcCorredor, 'e-estacion': opcEstacion }
  const vivos = []

  function pinta() {
    const p = paleta()
    vivos.forEach(({ caja, graf }) => graf.setOption(OPCIONES[caja.id](p), true))
  }

  function arranca() {
    cajas.forEach(caja => {
      const lienzo = caja.querySelector('.lienzo-e')
      const graf = echarts.init(lienzo, null, { renderer: 'canvas' })
      vivos.push({ caja, graf })
      // cada cuadro se anima al entrar en pantalla, no al cargar
      const io = new IntersectionObserver(es => { if (!es[0].isIntersecting) return; io.disconnect()
        graf.setOption(OPCIONES[caja.id](paleta()), true) }, { rootMargin: '0px 0px -15% 0px' })
      io.observe(caja)
    })
    addEventListener('resize', () => vivos.forEach(v => v.graf.resize()))
    // el tema se cambia con data-theme en <html>, o con el del sistema
    new MutationObserver(pinta).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', pinta)
  }

  // descarga perezosa: ECharts llega cuando el primer cuadro está a una pantalla de distancia
  const cerca = new IntersectionObserver(es => {
    if (!es.some(e => e.isIntersecting)) return
    cerca.disconnect()
    const s = document.createElement('script'); s.src = CDN; s.async = true
    s.onload = arranca
    s.onerror = () => cajas.forEach(c => { c.querySelector('.lienzo-e').textContent = 'No se pudo cargar el cuadro interactivo; la tabla de al lado tiene las mismas cifras.' })
    document.head.appendChild(s)
  }, { rootMargin: '900px 0px' })
  cajas.forEach(c => cerca.observe(c))
})()
