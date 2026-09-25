// La Tierra: normal y posición en el espacio del mundo, para iluminar con el sol real.
varying vec2 vUv;
varying vec3 vN;
varying vec3 vP;
varying vec3 vO; // posición propia de la esfera: el patrón de disolución gira con ella
void main() {
  vUv = uv;
  vO = position;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vP = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
