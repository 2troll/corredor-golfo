// Tubo de una ruta: uv.x recorre el trayecto de 0 (Golfo) a 1 (Japón).
varying float vS;
void main() {
  vS = uv.x;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
