// Nubes reales: en la foto VIIRS de NASA la nube es blanca y neutra; el desierto
// es claro pero pardo, así que se exige a la vez claridad y poca saturación.
uniform sampler2D uNubes;
uniform vec3 uSol;
uniform float uReal, uOp;
varying vec2 vUv;
varying vec3 vN;
void main() {
  vec3 m = texture2D(uNubes, vUv).rgb;
  float mn = min(m.r, min(m.g, m.b));
  float sat = max(m.r, max(m.g, m.b)) - mn;
  float a = uReal > 0.5 ? smoothstep(0.42, 0.82, mn) * (1.0 - smoothstep(0.05, 0.15, sat)) : m.r;
  float luz = smoothstep(-0.14, 0.22, dot(normalize(vN), uSol));
  gl_FragColor = vec4(vec3(0.95) * (0.08 + 0.85 * luz), a * (0.1 + 0.58 * luz) * uOp);
}
