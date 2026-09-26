// Degradado del verde del Golfo al oro de Japón, una estela que corre en el
// sentido del vuelo y un recorte (uDibujo) para que la ruta se trace con el scroll.
uniform float uT, uFase, uDibujo, uOp, uAnunciada;
uniform vec3 uA, uB;
varying float vS;
void main() {
  if (vS > uDibujo) discard;
  vec3 c = mix(uA, uB, smoothstep(0.0, 1.0, vS));
  if (uAnunciada > 0.5) {
    // lo anunciado va punteado: todavía no vuela
    if (fract(vS * 34.0) > 0.5) discard;
    gl_FragColor = vec4(c * 1.0, 0.5 * uOp);
    return;
  }
  float cabeza = fract(uT * 0.07 + uFase);
  float d = cabeza - vS; if (d < 0.0) d += 1.0;
  float estela = exp(-d * 6.0) * (1.0 - step(0.5, d)) * 0.5;
  // la punta del trazo, al dibujarse, brilla un momento
  float punta = exp(-abs(uDibujo - vS) * 60.0) * step(uDibujo, 0.999);
  // arco fino y sereno: el movimiento lo ponen los aviones y sus estelas, no rayas sobre la línea
  gl_FragColor = vec4(c * (0.9 + 0.5 * estela + 2.0 * punta), (0.55 + 0.25 * estela + 0.4 * punta) * uOp);
}
