// Día y noche con el sol de este momento, relieve por diferencias finitas sobre
// el mapa de alturas, reflejo especular sólo sobre el agua, luces de ciudad en
// la cara oscura y una franja cálida en el crepúsculo.
uniform sampler2D uDia, uNoche, uAgua, uRelieve;
uniform vec3 uSol;      // dirección del sol, espacio del mundo
uniform vec3 uArriba;   // eje norte del globo, espacio del mundo
uniform float uOp;
varying vec2 vUv;
varying vec3 vN;
varying vec3 vP;

void main() {
  vec3 n = normalize(vN);
  vec3 v = normalize(cameraPosition - vP);

  // relieve: gradiente del mapa de alturas en el marco este/norte de cada punto
  vec3 este = normalize(cross(uArriba, n));
  vec3 norte = cross(n, este);
  vec2 px = vec2(1.0 / 2048.0, 1.0 / 1024.0);
  float h = texture2D(uRelieve, vUv).r;
  float hx = texture2D(uRelieve, vUv + vec2(px.x, 0.0)).r - h;
  float hy = texture2D(uRelieve, vUv + vec2(0.0, px.y)).r - h;
  vec3 nr = normalize(n - 2.2 * (hx * este + hy * norte));

  float d = dot(nr, uSol);
  float luz = smoothstep(-0.14, 0.22, dot(n, uSol));
  float mar = texture2D(uAgua, vUv).r;

  vec3 dia = texture2D(uDia, vUv).rgb;
  dia *= 0.02 + 1.2 * smoothstep(0.0, 0.65, d);
  // el mar un punto más profundo y el reflejo del sol sólo sobre él
  dia = mix(dia, dia * vec3(0.78, 0.9, 1.08), mar * 0.6);
  vec3 r = reflect(-uSol, n);
  float brillo = pow(max(dot(r, v), 0.0), 60.0) * mar;

  vec3 tn = texture2D(uNoche, vUv).rgb;
  vec3 noche = tn * 0.18 + pow(tn, vec3(2.3)) * vec3(3.0, 2.3, 1.35);

  vec3 c = mix(noche, dia, luz);
  c += brillo * vec3(1.0, 0.92, 0.78) * 1.3 * luz;
  c += vec3(0.95, 0.42, 0.14) * exp(-pow(dot(n, uSol) * 14.0, 2.0)) * 0.03;
  // borde atmosférico: más azul de día, apenas un hilo de noche
  float borde = pow(1.0 - max(dot(n, v), 0.0), 3.2);
  c += borde * vec3(0.3, 0.58, 1.0) * (0.03 + 0.45 * luz);

  gl_FragColor = vec4(c, uOp);
  #include <colorspace_fragment>
}
