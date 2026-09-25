// Cada partícula es un punto de luz redondo con el centro más brillante.
uniform float uOp;
varying vec3 vColor;
varying float vBrillo;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d);
  a *= a;
  gl_FragColor = vec4(vColor * vBrillo * 1.6, a * uOp);
}
