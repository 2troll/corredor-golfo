// Partículas que cambian de forma: 0 = la Tierra, 1 = llegadas mes a mes,
// 2 = reloj de estacionalidad, 3 = torres de gasto, y 4 = otra vez la Tierra.
// uEtapa es continua. Entre dos formas cada partícula sale con un retraso que
// avanza como una ola de izquierda a derecha, se deja llevar por un campo de
// ruido rotacional (curl noise: sin divergencia, así el enjambre se mueve como
// humo y no se aglomera) y se enciende mientras vuela, como si tuviera inercia.
attribute vec3 aP0, aP1, aP2, aP3;
attribute vec3 aC0, aC1, aC2, aC3;
attribute float aAzar;
uniform float uEtapa, uTiempo, uTam, uPR, uOp;
varying vec3 vColor;
varying float vBrillo;
varying float vDesenfoque;

// ruido simplex 3D (Ashima Arts / Stefan Gustavson, licencia MIT)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// potencial vectorial de ruido y su rotacional por diferencias finitas
vec3 potencial(vec3 p) { return vec3(snoise(p), snoise(p + vec3(31.4, 7.1, 2.9)), snoise(p + vec3(-5.3, 19.7, 41.2))); }
vec3 curl(vec3 p) {
  const float e = 0.08;
  vec3 dx = vec3(e, 0.0, 0.0), dy = vec3(0.0, e, 0.0), dz = vec3(0.0, 0.0, e);
  vec3 px0 = potencial(p - dx), px1 = potencial(p + dx);
  vec3 py0 = potencial(p - dy), py1 = potencial(p + dy);
  vec3 pz0 = potencial(p - dz), pz1 = potencial(p + dz);
  return vec3((py1.z - py0.z) - (pz1.y - pz0.y), (pz1.x - pz0.x) - (px1.z - px0.z), (px1.y - px0.y) - (py1.x - py0.x)) / (2.0 * e);
}

void main() {
  float e = clamp(uEtapa, 0.0, 4.0);
  vec3 a, b, ca, cb;
  if (e < 1.0)      { a = aP0; b = aP1; ca = aC0; cb = aC1; }
  else if (e < 2.0) { a = aP1; b = aP2; ca = aC1; cb = aC2; }
  else if (e < 3.0) { a = aP2; b = aP3; ca = aC2; cb = aC3; }
  else              { a = aP3; b = aP0; ca = aC3; cb = aC0; }
  float f = e >= 4.0 ? 1.0 : fract(e);

  // la ola: cada partícula sale según su x de partida y un poco de azar propio
  float ola = smoothstep(-2.2, 2.2, a.x);
  float retraso = ola * 0.34 + aAzar * 0.2;
  float t = clamp((f - retraso) / 0.46, 0.0, 1.0);
  float te = t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0; // cúbica de entrada y salida
  float vuelo = sin(3.14159265 * t);           // 0 en reposo, 1 a mitad de viaje
  float velocidad = 3.0 * t * (1.0 - t) * 2.0; // derivada aproximada de la cúbica, para el brillo

  vec3 p = mix(a, b, te);
  float lejos = length(b - a);
  // el enjambre sube un poco en arco y se deja arrastrar por el flujo
  p.y += vuelo * lejos * 0.22 * (aAzar - 0.35);
  // el enjambre se abre en el viaje: sin esto todas las rutas pasan por el centro y se forma una bola
  // el rotacional cuesta 18 muestras de ruido: sólo se paga mientras la partícula vuela
  if (vuelo > 0.001) p += curl(p * 0.6 + vec3(0.0, uTiempo * 0.07, aAzar * 2.0)) * 0.34 * vuelo * (0.5 + lejos * 0.3);
  // en reposo nada está quieto del todo: una deriva muy lenta y barata, como polvo en el aire
  p += 0.006 * vec3(sin(uTiempo * 0.7 + aAzar * 40.0), cos(uTiempo * 0.53 + aAzar * 31.0), sin(uTiempo * 0.61 + aAzar * 23.0));

  vColor = mix(ca, cb, te);
  // mientras vuela se calienta hacia el blanco
  vColor = mix(vColor, vec3(1.0, 0.94, 0.84), 0.22 * velocidad * velocidad);
  // en vuelo brilla un poco más cada una, pero se apagan en conjunto: están más amontonadas
  vBrillo = (0.8 + 0.2 * aAzar) * (1.0 - 0.35 * vuelo) + 0.25 * velocidad;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  // profundidad de campo: lo que se sale del plano de enfoque crece y se apaga
  vDesenfoque = clamp(abs(-mv.z - 6.1) * 0.55, 0.0, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uTam * uPR * (0.55 + aAzar * 0.7) * (1.0 + vDesenfoque * 1.1 + velocidad * 0.12) / -mv.z;
}
