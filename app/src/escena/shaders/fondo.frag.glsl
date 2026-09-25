// El cielo de cada capítulo: un degradado radial entre dos colores que la escena
// va cambiando con el scroll, una bruma lenta de ruido fractal y un poco de grano
// para que el degradado no haga escalones en pantallas de 8 bits.
uniform vec3 uCentro, uBorde, uBruma;
uniform float uTiempo, uAspecto;
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float ruido(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int k = 0; k < 5; k++) { v += a * ruido(p); p = p * 2.03 + 11.7; a *= 0.5; }
  return v;
}

void main() {
  vec2 q = (vUv - vec2(0.62, 0.5)) * vec2(uAspecto, 1.0);
  float r = length(q);
  vec3 c = mix(uCentro, uBorde, smoothstep(0.0, 1.05, r));
  // bruma: dos capas de ruido que se deslizan en sentidos opuestos
  float b = fbm(q * 1.6 + vec2(uTiempo * 0.012, -uTiempo * 0.008));
  b *= fbm(q * 3.1 - vec2(uTiempo * 0.02, 0.0) + b);
  c += uBruma * smoothstep(0.18, 0.55, b) * (1.0 - smoothstep(0.2, 1.1, r)) * 0.55;
  c += (hash(vUv * 913.0 + fract(uTiempo)) - 0.5) / 255.0 * 2.0;
  gl_FragColor = vec4(c, 1.0);
}
