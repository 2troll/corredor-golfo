// Cada partícula es un punto de luz: un núcleo gaussiano nítido y un halo tenue.
// Las desenfocadas pierden el núcleo y reparten su luz, como un bokeh.
uniform float uOp;
varying vec3 vColor;
varying float vBrillo;
varying float vDesenfoque;
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float d2 = dot(q, q) * 4.0;          // 0 en el centro, 1 en el borde
  if (d2 > 1.0) discard;
  float nucleo = exp(-d2 * mix(14.0, 3.0, vDesenfoque));
  float halo = exp(-d2 * 2.5) * 0.22;
  float a = (nucleo + halo) * mix(1.0, 0.35, vDesenfoque);
  gl_FragColor = vec4(vColor * vBrillo * 1.5, a * uOp);
}
