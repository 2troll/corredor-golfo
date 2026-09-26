/* Movimiento de la página del estudio con GSAP (ScrollTrigger y ScrambleText, gratuitos
 * desde la versión 3.13). Complementa a vida(), que ya revela los bloques y cuenta las
 * cifras: aquí los títulos de cada apartado se descifran al entrar, como un panel de
 * salidas de aeropuerto, (Las figuras no se tocan: vida() ya
 * las anima con transform y dos animaciones sobre la misma propiedad se pisarían.) Quien pide menos
 * movimiento en su sistema no recibe nada de esto. */
(function () {
  'use strict'
  if (typeof gsap === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin)

  document.querySelectorAll('section > .env > header').forEach(h => {
    const num = h.querySelector('.clave'), tit = h.querySelector('h2')
    if (!tit) return
    const texto = tit.textContent
    ScrollTrigger.create({
      trigger: h, start: 'top 82%', once: true,
      onEnter: () => {
        if (num) gsap.fromTo(num, { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(3)' })
        gsap.to(tit, { duration: Math.min(1.6, 0.5 + texto.length * 0.018), ease: 'none',
          scrambleText: { text: texto, chars: 'ابتثجحخدذرسشصضطظعغفقكلمنهوي0123456789', revealDelay: 0.15, speed: 0.7 } })
      },
    })
  })

})()
