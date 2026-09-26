/* Cuadros interactivos del estudio con Apache ECharts (licencia Apache 2.0).
 *
 * Tres vistas que las tablas no dejan ver de un golpe:
 *  - #e-composicion: anillo del mercado arabófono, CCG por dentro y países por fuera;
 *  - #e-corredor: diagrama de Sankey origen → aerolínea → puerta de Japón, con el
 *    grosor en vuelos por semana y lo anunciado aparte;
 *  - #e-estacion: el año en polar, Golfo contra España, para ver que se turnan;
 *  - #e-calendario: los próximos doce meses, con Ramadán, Eid, fiestas nacionales y la
 *    ventana de entrada, y el día de hoy latiendo;
 *  - #e-escenarios: margen y honorarios de los tres escenarios, año 1 y año 2.
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

  // ── calendario de los próximos doce meses ───────────────────────────────────
  // Ramadán y los Eid con el algoritmo hiyrí del propio estudio (calendario()); las fiestas
  // nacionales y la ventana de entrada son las que cita el estudio.
  const iso = d => d.toISOString().slice(0, 10)
  const opcCalendario = p => {
    const hoy = new Date(); hoy.setUTCHours(0, 0, 0, 0)
    const fin = new Date(hoy); fin.setUTCFullYear(fin.getUTCFullYear() + 1); fin.setUTCDate(fin.getUTCDate() - 1)
    const dias = new Map()
    const marca = (d, c) => { const k = iso(d); if (d >= hoy && d <= fin && (!dias.has(k) || c > dias.get(k))) dias.set(k, c) }
    // 1 = ventana de entrada, 2 = fiesta nacional, 3 = Ramadán, 4 = Eid
    for (let d = new Date(Date.UTC(2026, 10, 1)); d <= new Date(Date.UTC(2027, 4, 31)); d.setUTCDate(d.getUTCDate() + 1)) marca(new Date(d), 1)
    for (const [m, dd] of [[11, 2], [11, 16], [11, 18]]) for (const y of [hoy.getUTCFullYear(), hoy.getUTCFullYear() + 1]) marca(new Date(Date.UTC(y, m, dd)), 2)
    if (typeof calendario === 'function') for (const y of [hoy.getUTCFullYear(), hoy.getUTCFullYear() + 1])
      for (const ev of calendario(y)) for (let d = new Date(ev.inicio); d <= ev.fin; d.setUTCDate(d.getUTCDate() + 1))
        marca(new Date(d), ev.clave === 'ramadan' ? 3 : 4)
    const NOMBRE = { 1: 'Ventana de entrada', 2: 'Fiesta nacional (EAU, Baréin, Catar)', 3: 'Ramadán', 4: 'Eid' }
    return {
      animationDuration: baja ? 0 : 900,
      tooltip: { backgroundColor: p.sup, borderColor: p.linea, textStyle: { color: p.tinta, fontFamily: p.cuerpo },
        formatter: d => `${new Date(d.value[0] + 'T00:00:00Z').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}<br><b>${NOMBRE[d.value[1]]}</b>` },
      visualMap: { type: 'piecewise', seriesIndex: 0, orient: 'horizontal', left: 'center', bottom: 0, itemWidth: 12, itemHeight: 10,
        textStyle: { color: p.tinta2, fontFamily: p.cuerpo, fontSize: 11 },
        pieces: [{ value: 1, label: 'Ventana de entrada', color: p.marea }, { value: 2, label: 'Fiesta nacional', color: p.tinta2 },
          { value: 3, label: 'Ramadán', color: p.coral }, { value: 4, label: 'Eid', color: p.duna }] },
      calendar: { range: [iso(hoy), iso(fin)], top: 34, left: 38, right: 12, cellSize: ['auto', 15], orient: 'horizontal',
        itemStyle: { color: 'transparent', borderColor: p.linea, borderWidth: 1 }, splitLine: { lineStyle: { color: p.tinta3, width: 1.4 } },
        dayLabel: { firstDay: 1, nameMap: ['D', 'L', 'M', 'X', 'J', 'V', 'S'], color: p.tinta3, fontSize: 10 },
        monthLabel: { nameMap: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'], color: p.tinta2, fontFamily: p.mono, fontSize: 11 },
        yearLabel: { show: false } },
      series: [
        { type: 'heatmap', coordinateSystem: 'calendar', data: [...dias.entries()] },
        // hoy, con un pulso
        { type: 'effectScatter', coordinateSystem: 'calendar', data: [[iso(hoy), 1]], symbolSize: 10,
          itemStyle: { color: p.tinta }, rippleEffect: { scale: 3, brushType: 'stroke' }, tooltip: { show: false }, z: 5 },
      ],
    }
  }

  // ── escenarios: lo que deja cada nivel de actividad (apartado 16) ─────────────
  const ESCENARIOS = [
    ['Conservador', [1037800, 1816200], [622700, 1089700], [4, 7]],
    ['Base', [3443900, 6122500], [2066300, 3673500], [9, 16]],
    ['Optimista', [7003900, 12256800], [4202300, 7354100], [16, 28]],
  ]
  const opcEscenarios = p => {
    const cats = ESCENARIOS.flatMap(([n]) => [`${n}\naño 1`, `${n}\naño 2`])
    const val = (i) => ESCENARIOS.flatMap(e => e[i])
    const yen = v => `${(v / 1e6).toLocaleString('es-ES', { maximumFractionDigits: 1 })} M¥`
    return {
      animationDuration: baja ? 0 : 1300, animationEasing: 'cubicOut',
      grid: { left: 58, right: 16, top: 30, bottom: 64 },
      legend: { bottom: 0, textStyle: { color: p.tinta2, fontFamily: p.cuerpo } },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, backgroundColor: p.sup, borderColor: p.linea, textStyle: { color: p.tinta, fontFamily: p.cuerpo },
        formatter: ps => `<b>${ps[0].axisValue.replace('\n', ' · ')}</b> · ${val(3)[ps[0].dataIndex]} viajes<br>` +
          ps.map(x => `${x.marker}${x.seriesName}: ${x.value.toLocaleString('es-ES')} ¥`).join('<br>') },
      xAxis: { type: 'category', data: cats, axisLabel: { color: p.tinta2, fontFamily: p.cuerpo, fontSize: 11, lineHeight: 15 },
        axisLine: { lineStyle: { color: p.linea } }, axisTick: { show: false } },
      yAxis: { type: 'value', axisLabel: { color: p.tinta3, formatter: yen }, splitLine: { lineStyle: { color: p.linea } } },
      series: [
        { name: 'Margen del operador', type: 'bar', stack: 'a', data: val(1), barWidth: '46%', itemStyle: { color: p.marea } },
        { name: 'Honorarios (supuesto)', type: 'bar', stack: 'a', data: val(2), itemStyle: { color: p.duna, borderRadius: [3, 3, 0, 0] },
          label: { show: true, position: 'top', color: p.tinta, fontFamily: p.mono, fontSize: 10,
            formatter: x => yen(val(1)[x.dataIndex] + x.value) } },
      ],
    }
  }

  const OPCIONES = { 'e-composicion': opcComposicion, 'e-corredor': opcCorredor, 'e-estacion': opcEstacion,
    'e-calendario': opcCalendario, 'e-escenarios': opcEscenarios }
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
