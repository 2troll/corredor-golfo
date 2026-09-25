// Geometría de la esfera compartida por el globo y las partículas.
import * as THREE from 'three'

export const R = 1.5

/** Latitud/longitud a un punto de la esfera, con la misma convención que la textura. */
export function aPos(la: number, lo: number, r = 1): THREE.Vector3 {
  const f = ((90 - la) * Math.PI) / 180
  const t = ((lo + 180) * Math.PI) / 180
  return new THREE.Vector3(-r * Math.sin(f) * Math.cos(t), r * Math.cos(f), r * Math.sin(f) * Math.sin(t))
}

/** Cuaternión que pone (la, lo) de cara a la cámara con el norte arriba. */
export function deCara(la: number, lo: number): THREE.Quaternion {
  const c = aPos(la, lo).normalize()
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.atan2(c.x, c.z))
  return q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.atan2(c.y, Math.hypot(c.x, c.z))))
}

export const Q_GOLFO = deCara(24, 50)
export const Q_CORREDOR = deCara(30, 95)
export const Q_JAPON = deCara(34, 132)

/** Arco de círculo máximo entre dos puntos, elevado sobre la superficie. */
export function arco(a: THREE.Vector3, b: THREE.Vector3, alto: number, pasos = 128): THREE.Vector3[] {
  const u = a.clone().normalize(), w = b.clone().normalize(), ang = u.angleTo(w)
  return Array.from({ length: pasos + 1 }, (_, k) => {
    const t = k / pasos
    return u.clone().multiplyScalar(Math.sin((1 - t) * ang) / Math.sin(ang))
      .add(w.clone().multiplyScalar(Math.sin(t * ang) / Math.sin(ang)))
      .multiplyScalar(R * (1.004 + alto * Math.sin(Math.PI * t)))
  })
}

export const PALETA = {
  verde: new THREE.Color('#4fd6b6'),
  oro: new THREE.Color('#e9b872'),
  coral: new THREE.Color('#ef7a5f'),
  pizarra: new THREE.Color('#5a7580'),
  hielo: new THREE.Color('#9fd8ff'),
}
