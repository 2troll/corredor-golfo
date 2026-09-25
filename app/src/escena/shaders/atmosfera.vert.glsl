// Normal en el espacio de la vista: el halo depende del ángulo con la cámara.
varying vec3 vNv;
void main() {
  vNv = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
