// Partículas que cambian de forma: 0 = la Tierra, 1 = llegadas mes a mes,
// 2 = reloj de estacionalidad, 3 = torres de gasto. uEtapa es continua; entre
// dos formas cada partícula sale con un retraso propio y viaja por un campo de
// ruido, así la transición fluye en vez de interpolar en línea recta.
attribute vec3 aP0, aP1, aP2, aP3;
attribute vec3 aC0, aC1, aC2, aC3;
attribute float aAzar;
uniform float uEtapa, uTiempo, uTam, uPR, uOp;
varying vec3 vColor;
varying float vBrillo;

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

void main() {
  float e = clamp(uEtapa, 0.0, 2.9999);
  float f = fract(e);
  // cada partícula arranca un poco más tarde que otras: la forma se deshace por capas
  float t = clamp((f - aAzar * 0.35) / 0.65, 0.0, 1.0);
  t = t * t * (3.0 - 2.0 * t);
  vec3 a, b, ca, cb;
  if (e < 1.0)      { a = aP0; b = aP1; ca = aC0; cb = aC1; }
  else if (e < 2.0) { a = aP1; b = aP2; ca = aC1; cb = aC2; }
  else              { a = aP2; b = aP3; ca = aC2; cb = aC3; }
  if (uEtapa >= 3.0) { a = aP3; b = aP3; ca = aC3; cb = aC3; t = 1.0; }

  vec3 p = mix(a, b, t);
  // viaje por el campo de ruido, máximo a mitad de camino
  float vuelo = sin(3.14159 * t);
  vec3 q = p * 1.3 + vec3(0.0, uTiempo * 0.15, aAzar * 4.0);
  p += vec3(snoise(q), snoise(q + 17.1), snoise(q + 33.7)) * 0.55 * vuelo;
  // respiración suave en reposo
  p += vec3(snoise(p * 3.0 + uTiempo * 0.3)) * 0.006;

  vColor = mix(ca, cb, t);
  vBrillo = 0.75 + 0.5 * vuelo + 0.25 * aAzar;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uTam * uPR * (0.6 + aAzar * 0.8) / -mv.z;
}
