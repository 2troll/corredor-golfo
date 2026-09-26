/* Movimiento editorial del estudio, con GSAP (ScrollTrigger y SplitText, gratuitos
 * desde la versión 3.13). Una sola idea por elemento, como en una revista impresa
 * que cobra vida:
 *  - los titulares suben línea a línea desde detrás de una máscara;
 *  - el número del apartado entra un instante antes que su titular;
 *  - cada lámina fotográfica se abre desde un recorte y la foto se acerca despacio
 *    mientras se baja (el zoom va atado al scroll, no al reloj).
 * Lenis suaviza el scroll de toda la página.
 * vida() sigue revelando los bloques y contando las cifras. Quien pide menos
 * movimiento en su sistema no recibe nada de esto. */
(function () {
  'use strict'
  if (typeof gsap === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  gsap.registerPlugin(ScrollTrigger, SplitText)

  // desplazamiento suave con Lenis, sincronizado con ScrollTrigger; los enlaces del índice
  // (#apartado) también se deslizan en vez de saltar
  if (typeof Lenis !== 'undefined') {
    const lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1, anchors: { offset: -16, duration: 1.2 } })
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add(t => lenis.raf(t * 1000))
    gsap.ticker.lagSmoothing(0)
  }

  const lineas = (el, disparo, retraso = 0) => {
    const sp = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'linea' })
    gsap.from(sp.lines, { yPercent: 105, duration: 1.15, ease: 'expo.out', stagger: 0.09, delay: retraso,
      scrollTrigger: disparo ? { trigger: disparo, start: 'top 84%', once: true } : undefined })
  }

  // espera a las fuentes: partir en líneas con la tipografía de reserva da cortes falsos
  document.fonts.ready.then(() => {
    const h1 = document.querySelector('.portada h1')
    if (h1) lineas(h1, null, 0.15)

    document.querySelectorAll('section > .env > header').forEach(h => {
      const num = h.querySelector('.clave'), tit = h.querySelector('h2')
      if (num) gsap.from(num, { y: 30, opacity: 0, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 86%', once: true } })
      if (tit) lineas(tit, h, 0.08)
    })

    document.querySelectorAll('.lamina').forEach(l => {
      const img = l.querySelector('img'), pie = l.querySelector('figcaption')
      gsap.fromTo(l, { clipPath: 'inset(9% 7% 9% 7%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ease: 'none',
        scrollTrigger: { trigger: l, start: 'top bottom', end: 'top 25%', scrub: true } })
      gsap.fromTo(img, { scale: 1.22 }, { scale: 1, ease: 'none',
        scrollTrigger: { trigger: l, start: 'top bottom', end: 'bottom top', scrub: true } })
      if (pie) gsap.from(pie, { y: 40, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: l, start: 'top 55%', once: true } })
    })
    ScrollTrigger.refresh()
  })
})()
