// Halo de atmósfera: fresnel sobre la cara trasera, aditivo.
uniform float uOp;
varying vec3 vNv;
void main() {
  float i = pow(max(0.6 - dot(vNv, vec3(0.0, 0.0, 1.0)), 0.0), 3.6);
  gl_FragColor = vec4(vec3(0.3, 0.56, 1.0) * i * 0.6 * uOp, 1.0);
}
