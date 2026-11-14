import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const params = new URLSearchParams(location.search);
const W = +(params.get('w') || 1920), H = +(params.get('h') || 1080);

// ---------------------------------------------------------------- utils
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rand = mulberry32(1234);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const mix = (a, b, k) => a + (b - a) * k;
function smooth(e0, e1, x) { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); }
const ease = k => k * k * (3 - 2 * k);
function hash2(x, y) { let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967295; }
function vnoise(x, y) { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi; const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1); return mix(mix(a, b, u), mix(c, d, u), v) * 2 - 1; }
function fbm(x, y, o = 5) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { s += a * vnoise(x * f + i * 17.1, y * f - i * 9.3); f *= 2.03; a *= 0.5; } return s; }
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------------------------------------------------------------- terrain height
const pads = [];
function hgtRaw(x, z) {
  const coast = -30 + Math.sin(x * 0.03) * 6 + fbm(x * 0.01, 7.3) * 10;
  const land = -7 + 15 * smooth(coast + 5, coast - 14, z);
  const d = Math.hypot(x, (z + 4) / 1.3) + fbm(x * 0.07, z * 0.07) * 3.5;
  const prom = -7 + 21 * smooth(24, 15.5, d);
  let h = Math.max(land, prom, mix(land, prom, 0.5) + 2);
  h += (fbm(x * 0.02, z * 0.02) * 2.5 + fbm(x * 0.11, z * 0.11) * 0.7) * smooth(-3, 4, h);
  const dl = Math.hypot(x, z);
  h = mix(14, h, smooth(5, 10, dl));
  return h;
}
function hgt(x, z) { let h = hgtRaw(x, z); for (const p of pads) { const d = Math.hypot(x - p.x, z - p.z); h = mix(p.h, h, smooth(p.r, p.r + p.f, d)); } return h; }
function addPad(x, z, r, f = 4) { const h = hgtRaw(x, z); pads.push({ x, z, r, f, h }); return h; }

// key positions
const LH = V3(0, 14, 0);
const LAMP = V3(0, 31.95, 0);
const COT = { x: 72, z: -52 }; COT.h = addPad(COT.x, COT.z, 9, 6) + 0.25;
const VIL = { x: -100, z: -92 };

// ---------------------------------------------------------------- renderer
const renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0b1018, 0.006);
const camera = new THREE.PerspectiveCamera(40, W / H, 0.05, 4000);

// ---------------------------------------------------------------- canvas textures
function canvasTex(w, h, draw, srgb = true) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const R2 = mulberry32(77);
function grime(g, w, h, n, alpha, col = '0,0,0') { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${col},${alpha * R2()})`; const r = 2 + R2() * 18; g.beginPath(); g.arc(R2() * w, R2() * h, r, 0, 7); g.fill(); } }

const towerTex = canvasTex(1024, 1024, (g, w, h) => {
  const bands = 6;
  for (let i = 0; i < bands; i++) { g.fillStyle = i % 2 ? '#e9e2d4' : '#a3231c'; g.fillRect(0, i * h / bands, w, h / bands + 1); }
  grime(g, w, h, 2500, 0.08);
  for (let i = 0; i < 220; i++) { const x = R2() * w, y = R2() * h, l = 20 + R2() * 140; const gr = g.createLinearGradient(x, y, x, y + l); gr.addColorStop(0, 'rgba(70,40,20,0.35)'); gr.addColorStop(1, 'rgba(70,40,20,0)'); g.fillStyle = gr; g.fillRect(x, y, 2 + R2() * 4, l); }
  for (let y = 0; y < h; y += 26) { g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(0, y, w, 2); }
});
const plankTex = (base, lines) => canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 32) { g.fillStyle = lines; g.fillRect(0, y, w, 3); for (let k = 0; k < 6; k++) { g.fillStyle = `rgba(0,0,0,${0.05 * R2()})`; g.fillRect(0, y + 3 + R2() * 28, w, 1 + R2() * 2); } }
  grime(g, w, h, 500, 0.06);
});
const floorTex = canvasTex(512, 512, (g, w, h) => {
  for (let x = 0; x < w; x += 64) { const l = 90 + R2() * 30; g.fillStyle = `rgb(${l},${l * 0.62},${l * 0.38})`; g.fillRect(x, 0, 64, h); g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillRect(x, 0, 2, h);
    for (let k = 0; k < 30; k++) { g.fillStyle = `rgba(40,20,5,${0.12 * R2()})`; g.fillRect(x + R2() * 64, 0, 1, h); } }
});
floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping; floorTex.repeat.set(3, 2);
const wallpaperTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#7a5f45'; g.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 32) { g.fillStyle = 'rgba(255,230,190,0.08)'; g.fillRect(x, 0, 10, h); }
  for (let i = 0; i < 40; i++) { g.fillStyle = 'rgba(255,220,170,0.07)'; g.beginPath(); g.arc(R2() * w, R2() * h, 5, 0, 7); g.fill(); }
});
wallpaperTex.wrapS = wallpaperTex.wrapT = THREE.RepeatWrapping; wallpaperTex.repeat.set(4, 2);
const signTex = canvasTex(512, 256, (g, w, h) => {
  g.fillStyle = '#5b4632'; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 64) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(0, y, w, 3); }
  grime(g, w, h, 300, 0.15);
  g.fillStyle = '#e8dcc0'; g.font = 'bold 64px DejaVu Sans'; g.textAlign = 'center'; g.fillText('ПРОХОД', w / 2, 100); g.fillText('ЗАКРЫТ', w / 2, 180);
  g.fillStyle = '#b52a1f'; g.font = 'bold 30px DejaVu Sans'; g.fillText('— ОПАСНО —', w / 2, 232);
});
const glowTex = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.15, 'rgba(255,240,200,0.6)'); gr.addColorStop(0.5, 'rgba(255,200,120,0.12)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
const pictureTex = canvasTex(256, 320, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f2b36b'); gr.addColorStop(0.6, '#7c4e6e'); gr.addColorStop(1, '#203a55'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = '#2b2b33'; g.beginPath(); g.moveTo(0, h); g.lineTo(0, 230); g.lineTo(150, 215); g.lineTo(200, 250); g.lineTo(w, 245); g.lineTo(w, h); g.fill();
  g.fillStyle = '#e8e0d0'; g.fillRect(118, 110, 26, 110); g.fillStyle = '#a3231c'; g.fillRect(118, 140, 26, 20); g.fillRect(118, 180, 26, 20);
  g.fillStyle = '#ffe9a0'; g.fillRect(120, 96, 22, 14); g.fillStyle = '#5a1a14'; g.beginPath(); g.arc(131, 96, 13, Math.PI, 0); g.fill();
});
const bookColors = ['#7a2e24', '#2e4a6b', '#3f5e3a', '#8a6a2f', '#4a3058', '#6b4a35', '#204040', '#9a8a70'];

// ---------------------------------------------------------------- materials helpers
const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.85, metalness: 0 }, o));
function mesh(geo, mat, x = 0, y = 0, z = 0, parent = scene, cast = true, recv = true) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = cast; m.receiveShadow = recv; parent.add(m); return m; }

// ---------------------------------------------------------------- shared glsl
const NOISE_GLSL = `
float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }
float fbm4(vec2 p){ float s=0., a=.5; for(int i=0;i<4;i++){ s+=a*vn(p); p=p*2.03+vec2(17.1,-9.3); a*=.5;} return s; }
float fbm6(vec2 p){ float s=0., a=.5; for(int i=0;i<6;i++){ s+=a*vn(p); p=p*2.03+vec2(17.1,-9.3); a*=.5;} return s; }
`;

// ---------------------------------------------------------------- sky
const skyU = {
  uTop: { value: V3(0.01, 0.016, 0.035) }, uHor: { value: V3(0.05, 0.07, 0.1) }, uCloud: { value: V3(0.06, 0.07, 0.09) },
  uMoonDir: { value: V3(-0.45, 0.35, -0.82).normalize() }, uMoonCol: { value: V3(0.8, 0.85, 1.0) }, uMoonI: { value: 1 },
  uCov: { value: 0.5 }, uTime: { value: 0 }, uFlash: { value: 0 }, uStars: { value: 1 }, uWind: { value: 1 }, uSunset: { value: 0 },
};
const sky = new THREE.Mesh(new THREE.SphereGeometry(2500, 64, 32), new THREE.ShaderMaterial({
  uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
  vertexShader: `varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: NOISE_GLSL + `
  uniform vec3 uTop,uHor,uCloud,uMoonDir,uMoonCol; uniform float uMoonI,uCov,uTime,uFlash,uStars,uWind,uSunset; varying vec3 vDir;
  void main(){
    vec3 d = normalize(vDir); float y = d.y;
    vec3 col = mix(uHor, uTop, smoothstep(-0.02, 0.55, y));
    float md = max(dot(d,uMoonDir),0.);
    float disc = smoothstep(0.99955,0.99975,md);
    float halo = pow(md,300.)*0.8 + pow(md,24.)*0.18 + pow(md,4.)*0.05*uSunset;
    vec2 uv = d.xz/(max(y,0.0)+0.12)*0.9 + vec2(uTime*0.035*uWind, uTime*0.012*uWind);
    float c = fbm6(uv*1.3);
    float cover = smoothstep(uCov-0.18, uCov+0.22, c);
    float dens = fbm4(uv*3.1+5.);
    float lit = pow(md, 6.)*1.2;
    vec3 cc = uCloud*(0.55+0.9*dens) + uMoonCol*uMoonI*lit*(1.0-cover*0.5)*0.35;
    float st = step(0.9975, h21(floor(d.xz/(y+0.3)*420.)))*(1.-cover)*smoothstep(0.08,0.4,y)*uStars;
    col += uMoonCol*uMoonI*halo*(1.-cover*0.75) + uMoonCol*uMoonI*disc*4.*(1.-cover*0.95) + st*vec3(0.6,0.65,0.8);
    col = mix(col, cc, cover*smoothstep(-0.03,0.06,y));
    col += uFlash*(0.25+dens*1.6)*vec3(0.55,0.6,0.9)*(0.4+cover)*smoothstep(-0.1,0.3,y);
    gl_FragColor = vec4(col,1.);
  }`
}));
sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);

// ---------------------------------------------------------------- terrain
const TW = 760, TSEG = 380, TCX = -20, TCZ = -110;
const tgeo = new THREE.PlaneGeometry(TW, TW, TSEG, TSEG); tgeo.rotateX(-Math.PI / 2);
{
  const p = tgeo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + TCX, z = p.getZ(i) + TCZ; p.setXYZ(i, x, hgt(x, z), z); }
  tgeo.computeVertexNormals();
  const n = tgeo.attributes.normal, cols = new Float32Array(p.count * 3);
  const grass = new THREE.Color(0x2b3a1c), grass2 = new THREE.Color(0x45472a), rock = new THREE.Color(0x56514a), rock2 = new THREE.Color(0x3a3733), wet = new THREE.Color(0x1d1c1b), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), slope = 1 - n.getY(i);
    c.copy(grass).lerp(grass2, smooth(-0.4, 0.6, fbm(x * 0.05, z * 0.05)));
    c.lerp(rock.clone().lerp(rock2, smooth(-0.5, 0.5, fbm(x * 0.3, y * 0.3))), smooth(0.18, 0.38, slope));
    c.lerp(wet, smooth(2.5, 0.5, y));
    cols.set([c.r, c.g, c.b], i * 3);
  }
  tgeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
}
const terrain = mesh(tgeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 }), 0, 0, 0, scene, true, true);

// height texture for ocean foam
const HT = 256, HR = { x0: -260, z0: -200, w: 520, h: 460 };
const htData = new Uint8Array(HT * HT * 4);
for (let j = 0; j < HT; j++) for (let i = 0; i < HT; i++) { const x = HR.x0 + (i + 0.5) / HT * HR.w, z = HR.z0 + (j + 0.5) / HT * HR.h; const v = clamp(Math.round((hgt(x, z) + 10) * 10), 0, 255); htData.set([v, v, v, 255], (j * HT + i) * 4); }
const htTex = new THREE.DataTexture(htData, HT, HT); htTex.magFilter = THREE.LinearFilter; htTex.minFilter = THREE.LinearFilter; htTex.needsUpdate = true;

// rocks along the shore
{
  const rgeo = new THREE.DodecahedronGeometry(1, 1); const rmat = std(0x2f2d2b, { roughness: 0.9, flatShading: true });
  const inst = new THREE.InstancedMesh(rgeo, rmat, 260); let k = 0; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let tries = 0; tries < 30000 && k < 260; tries++) {
    const x = -150 + rand() * 300, z = -80 + rand() * 120, h = hgt(x, z);
    if (h > -1.2 && h < 2.2) { const s = 0.6 + rand() * 2.4; e.set(rand() * 6, rand() * 6, rand() * 6); q.setFromEuler(e); m4.compose(V3(x, h - s * 0.3, z), q, V3(s, s * (0.6 + rand() * 0.5), s)); inst.setMatrixAt(k++, m4); }
  }
  inst.count = k; inst.castShadow = true; inst.receiveShadow = true; scene.add(inst);
}

// ---------------------------------------------------------------- ocean
const oceanU = {
  uTime: { value: 0 }, uStorm: { value: 0.3 }, uDeep: { value: V3(0.004, 0.012, 0.02) }, uShallow: { value: V3(0.03, 0.09, 0.09) },
  uTop: skyU.uTop, uHor: skyU.uHor, uMoonDir: skyU.uMoonDir, uMoonCol: skyU.uMoonCol, uMoonI: skyU.uMoonI, uFlash: skyU.uFlash,
  uFogCol: { value: new THREE.Color(0x0b1018) }, uFogDen: { value: 0.006 }, uLamp: { value: 0 }, uLampPos: { value: LAMP.clone() },
  uHT: { value: htTex }, uHR: { value: new THREE.Vector4(HR.x0, HR.z0, HR.w, HR.h) }, uFoamI: { value: 0.3 }, uWaveScale: { value: 1 },
};
const OCEAN_VS = `
uniform float uTime,uStorm,uWaveScale; varying vec3 vW; varying vec3 vN; varying float vCrest;
void wave(vec2 dir, float wl, float A, float Q, vec2 p, inout vec3 P, inout vec3 N){
  float k = 6.28318/wl; float w = sqrt(9.8*k); float f = k*dot(dir,p) - w*uTime;
  float c = cos(f), s = sin(f);
  P.x += Q*A*dir.x*c; P.z += Q*A*dir.y*c; P.y += A*s;
  float WA = k*A; N.x -= dir.x*WA*c; N.z -= dir.y*WA*c; N.y -= Q*WA*s;
}
void main(){
  vec4 wp = modelMatrix*vec4(position,1.);
  vec2 p = wp.xz; vec3 P = vec3(p.x,0.,p.y); vec3 N = vec3(0,1,0);
  float s = mix(0.35, 1.0, uStorm)*uWaveScale;
  wave(normalize(vec2(-0.3,-1.0)), 42., 1.10*s*s, 0.55, p, P, N);
  wave(normalize(vec2(0.2,-1.0)), 23., 0.55*s, 0.6, p, P, N);
  wave(normalize(vec2(-0.7,-0.6)), 13., 0.30*s, 0.6, p, P, N);
  wave(normalize(vec2(0.6,-0.8)), 7.5, 0.16*s, 0.6, p, P, N);
  wave(normalize(vec2(-0.1,-1.0)), 4.1, 0.08*s, 0.5, p, P, N);
  wave(normalize(vec2(0.9,-0.4)), 2.6, 0.045*s, 0.5, p, P, N);
  vCrest = P.y/(s*s+0.2);
  vW = P; vN = N;
  gl_Position = projectionMatrix*viewMatrix*vec4(P,1.);
}`;
const OCEAN_FS = NOISE_GLSL + `
uniform float uTime,uStorm,uMoonI,uFlash,uFogDen,uLamp,uFoamI; uniform vec3 uDeep,uShallow,uTop,uHor,uMoonDir,uMoonCol,uFogCol,uLampPos;
uniform sampler2D uHT; uniform vec4 uHR; varying vec3 vW; varying vec3 vN; varying float vCrest;
void main(){
  vec3 N = normalize(vN);
  vec2 q = vW.xz*0.45 + vec2(uTime*0.2, -uTime*0.35);
  float e = 0.15; float h0 = fbm4(q), hx = fbm4(q+vec2(e,0.)), hz = fbm4(q+vec2(0.,e));
  N = normalize(N + vec3(h0-hx, 0., h0-hz)*(1.4+uStorm*1.5));
  vec3 V = normalize(cameraPosition - vW); float dist = length(cameraPosition - vW);
  float fres = 0.02 + 0.98*pow(1.0 - max(dot(N,V),0.), 5.);
  vec3 R = reflect(-V,N); R.y = abs(R.y);
  vec3 skyc = mix(uHor, uTop, smoothstep(0.0,0.5,R.y))*(1.0 + uFlash*6.0);
  float md = max(dot(R,uMoonDir),0.);
  float spec = (pow(md,600.)*6. + pow(md,40.)*0.25)*uMoonI;
  vec3 Lp = normalize(uLampPos - vW); float ld = max(dot(R,Lp),0.);
  float lspec = (pow(ld,900.)*40. + pow(ld,60.)*1.2)*uLamp;
  vec3 col = uDeep*(0.6+0.4*N.y) + uShallow*smoothstep(-0.2,1.6,vCrest)*0.5*(0.4+uMoonI*0.6);
  col = mix(col, skyc, fres) + uMoonCol*spec + vec3(1.,.82,.55)*lspec;
  vec2 huv = (vW.xz - uHR.xy)/uHR.zw;
  float th = texture2D(uHT, huv).r*25.5 - 10.; if(huv.x<0.||huv.y<0.||huv.x>1.||huv.y>1.) th = -10.;
  float depth = vW.y - th;
  float fn = fbm4(vW.xz*0.35 + vec2(uTime*0.25, uTime*0.1));
  float shore = smoothstep(3.0+uStorm*2.5, 0.2, depth)*smoothstep(0.25,0.65, fn + 0.25*sin(uTime*1.3 - depth*2.5));
  float crest = smoothstep(0.75, 1.25, vCrest)*smoothstep(0.35,0.7, fn)*uStorm;
  float foam = clamp(shore + crest, 0., 1.);
  col = mix(col, vec3(0.62,0.68,0.74)*(uFoamI + uFlash*2.0 + uLamp*0.3), foam*0.85);
  float f = 1.0 - exp(-pow(dist*uFogDen, 2.));
  col = mix(col, uFogCol, f);
  gl_FragColor = vec4(col,1.);
}`;
const oceanMat = new THREE.ShaderMaterial({ uniforms: oceanU, vertexShader: OCEAN_VS, fragmentShader: OCEAN_FS });
const ocean = new THREE.Mesh(new THREE.PlaneGeometry(700, 700, 460, 460).rotateX(-Math.PI / 2), oceanMat); ocean.frustumCulled = false; scene.add(ocean);
const oceanFar = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000, 60, 60).rotateX(-Math.PI / 2), oceanMat); oceanFar.position.y = -0.6; oceanFar.frustumCulled = false; scene.add(oceanFar);
function placeOcean(c) { ocean.position.set(Math.round(c.x / 10) * 10, 0, Math.round(c.z / 10) * 10); }

// ---------------------------------------------------------------- lights
const hemi = new THREE.HemisphereLight(0x3a4a6a, 0x0a0a0c, 0.6); scene.add(hemi);
const moon = new THREE.DirectionalLight(0xa8b8ff, 1.0); moon.castShadow = true; moon.shadow.mapSize.set(2048, 2048); moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.04; scene.add(moon); scene.add(moon.target);
const bolt = new THREE.DirectionalLight(0xc8d0ff, 0); bolt.position.set(-50, 200, -80); scene.add(bolt);
function setShadowFocus(c, r) {
  const d = skyU.uMoonDir.value; moon.target.position.copy(c); moon.position.copy(c).addScaledVector(d, 150);
  const sc = moon.shadow.camera; sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.near = 1; sc.far = 400; sc.updateProjectionMatrix();
}

// ---------------------------------------------------------------- lighthouse
const lh = new THREE.Group(); lh.position.copy(LH); scene.add(lh);
{
  const prof = []; for (let i = 0; i <= 40; i++) { const y = i / 40 * 16; prof.push(new THREE.Vector2(mix(2.35, 1.55, Math.pow(i / 40, 0.9)), y)); }
  const tower = mesh(new THREE.LatheGeometry(prof, 64), std(0xffffff, { map: towerTex, roughness: 0.8 }), 0, 0, 0, lh);
  mesh(new THREE.CylinderGeometry(2.9, 3.1, 0.8, 48), std(0x6d655a, { roughness: 0.95 }), 0, 0.2, 0, lh);
  // windows
  const wmat = std(0x0b0c0e, { roughness: 0.3 }); const fmat = std(0xd8d0bf);
  for (const [y, a] of [[4.5, 0.5], [8.2, 3.6], [11.8, 0.9], [14.4, 3.9]]) {
    const r = mix(2.35, 1.55, y / 16) - 0.02; const g = new THREE.Group(); g.position.set(Math.sin(a) * r, y, Math.cos(a) * r); g.rotation.y = a; lh.add(g);
    mesh(new THREE.BoxGeometry(0.62, 1.0, 0.2), fmat, 0, 0, 0, g); mesh(new THREE.BoxGeometry(0.46, 0.84, 0.22), wmat, 0, 0, 0.02, g);
  }
  // door facing village
  const da = Math.atan2(VIL.x, VIL.z); lh.userData.doorAngle = da;
  const dg = new THREE.Group(); dg.position.set(Math.sin(da) * 2.36, 0, Math.cos(da) * 2.36); dg.rotation.y = da; lh.add(dg);
  mesh(new THREE.BoxGeometry(1.5, 2.6, 0.3), std(0x8a8275), 0, 1.3 + 0.3, 0, dg);
  mesh(new THREE.BoxGeometry(1.1, 2.2, 0.32), std(0x3a2a1c, { roughness: 0.9 }), 0, 1.2 + 0.3, 0.02, dg);
  const iron = std(0x3b2a20, { metalness: 0.6, roughness: 0.6 });
  for (const y of [0.9, 1.6, 2.3]) mesh(new THREE.BoxGeometry(1.1, 0.07, 0.35), iron, 0, y, 0.03, dg);
  mesh(new THREE.TorusGeometry(0.08, 0.02, 8, 16), iron, 0.35, 1.5, 0.2, dg);
  // gallery
  const top = new THREE.Group(); top.position.y = 16; lh.add(top);
  const dark = std(0x1d1f22, { metalness: 0.5, roughness: 0.5 });
  mesh(new THREE.CylinderGeometry(2.65, 1.9, 0.45, 48), std(0x5d564c), 0, 0.0, 0, top);
  for (let i = 0; i < 36; i++) { const a = i / 36 * Math.PI * 2; mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 6), dark, Math.sin(a) * 2.55, 0.72, Math.cos(a) * 2.55, top); }
  mesh(new THREE.TorusGeometry(2.55, 0.035, 8, 96).rotateX(Math.PI / 2), dark, 0, 1.22, 0, top);
  mesh(new THREE.TorusGeometry(2.55, 0.02, 6, 96).rotateX(Math.PI / 2), dark, 0, 0.75, 0, top);
  mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.6, 32), std(0xd8d0bf), 0, 0.52, 0, top);
  // lantern
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; mesh(new THREE.BoxGeometry(0.07, 2.2, 0.07), dark, Math.sin(a) * 1.3, 1.92, Math.cos(a) * 1.3, top); }
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x2a3a40, roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.28, emissive: new THREE.Color(1, 0.75, 0.4), emissiveIntensity: 0, depthWrite: false });
  lh.userData.glass = glassMat;
  const glass = mesh(new THREE.CylinderGeometry(1.28, 1.28, 2.2, 12, 1, true), glassMat, 0, 1.92, 0, top, false, false);
  mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.15, 32), dark, 0, 3.05, 0, top);
  const dome = mesh(new THREE.SphereGeometry(1.4, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), std(0x5a1712, { metalness: 0.35, roughness: 0.55 }), 0, 3.1, 0, top); dome.scale.y = 0.7;
  mesh(new THREE.SphereGeometry(0.22, 16, 12), dark, 0, 4.15, 0, top);
  mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 6), dark, 0, 4.9, 0, top);
  // lamp + lens
  const lampMat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: new THREE.Color(1.0, 0.82, 0.55), emissiveIntensity: 0 });
  lh.userData.lampMat = lampMat;
  mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.8, 16), std(0x6a5a3a, { metalness: 0.7, roughness: 0.3 }), 0, 1.25, 0, top);
  mesh(new THREE.SphereGeometry(0.34, 24, 16), lampMat, 0, 1.95 + 0.3 - 0.95 + 0.95, 0, top, false, false).position.y = LAMP.y - LH.y - 16;
  // keeper's house
  const kh = new THREE.Group(); kh.position.set(-5.5, 0, 4.2); kh.rotation.y = 0.5; lh.add(kh);
  mesh(new THREE.BoxGeometry(5.5, 3.0, 4.2), std(0xb8b0a0), 0, 1.5, 0, kh);
  const roofM = std(0x3a2622, { roughness: 0.9 });
  const r1 = mesh(new THREE.BoxGeometry(6.0, 0.15, 2.7), roofM, 0, 3.55, 1.05, kh); r1.rotation.x = 0.62;
  const r2 = mesh(new THREE.BoxGeometry(6.0, 0.15, 2.7), roofM, 0, 3.55, -1.05, kh); r2.rotation.x = -0.62;
  const gab = new THREE.Shape([new THREE.Vector2(-2.1, 0), new THREE.Vector2(2.1, 0), new THREE.Vector2(0, 1.4)]);
  for (const s of [-1, 1]) { const g = mesh(new THREE.ShapeGeometry(gab), std(0xb8b0a0, { side: THREE.DoubleSide }), s * 2.75, 3.0, 0, kh); g.rotation.y = Math.PI / 2; }
  mesh(new THREE.BoxGeometry(0.6, 1.6, 0.6), std(0x6a5a50), 1.6, 4.2, -0.6, kh);
  const board = std(0x4a3a2a);
  for (const x of [-1.5, 1.4]) { mesh(new THREE.BoxGeometry(1.0, 1.0, 0.1), std(0x050505), x, 1.7, 2.12, kh); const b = mesh(new THREE.BoxGeometry(1.2, 0.16, 0.06), board, x, 1.7, 2.18, kh); b.rotation.z = 0.5; const b2 = mesh(new THREE.BoxGeometry(1.2, 0.16, 0.06), board, x, 1.7, 2.19, kh); b2.rotation.z = -0.4; }
}
const lampLight = new THREE.PointLight(0xffd8a0, 0, 0, 2); lampLight.position.copy(LAMP); scene.add(lampLight);
const glowMat = (col) => new THREE.ShaderMaterial({ uniforms: { opacity: { value: 0 }, uCol: { value: new THREE.Color(col) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv-0.5; vec4 mv = modelViewMatrix*vec4(0.,0.,0.,1.); vec3 sc = vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), 1.); mv.xy += position.xy*sc.xy; gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `uniform float opacity; uniform vec3 uCol; varying vec2 vUv; void main(){ float r = length(vUv)*2.; float a = exp(-r*r*14.)*1.5 + exp(-r*5.)*0.35; a *= smoothstep(1.,0.7,r); gl_FragColor = vec4(uCol*a*opacity,1.); }` });
const lampGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMat(0xffe0b0)); lampGlow.material.uniforms.opacity = { value: 0 }; lampGlow.frustumCulled = false;
Object.defineProperty(lampGlow, 'opacityU', { get() { return this.material.uniforms.opacity; } });
lampGlow.position.copy(LAMP); lampGlow.scale.set(9, 9, 1); lampGlow.renderOrder = 5; scene.add(lampGlow);
// beams
const beamMat = new THREE.ShaderMaterial({
  uniforms: { uI: { value: 0 }, uCol: { value: V3(1.0, 0.85, 0.6) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying float vD; void main(){ vUv=uv; vec4 wp=modelMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-wp.xyz); vD=length(cameraPosition-wp.xyz); gl_Position=projectionMatrix*viewMatrix*wp; }`,
  fragmentShader: `uniform float uI; uniform vec3 uCol; varying vec2 vUv; varying vec3 vN; varying vec3 vV; varying float vD; void main(){ float a = pow(vUv.y, 2.2)*pow(abs(dot(vN,vV)),1.5)*uI*smoothstep(3.,25.,vD); gl_FragColor=vec4(uCol*a,1.); }`
});
const beam = new THREE.Group(); beam.position.copy(LAMP); scene.add(beam);
{ const g = new THREE.ConeGeometry(7, 90, 40, 1, true); g.translate(0, -45, 0); g.rotateZ(Math.PI / 2); const b1 = new THREE.Mesh(g, beamMat); beam.add(b1); const b2 = new THREE.Mesh(g, beamMat); b2.rotation.y = Math.PI; beam.add(b2); beam.userData.b2 = b2; }

// ---------------------------------------------------------------- people
function makePerson(o) {
  const g = new THREE.Group(); const P = { group: g };
  const mSkin = std(o.skin, { roughness: 0.7 }), mTop = std(o.top), mPants = std(o.pants), mHair = std(o.hair, { roughness: 0.9 }), mShoe = std(0x1a1410, { roughness: 0.6 });
  P.mats = [mSkin, mTop, mPants, mHair, mShoe];
  const hips = new THREE.Group(); hips.position.y = 0.95; g.add(hips); P.hips = hips;
  const torsoBase = o.coat ? -0.42 : -0.05;
  const tp = [[0, torsoBase], [o.coat ? 0.27 : 0.17, torsoBase], [0.2, 0.08], [0.215, 0.3], [0.245, 0.47], [0.21, 0.56], [0.09, 0.62], [0, 0.62]].map(p => new THREE.Vector2(p[0], p[1]));
  const torso = mesh(new THREE.LatheGeometry(tp, 28), mTop, 0, 0, 0, hips); torso.scale.z = 0.72;
  if (o.sweaterCollar) { const c = mesh(new THREE.TorusGeometry(0.08, 0.03, 8, 20).rotateX(Math.PI / 2), mTop, 0, 0.62, 0, hips); }
  mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.12, 12), mSkin, 0, 0.66, 0, hips);
  const head = new THREE.Group(); head.position.y = 0.8; hips.add(head); P.head = head;
  const hd = mesh(new THREE.SphereGeometry(0.135, 32, 24), mSkin, 0, 0, 0, head); hd.scale.set(0.95, 1.08, 1);
  const eye = std(0x0a0a0a, { roughness: 0.2 }); const white = std(0xf2efe8, { roughness: 0.3 });
  for (const s of [-1, 1]) { mesh(new THREE.SphereGeometry(0.024, 12, 10), white, s * 0.045, 0.02, 0.114, head); mesh(new THREE.SphereGeometry(0.012, 10, 8), eye, s * 0.045, 0.022, 0.136, head); mesh(new THREE.SphereGeometry(0.03, 10, 8), mSkin, s * 0.13, 0.0, 0.0, head).scale.set(0.5, 1, 0.8);
    const brow = mesh(new THREE.BoxGeometry(0.05, 0.012, 0.012), o.brow ? std(o.brow) : mHair, s * 0.047, 0.062, 0.125, head); brow.rotation.z = -s * 0.15; }
  const nose = mesh(new THREE.SphereGeometry(0.022, 12, 10), mSkin, 0, -0.025, 0.133, head); nose.scale.set(0.8, 1, 1.0);
  for (const s of [-1, 1]) { mesh(new THREE.SphereGeometry(0.005, 6, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), s * 0.045 + 0.006, 0.027, 0.148, head, false, false); }
  if (!o.beard) { const bang = mesh(new THREE.SphereGeometry(0.09, 16, 10), mHair, 0.03, 0.095, 0.075, head); bang.scale.set(1.3, 0.45, 0.7); bang.rotation.z = 0.25; }
  mesh(new THREE.BoxGeometry(0.05, 0.008, 0.01), std(0x6a3a30), 0, -0.07, 0.122, head);
  const hair = mesh(new THREE.SphereGeometry(0.15, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.55), mHair, 0, 0.02, -0.012, head); hair.rotation.x = -0.35; hair.scale.set(1, 1.05, 1.05);
  if (o.beard) { const b = mesh(new THREE.SphereGeometry(0.12, 20, 16), std(o.beard), 0, -0.085, 0.06, head); b.scale.set(1.0, 0.9, 0.75); const mu = mesh(new THREE.SphereGeometry(0.05, 12, 8), std(o.beard), 0, -0.045, 0.125, head); mu.scale.set(1.4, 0.5, 0.6); P.mats.push(b.material, mu.material); }
  if (o.cap) { const cm = std(o.cap); mesh(new THREE.CylinderGeometry(0.155, 0.15, 0.09, 24), cm, 0, 0.12, -0.005, head); const brim = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.015, 20, 1, false, -Math.PI / 2, Math.PI), std(0x111111), 0, 0.085, 0.07, head); brim.scale.z = 1.2; P.mats.push(cm, brim.material); }
  P.mats.push(eye, white);
  const limb = (r, l, m, parent, y) => mesh(new THREE.CapsuleGeometry(r, l, 6, 14), m, 0, y, 0, parent);
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.25, 0.5, 0); hips.add(sh);
    limb(0.06, 0.24, mTop, sh, -0.15);
    const el = new THREE.Group(); el.position.y = -0.31; sh.add(el);
    limb(0.052, 0.22, o.sleeveFore ? mTop : mTop, el, -0.13);
    mesh(new THREE.SphereGeometry(0.052, 12, 10), mSkin, 0, -0.29, 0, el);
    const th = new THREE.Group(); th.position.set(s * 0.1, 0.0, 0); hips.add(th);
    limb(0.08, 0.38, o.coat ? mPants : mPants, th, -0.23);
    const kn = new THREE.Group(); kn.position.y = -0.46; th.add(kn);
    limb(0.065, 0.36, mPants, kn, -0.21);
    mesh(new THREE.BoxGeometry(0.11, 0.08, 0.24), mShoe, 0, -0.45, 0.05, kn);
    P[s < 0 ? 'L' : 'R'] = { sh, el, th, kn };
  }
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return P;
}
function resetPose(P) { P.hips.position.set(0, 0.95, 0); P.hips.rotation.set(0, 0, 0); P.head.rotation.set(0, 0, 0); for (const k of ['L', 'R']) { const s = P[k]; s.sh.rotation.set(0, 0, k === 'L' ? 0.08 : -0.08); s.el.rotation.set(-0.1, 0, 0); s.th.rotation.set(0, 0, 0); s.kn.rotation.set(0, 0, 0); } }

const arthur = makePerson({ skin: 0xd9a58a, top: 0x1f2a44, pants: 0x1a1d26, hair: 0xd8d8d8, beard: 0xe6e6e6, cap: 0x1a2238, coat: true, brow: 0xcfcfcf });
scene.add(arthur.group);
const mark = makePerson({ skin: 0xe8b996, top: 0x8a3b2a, pants: 0x2a3550, hair: 0x3a2416, sweaterCollar: true });
scene.add(mark.group);
function setOpacity(P, o) { for (const m of P.mats) { m.transparent = o < 1; m.opacity = o; m.depthWrite = o > 0.5; } P.group.visible = o > 0.01; }

// ---------------------------------------------------------------- Mark's cottage
const cot = new THREE.Group(); cot.position.set(COT.x, COT.h, COT.z);
cot.rotation.y = Math.atan2(LH.x - COT.x, LH.z - COT.z); scene.add(cot); cot.updateMatrixWorld();
const cotL = (x, y, z) => cot.localToWorld(V3(x, y, z));
const LAMPDESK = V3(-0.62, 1.12, 2.05);
const lanternMat = new THREE.MeshStandardMaterial({ color: 0x332211, emissive: new THREE.Color(1, 0.65, 0.3), emissiveIntensity: 4 });
{
  const extM = std(0xffffff, { map: plankTex('#c9c2b2', 'rgba(60,50,40,0.5)'), roughness: 0.9 });
  const inM = std(0xffffff, { map: wallpaperTex, roughness: 0.95 });
  const fM = std(0xffffff, { map: floorTex, roughness: 0.8 });
  const X = 3.5, Z = 2.5, HH = 3.0, T = 0.2;
  const wall = (w, h, x, y, z, ry = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; cot.add(g);
    const outer = mesh(new THREE.BoxGeometry(w, h, T), extM, 0, 0, 0, g); const inner = mesh(new THREE.PlaneGeometry(w, h), inM, 0, 0, -T / 2 - 0.005, g); inner.rotation.y = Math.PI; return g; };
  // front wall with window: window x[-1.1,1.1], y[0.95,2.6]
  const wx = 1.1, wy0 = 0.95, wy1 = 2.6;
  wall(X - wx, HH, -(X + wx) / 2, HH / 2, Z + T / 2);
  wall(X - wx, HH, (X + wx) / 2, HH / 2, Z + T / 2);
  wall(2 * wx, wy0, 0, wy0 / 2, Z + T / 2);
  wall(2 * wx, HH - wy1, 0, (HH + wy1) / 2, Z + T / 2);
  // back
  wall(2 * X + 2 * T, HH, 0, HH / 2, -Z - T / 2, Math.PI);
  // sides (right side has door z[-1.8,-0.8])
  wall(2 * Z, HH, -X - T / 2, HH / 2, 0, -Math.PI / 2);
  wall(Z - 0.2 + 0.0, HH, X + T / 2, HH / 2, (Z + (-0.8)) / 2 + 0.0, Math.PI / 2);
  wall(Z - 1.8, HH, X + T / 2, HH / 2, (-Z - 1.8) / 2, Math.PI / 2);
  wall(1.0, HH - 2.1, X + T / 2, (HH + 2.1) / 2, -1.3, Math.PI / 2);
  const door = mesh(new THREE.BoxGeometry(0.08, 2.1, 1.0), std(0x4a3020), X + 0.15, 1.05, -1.3, cot);
  // floor/ceiling
  const fl = mesh(new THREE.PlaneGeometry(2 * X, 2 * Z), fM, 0, 0.01, 0, cot); fl.rotation.x = -Math.PI / 2;
  mesh(new THREE.BoxGeometry(2 * X + 0.6, 0.3, 2 * Z + 0.6), std(0x4a4440), 0, -0.14, 0, cot);
  const ce = mesh(new THREE.PlaneGeometry(2 * X, 2 * Z), std(0x5a4430), 0, HH, 0, cot); ce.rotation.x = Math.PI / 2;
  for (const x of [-2.4, -0.8, 0.8, 2.4]) mesh(new THREE.BoxGeometry(0.18, 0.2, 2 * Z), std(0x3a2818), x, HH - 0.1, 0, cot);
  // roof
  const roofM = std(0x2e3238, { roughness: 0.8 });
  for (const s of [-1, 1]) { const r = mesh(new THREE.BoxGeometry(2 * X + 1.0, 0.18, 3.6), roofM, 0, HH + 0.95, s * 1.45, cot); r.rotation.x = s * 0.62; }
  const gab = new THREE.Shape([new THREE.Vector2(-Z - T, 0), new THREE.Vector2(Z + T, 0), new THREE.Vector2(0, 1.8)]);
  for (const s of [-1, 1]) { const g = mesh(new THREE.ShapeGeometry(gab), std(0xc9c2b2, { side: THREE.DoubleSide, map: null }), s * (X + T), HH, 0, cot); g.rotation.y = Math.PI / 2; }
  mesh(new THREE.BoxGeometry(0.7, 2.2, 0.7), std(0x6a4a40), -2.5, HH + 1.5, -1.6, cot);
  // window frame + glass
  const frM = std(0xe6e0d0, { roughness: 0.6 });
  mesh(new THREE.BoxGeometry(2 * wx + 0.1, 0.1, 0.32), frM, 0, wy0, Z + 0.1, cot);
  mesh(new THREE.BoxGeometry(2 * wx + 0.1, 0.1, 0.25), frM, 0, wy1, Z + 0.1, cot);
  for (const x of [-wx, 0, wx]) mesh(new THREE.BoxGeometry(0.08, wy1 - wy0, 0.12), frM, x, (wy0 + wy1) / 2, Z + 0.1, cot);
  mesh(new THREE.BoxGeometry(2 * wx, 0.06, 0.1), frM, 0, 1.85, Z + 0.1, cot);
  const glassM = new THREE.MeshStandardMaterial({ color: 0x223040, roughness: 0.05, transparent: true, opacity: 0.2, emissive: new THREE.Color(1, 0.7, 0.35), emissiveIntensity: 0.5, depthWrite: false });
  mesh(new THREE.PlaneGeometry(2 * wx, wy1 - wy0), glassM, 0, (wy0 + wy1) / 2, Z + 0.15, cot, false, false);
  // desk
  const wood = std(0x5a3a22, { roughness: 0.7 });
  mesh(new THREE.BoxGeometry(1.9, 0.06, 0.8), wood, 0, 0.76, 1.95, cot);
  for (const [x, z] of [[-0.88, 1.6], [0.88, 1.6], [-0.88, 2.3], [0.88, 2.3]]) mesh(new THREE.BoxGeometry(0.06, 0.74, 0.06), wood, x, 0.37, z, cot);
  mesh(new THREE.BoxGeometry(0.5, 0.5, 0.7), wood, 0.65, 0.48, 1.95, cot);
  // chair
  const chair = new THREE.Group(); chair.position.set(0, 0, 1.05); cot.add(chair); cot.userData.chair = chair;
  mesh(new THREE.BoxGeometry(0.48, 0.05, 0.46), wood, 0, 0.48, 0, chair);
  for (const [x, z] of [[-0.21, -0.2], [0.21, -0.2], [-0.21, 0.2], [0.21, 0.2]]) mesh(new THREE.BoxGeometry(0.04, 0.48, 0.04), wood, x, 0.24, z, chair);
  mesh(new THREE.BoxGeometry(0.48, 0.5, 0.04), wood, 0, 0.78, -0.22, chair);
  // typewriter
  const tw = new THREE.Group(); tw.position.set(0.0, 0.79, 1.95); cot.add(tw);
  const twM = std(0x1f3a30, { metalness: 0.4, roughness: 0.4 });
  mesh(new THREE.BoxGeometry(0.46, 0.1, 0.34), twM, 0, 0.05, 0, tw); const bk = mesh(new THREE.BoxGeometry(0.46, 0.12, 0.14), twM, 0, 0.12, 0.1, tw);
  mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.52, 16).rotateZ(Math.PI / 2), std(0x111111), 0, 0.2, 0.13, tw);
  const paper = mesh(new THREE.PlaneGeometry(0.28, 0.32), std(0xf4efe2, { side: THREE.DoubleSide }), 0, 0.33, 0.16, tw); paper.rotation.x = -0.25;
  const keyM = std(0x8a8a86, { roughness: 0.5 });
  const keys = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 10), keyM, 40); let k = 0; const m4 = new THREE.Matrix4();
  for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) { m4.makeTranslation(-0.18 + c * 0.04 + r * 0.01, 0.11 + r * 0.012, -0.12 + r * 0.04); keys.setMatrixAt(k++, m4); } tw.add(keys);
  // papers, mug, books on desk
  for (let i = 0; i < 6; i++) { const p = mesh(new THREE.BoxGeometry(0.21, 0.004, 0.29), std(0xece6d6), -0.25 + rand() * 0.15 + (i > 3 ? 0.55 : 0), 0.793 + i * 0.004, 1.85 + rand() * 0.1, cot); p.rotation.y = rand() - 0.5; }
  mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.1, 16), std(0xe8e0d0), 0.55, 0.84, 1.75, cot);
  for (let i = 0; i < 3; i++) mesh(new THREE.BoxGeometry(0.2, 0.05, 0.28), std(bookColors[i]), 0.75, 0.815 + i * 0.05, 2.1, cot).rotation.y = i * 0.2;
  for (let i = 0; i < 5; i++) { const b = mesh(new THREE.IcosahedronGeometry(0.06, 0), std(0xede6d6, { flatShading: true }), -0.6 + rand() * 1.4, 0.05, 0.4 + rand() * 0.9, cot); }
  // desk lamp
  const lampG = new THREE.Group(); lampG.position.set(LAMPDESK.x, 0.79, LAMPDESK.z); cot.add(lampG);
  const brass = std(0xb08a4a, { metalness: 0.8, roughness: 0.35 });
  mesh(new THREE.CylinderGeometry(0.09, 0.1, 0.03, 20), brass, 0, 0.015, 0, lampG);
  mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 8), brass, 0, 0.17, 0, lampG);
  const shade = mesh(new THREE.CylinderGeometry(0.06, 0.15, 0.13, 24, 1, true), std(0x2a5a3a, { side: THREE.DoubleSide, roughness: 0.5 }), 0, 0.34, 0, lampG);
  mesh(new THREE.SphereGeometry(0.04, 12, 10), new THREE.MeshStandardMaterial({ color: 0, emissive: new THREE.Color(1, 0.8, 0.5), emissiveIntensity: 8 }), 0, 0.31, 0, lampG, false, false);
  // bookshelf
  const shelf = new THREE.Group(); shelf.position.set(-3.3, 0, -0.3); shelf.rotation.y = Math.PI / 2; cot.add(shelf);
  mesh(new THREE.BoxGeometry(1.6, 2.0, 0.04), wood, 0, 1.0, -0.17, shelf);
  for (const y of [0.05, 0.6, 1.15, 1.7, 2.0]) mesh(new THREE.BoxGeometry(1.6, 0.04, 0.36), wood, 0, y, 0, shelf);
  for (const sx of [-0.8, 0.8]) mesh(new THREE.BoxGeometry(0.04, 2.0, 0.36), wood, sx, 1.0, 0, shelf);
  for (const y of [0.07, 0.62, 1.17]) { let x = -0.76; while (x < 0.7) { const w = 0.04 + rand() * 0.05, h = 0.3 + rand() * 0.15; mesh(new THREE.BoxGeometry(w, h, 0.24), std(bookColors[Math.floor(rand() * 8)]), x + w / 2, y + 0.02 + h / 2, 0.02, shelf); x += w + 0.005; } }
  // kerosene lantern on shelf top
  const lan = new THREE.Group(); lan.position.set(0.4, 1.74, 0); shelf.add(lan); cot.userData.shelfLantern = lan;
  // stove
  const stove = new THREE.Group(); stove.position.set(-2.6, 0, -1.9); cot.add(stove);
  const ironM = std(0x1b1b1d, { metalness: 0.7, roughness: 0.5 });
  mesh(new THREE.BoxGeometry(0.7, 0.8, 0.6), ironM, 0, 0.45, 0, stove);
  mesh(new THREE.BoxGeometry(0.34, 0.22, 0.02), new THREE.MeshStandardMaterial({ color: 0, emissive: new THREE.Color(1, 0.35, 0.08), emissiveIntensity: 6 }), 0, 0.42, 0.31, stove, false, false);
  mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 12), ironM, 0, 1.9, -0.1, stove);
  mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.18, 16), std(0x6a6a6a, { metalness: 0.8, roughness: 0.3 }), 0.15, 0.94, 0.05, stove);
  // rug, picture, bed, coat
  const rug = mesh(new THREE.CircleGeometry(1.2, 40), std(0x6a2a24, { roughness: 1 }), 0.4, 0.02, -0.2, cot); rug.rotation.x = -Math.PI / 2; rug.scale.y = 0.7;
  const pic = mesh(new THREE.PlaneGeometry(0.5, 0.62), std(0xffffff, { map: pictureTex, roughness: 0.6 }), 0.6, 1.85, -Z + 0.03, cot);
  mesh(new THREE.BoxGeometry(0.6, 0.72, 0.03), std(0x3a2a18), 0.6, 1.85, -Z + 0.012, cot);
  const bed = new THREE.Group(); bed.position.set(2.5, 0, 1.0); cot.add(bed);
  mesh(new THREE.BoxGeometry(1.0, 0.45, 2.0), wood, 0, 0.225, 0, bed); mesh(new THREE.BoxGeometry(0.95, 0.15, 1.95), std(0x5d6e80), 0, 0.5, 0, bed);
  mesh(new THREE.BoxGeometry(0.6, 0.12, 0.35), std(0xe8e2d4), 0, 0.62, 0.75, bed); mesh(new THREE.BoxGeometry(1.0, 0.9, 0.08), wood, 0, 0.45, 1.0, bed);
  const coat = mesh(new THREE.CylinderGeometry(0.12, 0.25, 1.0, 12), std(0x3a3a2a), X - 0.15, 1.5, -0.25, cot);
  mesh(new THREE.SphereGeometry(0.11, 12, 10), std(0x3a3a2a), X - 0.15, 2.05, -0.25, cot);
}
const deskLight = new THREE.PointLight(0xffb870, 0, 9, 2); deskLight.position.copy(cotL(LAMPDESK.x, LAMPDESK.y, LAMPDESK.z)); deskLight.castShadow = true; deskLight.shadow.mapSize.set(1024, 1024); deskLight.shadow.camera.near = 0.1; deskLight.shadow.camera.far = 9; deskLight.shadow.bias = -0.002; scene.add(deskLight);
const stoveLight = new THREE.PointLight(0xff6a20, 0, 6, 2); stoveLight.position.copy(cotL(-2.6, 0.5, -1.4)); scene.add(stoveLight);
const roomFill = new THREE.PointLight(0xffc89a, 0, 8, 2); roomFill.position.copy(cotL(0.5, 2.6, 0)); scene.add(roomFill);
const outGlow = new THREE.PointLight(0xffb060, 0, 14, 2); outGlow.position.copy(cotL(0, 1.8, 3.6)); scene.add(outGlow);
const faceFlash = new THREE.PointLight(0xdfe8ff, 0, 6, 2); faceFlash.position.copy(cotL(0.2, 1.9, 2.4)); scene.add(faceFlash);
// hand lantern (Mark carries in final scene)
const handLantern = new THREE.Group(); scene.add(handLantern);
{ const bm = std(0x2a2a2a, { metalness: 0.7, roughness: 0.4 }); mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.03, 12), bm, 0, 0, 0, handLantern); mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.04, 12), bm, 0, 0.22, 0, handLantern);
  mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.18, 12), lanternMat, 0, 0.11, 0, handLantern, false, false); mesh(new THREE.TorusGeometry(0.06, 0.008, 6, 16), bm, 0, 0.3, 0, handLantern); }
const handLight = new THREE.PointLight(0xffa850, 0, 14, 2); handLantern.add(handLight); handLight.position.y = 0.12;
const handGlow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glowMat(0xffb060)); handGlow.material.uniforms.opacity.value = 0.8; handGlow.frustumCulled = false; handGlow.scale.set(1.6, 1.6, 1); handGlow.position.y = 0.12; handLantern.add(handGlow);

// ---------------------------------------------------------------- village
const villageLights = [];
function makeHouse(x, z, rot, w, d, wallC, roofC, seed) {
  const r = mulberry32(seed); const h = addPadHeight(x, z); const g = new THREE.Group(); g.position.set(x, h, z); g.rotation.y = rot; scene.add(g);
  const HH = 2.6 + r() * 0.8;
  mesh(new THREE.BoxGeometry(w, HH, d), std(wallC, { map: plankTex('#d0c8b8', 'rgba(50,40,30,0.4)') }), 0, HH / 2, 0, g);
  const roofM = std(roofC, { roughness: 0.85 });
  const pitch = 0.65; const rl = (d / 2 + 0.4) / Math.cos(pitch);
  for (const s of [-1, 1]) { const rr = mesh(new THREE.BoxGeometry(w + 0.6, 0.15, rl), roofM, 0, HH + Math.tan(pitch) * d / 4 + 0.05, s * d / 4, g); rr.rotation.x = s * pitch; }
  const gab = new THREE.Shape([new THREE.Vector2(-d / 2, 0), new THREE.Vector2(d / 2, 0), new THREE.Vector2(0, Math.tan(pitch) * d / 2)]);
  for (const s of [-1, 1]) { const gg = mesh(new THREE.ShapeGeometry(gab), std(wallC, { side: THREE.DoubleSide }), s * w / 2, HH, 0, g); gg.rotation.y = Math.PI / 2; }
  mesh(new THREE.BoxGeometry(0.5, 1.6, 0.5), std(0x5a4a44), w * 0.28, HH + 1.1, -d * 0.15, g);
  mesh(new THREE.BoxGeometry(0.9, 1.9, 0.08), std(0x3a2a1e), -w * 0.25, 0.95, d / 2 + 0.03, g);
  const lit = new THREE.MeshStandardMaterial({ color: 0x110a05, emissive: new THREE.Color(1, 0.62, 0.28), emissiveIntensity: 1.4 });
  const unlit = std(0x0a0c10, { roughness: 0.2 }); const frame = std(0xe0d8c8);
  for (const wx of [w * 0.15, w * 0.38]) { const L = r() < 0.75; mesh(new THREE.BoxGeometry(0.85, 0.95, 0.12), frame, wx, 1.6, d / 2 + 0.02, g); mesh(new THREE.BoxGeometry(0.7, 0.8, 0.14), L ? lit : unlit, wx, 1.6, d / 2 + 0.03, g, false, false);
    if (L && villageLights.length < 6 && r() < 0.6) { villageLights.push(g.localToWorld(V3(wx, 1.6, d / 2 + 1.0))); } }
  g.updateMatrixWorld(); return g;
}
function addPadHeight(x, z) { return addPad(x, z, 4.5, 3); }
const villageHouses = [];
{
  const dir = V3(-VIL.x, 0, -VIL.z).normalize(); const perp = V3(dir.z, 0, -dir.x);
  const pal = [[0xd6cdb8, 0x5a2a22], [0xb9c4c8, 0x2e3a48], [0xd8c49a, 0x3e3a34], [0xc8b0a0, 0x4a2a2a], [0xe0d8c8, 0x30383a], [0xbcb69c, 0x50302a]];
  let i = 0;
  for (let s = -26; s <= 14; s += 12) for (const side of [-1, 1]) {
    const c = V3(VIL.x, 0, VIL.z).addScaledVector(dir, s + (side > 0 ? 5 : 0)).addScaledVector(perp, side * 9);
    const rot = Math.atan2(-side * perp.x, -side * perp.z);
    const p = pal[i % pal.length];
    villageHouses.push(makeHouse(c.x, c.z, rot, 5 + (i % 3), 4.2 + (i % 2) * 0.6, p[0], p[1], 100 + i)); i++;
  }
}
// cottage pad was added before terrain; village pads too (all before terrain build? no) -> handled: terrain built after pads? see note
const lampPosts = [];
{
  const dir = V3(-VIL.x, 0, -VIL.z).normalize(); const perp = V3(dir.z, 0, -dir.x);
  for (const s of [-18, 0, 16]) { const c = V3(VIL.x, 0, VIL.z).addScaledVector(dir, s).addScaledVector(perp, 3.5); const h = hgt(c.x, c.z);
    const pm = std(0x1c1c1e, { metalness: 0.6, roughness: 0.5 }); mesh(new THREE.CylinderGeometry(0.07, 0.1, 3.6, 8), pm, c.x, h + 1.8, c.z);
    mesh(new THREE.BoxGeometry(0.35, 0.45, 0.35), new THREE.MeshStandardMaterial({ color: 0x110a05, emissive: new THREE.Color(1, 0.7, 0.35), emissiveIntensity: 1.3 }), c.x, h + 3.7, c.z, scene, false, false);
    mesh(new THREE.ConeGeometry(0.33, 0.25, 4), pm, c.x, h + 4.05, c.z).rotation.y = Math.PI / 4;
    const pl = new THREE.PointLight(0xffb468, 6, 14, 2); pl.position.set(c.x, h + 3.5, c.z); scene.add(pl); lampPosts.push(pl); }
  // sign at end of lane
  const sc = V3(VIL.x, 0, VIL.z).addScaledVector(dir, 30).addScaledVector(perp, -1.5); const sh = hgt(sc.x, sc.z);
  const sg = new THREE.Group(); sg.position.set(sc.x, sh, sc.z); sg.rotation.y = Math.atan2(-dir.x, -dir.z) + 0.25; sg.rotation.z = 0.06; scene.add(sg);
  mesh(new THREE.BoxGeometry(0.12, 2.0, 0.12), std(0x3a2a1a), -0.75, 1.0, 0, sg); mesh(new THREE.BoxGeometry(0.12, 2.0, 0.12), std(0x3a2a1a), 0.75, 1.0, 0, sg);
  mesh(new THREE.BoxGeometry(2.0, 1.0, 0.06), std(0xffffff, { map: signTex }), 0, 1.6, 0.07, sg);
  scene.userData.signPos = V3(sc.x, sh + 1.6, sc.z);
  // fence across the path
  for (let k = -6; k <= 6; k++) { const p = V3(sc.x, 0, sc.z).addScaledVector(perp, k * 0.7).addScaledVector(dir, 1.2); const hh = hgt(p.x, p.z); const pk = mesh(new THREE.BoxGeometry(0.1, 1.1, 0.06), std(0x5a4a38), p.x, hh + 0.5, p.z); pk.rotation.y = Math.atan2(perp.x, perp.z); pk.rotation.z = (rand() - 0.5) * 0.25; }
}
// trees
{
  const tm = std(0x16241a, { roughness: 0.9, flatShading: true }), trk = std(0x2a1e14);
  const spots = [];
  for (let i = 0; i < 70; i++) { const a = rand() * 6.28, r = 18 + rand() * 40; spots.push([VIL.x + Math.cos(a) * r - 10, VIL.z + Math.sin(a) * r - 15]); }
  for (let i = 0; i < 10; i++) { spots.push([COT.x + 8 + rand() * 20, COT.z - 10 - rand() * 20]); }
  for (const [x, z] of spots) { const h = hgt(x, z); if (h < 5) continue; const s = 0.8 + rand() * 0.8; const g = new THREE.Group(); g.position.set(x, h, z); g.scale.setScalar(s); g.rotation.z = 0.08; scene.add(g);
    mesh(new THREE.CylinderGeometry(0.15, 0.22, 1.5, 6), trk, 0, 0.75, 0, g);
    for (let k = 0; k < 3; k++) mesh(new THREE.ConeGeometry(1.6 - k * 0.4, 2.2, 7), tm, 0, 1.8 + k * 1.2, 0, g); }
}
// rebuild terrain heights with all pads applied
{
  const p = tgeo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, hgt(p.getX(i), p.getZ(i))); p.needsUpdate = true; tgeo.computeVertexNormals();
}

// ---------------------------------------------------------------- rain
const RAIN_N = 16000;
const rainU = { uTime: { value: 0 }, uCam: { value: V3() }, uI: { value: 0 }, uWind: { value: V3(-5, 0, -3) }, uCotInv: { value: new THREE.Matrix4().copy(cot.matrixWorld).invert() }, uFlash: skyU.uFlash };
{
  const pos = new Float32Array(RAIN_N * 2 * 3), seed = new Float32Array(RAIN_N * 2 * 4);
  for (let i = 0; i < RAIN_N; i++) { const x = rand(), y = rand(), z = rand(), sp = 0.8 + rand() * 0.4; for (let k = 0; k < 2; k++) { pos.set([x, y, z], (i * 2 + k) * 3); seed.set([sp, k, rand(), 0], (i * 2 + k) * 4); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  const m = new THREE.ShaderMaterial({ uniforms: rainU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uTime; uniform vec3 uCam,uWind; uniform mat4 uCotInv; attribute vec4 aSeed; varying float vA;
      void main(){ vec3 B = vec3(50.,36.,50.); vec3 vel = vec3(uWind.x, -22.*aSeed.x, uWind.z);
        vec3 p = position*B; p += vel*uTime; p = mod(p - (uCam - B*0.5), B) + (uCam - B*0.5);
        p -= vel*0.035*aSeed.y;
        vec3 lp = (uCotInv*vec4(p,1.)).xyz; float inside = step(abs(lp.x),3.9)*step(abs(lp.z),2.9)*step(lp.y,4.8)*step(-0.5,lp.y);
        float d = length(p-uCam); vA = (1.-inside)*smoothstep(0.5,2.,d)*smoothstep(25.,6.,d)*(0.25+0.75*aSeed.z)*(1.-aSeed.y*0.7);
        gl_Position = projectionMatrix*viewMatrix*vec4(p,1.); }`,
    fragmentShader: `uniform float uI,uFlash; varying float vA; void main(){ gl_FragColor = vec4(vec3(0.55,0.62,0.75)*vA*uI*(0.35+uFlash*2.0),1.); }` });
  const rain = new THREE.LineSegments(g, m); rain.frustumCulled = false; scene.add(rain);
}
// sea spray bursts
const SPRAY_N = 2200;
const sprayU = { uTime: { value: 0 }, uI: { value: 0 }, uFlash: skyU.uFlash, uPx: { value: H / 1080 } };
{
  const src = []; for (let a = -0.6; a < 2.4; a += 0.08) { for (let r = 16; r < 34; r += 0.5) { const x = Math.sin(a) * r, z = Math.cos(a) * r * 1.3 - 4; const h = hgt(x, z); if (h > 0 && h < 3) { src.push([x, z]); break; } } }
  const pos = new Float32Array(SPRAY_N * 3), aux = new Float32Array(SPRAY_N * 4);
  for (let i = 0; i < SPRAY_N; i++) { const s = src[Math.floor(rand() * src.length)] || [10, 20]; const grp = Math.floor(rand() * 6);
    pos.set([s[0] + (rand() - 0.5) * 3, 0.5, s[1] + (rand() - 0.5) * 3], i * 3); aux.set([(rand() - 0.5) * 5, 6 + rand() * 12, grp * 0.83 + rand() * 0.3, rand()], i * 4); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aux', new THREE.BufferAttribute(aux, 4));
  const m = new THREE.ShaderMaterial({ uniforms: sprayU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uTime,uPx; attribute vec4 aux; varying float vA;
      void main(){ float per = 5.0; float age = mod(uTime - aux.z, per); vec3 p = position;
        vec3 v = vec3(aux.x, aux.y, aux.x*0.6 + 2.0); p += v*age + vec3(0.,-4.9,0.)*age*age; p.x -= age*age*1.5;
        vA = smoothstep(0.,0.15,age)*smoothstep(2.2,0.6,age)*step(-0.5,p.y);
        vec4 mv = viewMatrix*vec4(p,1.); gl_PointSize = (500.+aux.w*700.)*uPx/(-mv.z); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform float uI,uFlash; varying float vA; void main(){ vec2 c = gl_PointCoord-0.5; float a = pow(smoothstep(0.5,0.0,length(c)),2.); gl_FragColor = vec4(vec3(0.6,0.66,0.72)*a*vA*uI*(0.06+uFlash*0.5),1.); }` });
  const sp = new THREE.Points(g, m); sp.frustumCulled = false; scene.add(sp);
}
// lightning bolt mesh
const boltGroup = new THREE.Group(); scene.add(boltGroup);
const boltMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3.2, 4.5), transparent: true, opacity: 1, fog: false, depthWrite: false, blending: THREE.AdditiveBlending });
function makeBolt(seed, start, len) {
  const r = mulberry32(seed); const pts = [start.clone()]; let p = start.clone();
  const segs = 22; for (let i = 0; i < segs; i++) { p = p.clone().add(V3((r() - 0.5) * 18, -len / segs, (r() - 0.5) * 18)); pts.push(p); }
  const g = new THREE.Group(); const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.9, 5), boltMat));
  for (let b = 0; b < 3; b++) { const i0 = 4 + Math.floor(r() * 12); let q = pts[i0].clone(); const bp = [q.clone()]; for (let i = 0; i < 6; i++) { q = q.clone().add(V3((r() - 0.5) * 20, -len / segs * 0.9, (r() - 0.5) * 20)); bp.push(q); } g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(bp), 40, 0.45, 4), boltMat)); }
  g.visible = false; boltGroup.add(g); return g;
}

// ---------------------------------------------------------------- post
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.7, 0.55, 0.92); composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uFade: { value: 1 }, uSepia: { value: 0 }, uSeed: { value: 0 }, uVig: { value: 0.35 }, uGrain: { value: 0.045 }, uRes: { value: new THREE.Vector2(W, H) }, uFlick: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uFade,uSepia,uSeed,uVig,uGrain,uFlick; uniform vec2 uRes; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){ vec3 c = texture2D(tDiffuse,vUv).rgb;
      float l = dot(c,vec3(0.299,0.587,0.114));
      c = mix(c, vec3(l)*vec3(1.12,0.95,0.72)+vec3(0.04,0.02,0.0), uSepia);
      c = mix(c, c*vec3(0.95,1.0,1.06), 0.5*(1.-uSepia));
      vec2 q = vUv-0.5; q.x *= uRes.x/uRes.y; float v = 1.-dot(q,q)*uVig*(1.+uSepia); c *= v;
      float g = h(vUv*uRes + uSeed*91.7)-0.5; c += g*uGrain*(1.+uSepia);
      c *= 1.0 - uFlick;
      if(uSepia>0.01){ float sc = step(0.9985, h(vec2(floor(vUv.x*uRes.x/3.), uSeed))); c = mix(c, vec3(0.85,0.8,0.7), sc*uSepia*0.5); }
      gl_FragColor = vec4(c*uFade,1.); }`
});
composer.addPass(grade);

// ---------------------------------------------------------------- environments
const ENV = {
  dusk: { top: [0.012, 0.018, 0.045], hor: [0.11, 0.085, 0.12], cloud: [0.07, 0.065, 0.085], moonDir: [-0.5, 0.18, -0.85], moonCol: [1.0, 0.85, 0.8], moonI: 0.6, cov: 0.52, stars: 0.8, fog: [0.07, 0.065, 0.09], fogD: 0.0035, storm: 0.25, hemi: 0.7, moonL: 0.9, exp: 0.95, sunset: 1, deep: [0.004, 0.012, 0.022], foam: 0.25, rain: 0, wind: 1 },
  night: { top: [0.008, 0.014, 0.034], hor: [0.04, 0.06, 0.09], cloud: [0.05, 0.06, 0.08], moonDir: [-0.42, 0.32, -0.85], moonCol: [0.75, 0.82, 1.0], moonI: 1.2, cov: 0.55, stars: 1, fog: [0.035, 0.05, 0.075], fogD: 0.004, storm: 0.3, hemi: 0.75, moonL: 1.4, exp: 1.5, sunset: 0, deep: [0.003, 0.012, 0.02], foam: 0.25, rain: 0, wind: 1.2 },
  past: { top: [0.06, 0.1, 0.24], hor: [1.0, 0.45, 0.18], cloud: [0.55, 0.28, 0.2], moonDir: [-0.5, 0.06, -0.86], moonCol: [1.0, 0.55, 0.25], moonI: 1.2, cov: 0.62, stars: 0, fog: [0.5, 0.3, 0.2], fogD: 0.0028, storm: 0.15, hemi: 1.0, moonL: 2.6, exp: 1.0, sunset: 1, deep: [0.01, 0.02, 0.04], foam: 0.4, rain: 0, wind: 0.6 },
  storm: { top: [0.006, 0.008, 0.014], hor: [0.035, 0.045, 0.055], cloud: [0.035, 0.04, 0.05], moonDir: [-0.42, 0.32, -0.85], moonCol: [0.7, 0.78, 1.0], moonI: 0.25, cov: 0.12, stars: 0, fog: [0.03, 0.038, 0.048], fogD: 0.0075, storm: 1, hemi: 1.1, moonL: 0.8, exp: 1.8, sunset: 0, deep: [0.003, 0.01, 0.014], foam: 0.22, rain: 1, wind: 3 },
};
function lerpEnv(a, b, k) { const o = {}; for (const key in a) { const x = a[key], y = b[key]; o[key] = Array.isArray(x) ? x.map((v, i) => mix(v, y[i], k)) : mix(x, y, k); } return o; }
function applyEnv(e) {
  skyU.uTop.value.set(...e.top); skyU.uHor.value.set(...e.hor); skyU.uCloud.value.set(...e.cloud); skyU.uMoonDir.value.set(...e.moonDir).normalize();
  skyU.uMoonCol.value.set(...e.moonCol); skyU.uMoonI.value = e.moonI; skyU.uCov.value = e.cov; skyU.uStars.value = e.stars; skyU.uSunset.value = e.sunset; skyU.uWind.value = e.wind;
  scene.fog.color.setRGB(...e.fog); scene.fog.density = e.fogD; oceanU.uFogCol.value.setRGB(...e.fog); oceanU.uFogDen.value = e.fogD;
  oceanU.uStorm.value = e.storm; oceanU.uDeep.value.set(...e.deep); oceanU.uFoamI.value = e.foam;
  hemi.intensity = e.hemi; moon.intensity = e.moonL; moon.color.setRGB(...e.moonCol); renderer.toneMappingExposure = e.exp; rainU.uI.value = e.rain; sprayU.uI.value = e.storm > 0.8 ? 1 : 0;
}

// ---------------------------------------------------------------- timeline
const lightningTimes = [39.4, 42.6, 46.1, 61.6, 65.0];
const bolts = { 39.4: makeBolt(11, V3(-60, 260, -140), 255), 42.6: makeBolt(22, V3(70, 260, -160), 255), 61.6: makeBolt(33, V3(-120, 260, -60), 255), 65.0: makeBolt(44, V3(30, 250, 120), 248) };
function flashAt(t) { let f = 0; for (const s of lightningTimes) { const d = t - s; if (d >= 0 && d < 0.9) f = Math.max(f, Math.exp(-d * 9) * (0.7 + 0.3 * Math.sin(d * 60)) + (d > 0.18 && d < 0.5 ? Math.exp(-(d - 0.18) * 12) * 0.8 : 0)); } return f; }

// morse flashes [start,dur]
const SIG = [];
[[48.6, 0.18], [48.95, 0.18], [49.3, 0.18]].forEach(s => SIG.push(s));
[[52.3, 0.2], [52.65, 0.2], [53.0, 0.2], [54.2, 0.55], [54.95, 0.55], [55.7, 0.55], [56.75, 0.2], [57.1, 0.2], [57.45, 0.2]].forEach(s => SIG.push(s));
[[58.6, 0.2], [58.95, 0.2], [59.3, 0.2]].forEach(s => SIG.push(s));
SIG.push([62.6, 1.0]);
function signalAt(t) { let v = 0; for (const [s, d] of SIG) { v = Math.max(v, smooth(s - 0.03, s + 0.03, t) * (1 - smooth(s + d - 0.04, s + d + 0.06, t))); } return v; }

const CUTS = [6, 12, 18.5, 23.3, 31, 38, 44.5, 51, 57.6, 60.4];
const END = 68;
function lerpV(a, b, k) { return a.clone().lerp(b, k); }

function setCam(pos, tgt, fov) { camera.position.copy(pos); camera.lookAt(tgt); camera.fov = fov; camera.updateProjectionMatrix(); }

let lastT = -1;
function renderAt(t) {
  const u = t; // global time
  skyU.uTime.value = u; oceanU.uTime.value = u; rainU.uTime.value = u; sprayU.uTime.value = u;
  grade.uniforms.uSeed.value = (t * 24) % 1000 / 10;
  // defaults
  let env = ENV.night, sepia = 0, lamp = 0, beamI = 0, beamRot = 0, interior = false, shadowC = LH.clone(), shadowR = 40;
  arthur.group.visible = false; mark.group.visible = false; handLantern.visible = false;
  deskLight.intensity = 0; stoveLight.intensity = 0; roomFill.intensity = 0; outGlow.intensity = 3; faceFlash.intensity = 0; handLight.intensity = 0;
  for (const k in bolts) bolts[k].visible = false;
  let noBeam = false, glowBoost = 1; let fl = 0, shake = 0, aimBeamAtCottage = false, flick = 0, waveScale = 1;
  const stove = 2.5 * (0.8 + 0.2 * Math.sin(u * 13) * Math.sin(u * 7.3 + 1));
  const interiorLights = (dl = 4) => { deskLight.intensity = dl * 0.8; stoveLight.intensity = stove; roomFill.intensity = 1.6; };

  if (t < 6) { // title flyover
    env = ENV.dusk; const k = ease(t / 6);
    setCam(lerpV(V3(170, 26, 210), V3(105, 17, 130), k), lerpV(V3(0, 26, 0), V3(0, 22, 0), k), 38);
    shadowR = 60;
  } else if (t < 12) { // wide dark lighthouse
    const k = ease((t - 6) / 6);
    setCam(lerpV(V3(44, 7, 64), V3(33, 8.5, 46), k), lerpV(V3(0, 27, 0), V3(0, 25, 0), k), 36);
  } else if (t < 18.5) { // flashback
    const lt = t - 12; const back = smooth(4.6, 6.0, lt);
    env = lerpEnv(ENV.past, ENV.night, back); sepia = 0.75 * (1 - back);
    flick = sepia > 0 ? 0.05 * Math.abs(Math.sin(u * 37) * Math.sin(u * 23)) * (1 - back) : 0;
    lamp = (1 - smooth(3.4, 4.6, lt)) * 0.6; beamI = lamp * 0.8; beamRot = u * 0.9;
    const a = mix(0.15, 1.05, ease(lt / 6.5)); const R = mix(9.5, 7.5, lt / 6.5);
    setCam(V3(Math.sin(a) * R, LH.y + 17.0 + lt * 0.12, Math.cos(a) * R), V3(0, LH.y + 17.2, 0), 42);
    const aa = 0.75; resetPose(arthur); arthur.group.position.set(Math.sin(aa) * 2.0, LH.y + 16.22, Math.cos(aa) * 2.0); arthur.group.rotation.y = aa;
    arthur.L.sh.rotation.x = -0.55; arthur.R.sh.rotation.x = -0.55; arthur.L.el.rotation.x = -0.5; arthur.R.el.rotation.x = -0.5; arthur.head.rotation.y = 0.3 * Math.sin(lt * 0.6); arthur.head.rotation.x = -0.05;
    setOpacity(arthur, 1 - smooth(3.6, 5.0, lt));
    shadowC = V3(0, 30, 0); shadowR = 8;
  } else if (t < 23.3) { // village
    const lt = (t - 18.5) / 4.8, k = ease(lt);
    const dir = V3(-VIL.x, 0, -VIL.z).normalize(), perp = V3(dir.z, 0, -dir.x);
    const p0 = V3(VIL.x, 0, VIL.z).addScaledVector(dir, -14).addScaledVector(perp, 1), p1 = V3(VIL.x, 0, VIL.z).addScaledVector(dir, 12).addScaledVector(perp, 0.5);
    const p = lerpV(p0, p1, k); p.y = hgt(p.x, p.z) + 2.0;
    setCam(p, V3(0, 26 - k * 2, 0), 40);
    shadowC = V3(VIL.x, 8, VIL.z).addScaledVector(dir, 5); shadowR = 45;
  } else if (t < 31) { // door, tilt up
    const lt = (t - 23.3) / 7.7, k = ease(lt); const da = lh.userData.doorAngle;
    const out = V3(Math.sin(da), 0, Math.cos(da)), side = V3(out.z, 0, -out.x);
    const pos = LH.clone().addScaledVector(out, mix(8.5, 5.0, k)).addScaledVector(side, mix(1.5, -0.8, k)); pos.y = LH.y + mix(1.7, 0.9, k);
    const tg = lerpV(LH.clone().addScaledVector(out, 2.3).add(V3(0, 1.6, 0)), V3(0, LAMP.y + 0.6, 0), ease(smooth(0.25, 0.95, lt)));
    setCam(pos, tg, mix(48, 58, k));
    shake = 0.0; shadowR = 18;
    if (t > 27.5) { /* faint glint inside lantern as knocks happen */ lamp = 0.0; }
  } else if (t < 38) { // interior writing
    const lt = (t - 31) / 7, k = ease(lt); interior = true; interiorLights();
    setCam(cotL(mix(-2.6, -1.7, k), mix(1.75, 1.55, k), mix(-0.9, 0.15, k)), cotL(mix(0.25, 0.1, k), mix(1.3, 1.25, k), 1.95), 44);
    mark.group.visible = true; resetPose(mark); mark.group.position.copy(cotL(0, 0, 1.12)); mark.group.rotation.y = cot.rotation.y;
    mark.hips.position.y = 0.53; mark.hips.rotation.x = 0.12;
    for (const s of ['L', 'R']) { const P = mark[s]; P.th.rotation.x = -1.45; P.kn.rotation.x = 1.5; P.sh.rotation.x = -0.75; P.el.rotation.x = -1.0; P.sh.rotation.z = s === 'L' ? 0.25 : -0.25; P.el.rotation.z = s === 'L' ? -0.35 : 0.35; }
    const ty = Math.max(0, Math.sin(u * 17)) * 0.05, ty2 = Math.max(0, Math.sin(u * 17 + 2.1)) * 0.05; const pause = smooth(4.2, 4.6, (t - 31)) * (1 - smooth(5.6, 6.0, t - 31));
    mark.L.el.rotation.x += ty * (1 - pause); mark.R.el.rotation.x += ty2 * (1 - pause);
    mark.head.rotation.x = 0.18 - pause * 0.15; mark.head.rotation.y = pause * 0.25;
    shadowC = cotL(0, 1, 0); shadowR = 10;
  } else if (t < 44.5) { // storm exterior
    env = ENV.storm; const lt = (t - 38) / 6.5, k = ease(lt);
    setCam(lerpV(V3(30, 4.2, 40), V3(18, 5.2, 34), k), lerpV(V3(0, 20, 0), V3(0, 22, -2), k), 44);
    shake = 0.08; for (const k2 of [39.4, 42.6]) bolts[k2].visible = t > k2 && t < k2 + 0.22 && (t - k2 < 0.07 || t - k2 > 0.12);
    shadowR = 50;
  } else if (t < 51) { // Mark at window
    env = ENV.storm; interior = true; interiorLights(4); const lt = (t - 44.5) / 6.5, k = ease(lt);
    mark.group.visible = true; resetPose(mark); mark.group.position.copy(cotL(-0.15, 0, 1.3)); mark.group.rotation.y = cot.rotation.y + 0.05;
    mark.hips.rotation.x = 0.1; mark.L.sh.rotation.x = -0.5; mark.R.sh.rotation.x = -0.5; mark.L.el.rotation.x = -0.25; mark.R.el.rotation.x = -0.25; mark.L.sh.rotation.z = 0.3; mark.R.sh.rotation.z = -0.3;
    mark.head.rotation.x = -0.15 - smooth(4.0, 4.6, t - 44.5) * 0.08; mark.head.rotation.y = -0.18;
    if (t > 48.4) { mark.hips.rotation.x = 0.1 + smooth(48.6, 49.6, t) * 0.08; }
    const lampW = LAMP.clone();
    setCam(cotL(mix(0.75, 0.55, k), mix(1.85, 1.8, k), mix(0.25, 0.65, k)), lerpV(cotL(-0.1, 1.75, 3), lampW, 0.02 + k * 0.02), mix(48, 42, k));
    aimBeamAtCottage = true; noBeam = true; glowBoost = 0.45; shadowC = cotL(0, 1, 0); shadowR = 10;
  } else if (t < 57.6) { // lantern signals close
    env = ENV.storm; const lt = (t - 51) / 6.6, k = ease(lt);
    const toC = V3(COT.x, 0, COT.z).sub(V3(0, 0, 0)).normalize(); const side = V3(toC.z, 0, -toC.x);
    setCam(V3(0, 0, 0).addScaledVector(toC, mix(30, 24, k)).addScaledVector(side, mix(4, 2, k)).add(V3(0, mix(25, 26.5, k), 0)), V3(0, LAMP.y - 0.8, 0), 30);
    aimBeamAtCottage = true; shake = 0.03; shadowR = 20;
  } else if (t < 60.4) { // face close-up
    env = ENV.storm; interior = true; interiorLights(3.2); const lt = (t - 57.6) / 2.8;
    mark.group.visible = true; resetPose(mark); mark.group.position.copy(cotL(-0.15, 0, 1.3)); mark.group.rotation.y = cot.rotation.y + 0.05;
    mark.hips.rotation.x = 0.16; mark.L.sh.rotation.x = -0.5; mark.R.sh.rotation.x = -0.5; mark.L.el.rotation.x = -0.25; mark.R.el.rotation.x = -0.25; mark.L.sh.rotation.z = 0.3; mark.R.sh.rotation.z = -0.3;
    const turn = smooth(59.6, 60.2, t); mark.head.rotation.y = -0.1 + turn * 0.9; mark.head.rotation.x = -0.18 * (1 - turn);
    setCam(cotL(0.32, 1.7, 2.2), cotL(-0.12, 1.68, 1.35), 32);
    aimBeamAtCottage = true; noBeam = true; shadowC = cotL(0, 1, 0); shadowR = 8;
  } else { // final wide
    env = ENV.storm; const lt = (t - 60.4) / (END - 60.4), k = ease(clamp(lt, 0, 1));
    interiorLights(4); outGlow.intensity = 4;
    const back = V3(COT.x - LH.x, 0, COT.z - LH.z).normalize(), side = V3(back.z, 0, -back.x);
    const cw = V3(COT.x, COT.h, COT.z);
    setCam(cw.clone().addScaledVector(back, mix(16, 19, k)).addScaledVector(side, mix(-7, -9, k)).add(V3(0, mix(5.5, 7.5, k), 0)), lerpV(cw.clone().addScaledVector(back, -18).add(V3(0, 6, 0)), cw.clone().addScaledVector(back, -40).add(V3(0, 9, 0)), k), 46);
    // Mark walking with lantern
    mark.group.visible = true; resetPose(mark);
    const wt = t - 60.6; const start = cotL(4.2, 0, -1.3), dirW = V3(LH.x - start.x, 0, LH.z - start.z).normalize();
    const p = start.clone().addScaledVector(dirW, Math.max(0, wt) * 1.25 + 1.2); p.y = hgt(p.x, p.z);
    mark.group.position.copy(p); mark.group.rotation.y = Math.atan2(dirW.x, dirW.z);
    const ph = wt * 7.5; mark.L.th.rotation.x = Math.sin(ph) * 0.5; mark.R.th.rotation.x = -Math.sin(ph) * 0.5; mark.L.kn.rotation.x = Math.max(0, -Math.sin(ph)) * 0.7; mark.R.kn.rotation.x = Math.max(0, Math.sin(ph)) * 0.7;
    mark.L.sh.rotation.x = -Math.sin(ph) * 0.4; mark.R.sh.rotation.x = -0.25; mark.R.el.rotation.x = -0.1; mark.hips.position.y = 0.95 + Math.abs(Math.sin(ph)) * 0.03; mark.hips.rotation.x = 0.12;
    handLantern.visible = true; mark.group.updateMatrixWorld(true); const hand = mark.R.el.localToWorld(V3(0, -0.38, 0)); handLantern.position.copy(hand).add(V3(0, -0.15, 0)); handLight.intensity = 6;
    aimBeamAtCottage = true; noBeam = true; glowBoost = 1.6; shadowC = cw.clone(); shadowR = 30;
    bolts[61.6].visible = t > 61.6 && t < 61.82 && (t - 61.6 < 0.07 || t - 61.6 > 0.12); bolts[65.0].visible = t > 65.0 && t < 65.22;
  }

  applyEnv(env);
  fl = env.rain > 0 ? flashAt(t) : 0; skyU.uFlash.value = fl; bolt.intensity = fl * 6;
  if (interior) { /* no lightning inside except via window spill */ bolt.intensity = fl * 3; if (fl > 0) faceFlash.intensity = Math.max(faceFlash.intensity, fl * 3); }
  // lighthouse signals
  if (t >= 44.5) { lamp = Math.max(lamp, signalAt(t)); beamI = lamp * 0.6; }
  if (t >= 44.5 && interior) faceFlash.intensity = Math.max(faceFlash.intensity, signalAt(t) * 1.3);
  const lm = lh.userData.lampMat; lm.emissiveIntensity = lamp * 30; lh.userData.glass.emissiveIntensity = lamp * 1.6;
  { const cd = camera.position.distanceTo(LAMP); lampLight.intensity = lamp * mix(25, 2500, smooth(10, 60, cd)); lh.userData.glass.emissiveIntensity = lamp * mix(0.35, 1.6, smooth(10, 60, cd)); lm.emissiveIntensity = lamp * mix(6, 30, smooth(10, 60, cd)); } lampGlow.material.uniforms.opacity.value = lamp; { const gs = clamp(camera.position.distanceTo(LAMP) * 0.09, 1.2, 11) * (0.6 + 0.4 * lamp) * glowBoost; lampGlow.scale.set(gs, gs, 1); }
  oceanU.uLamp.value = lamp; oceanU.uWaveScale.value = waveScale;
  beamMat.uniforms.uI.value = beamI;
  if (aimBeamAtCottage) { beam.rotation.set(0, Math.atan2(-(COT.z - 0), COT.x - 0) , -0.12); beam.userData.b2.visible = false; }
  else { beam.rotation.set(0, beamRot, 0); beam.userData.b2.visible = true; }
  beam.visible = beamI > 0.001 && !noBeam;
  // camera shake
  if (shake > 0) { camera.position.x += (Math.sin(u * 13.1) + Math.sin(u * 7.7)) * shake * 0.5; camera.position.y += (Math.sin(u * 11.3 + 1) + Math.sin(u * 5.3)) * shake * 0.5; }
  // sky follows camera
  sky.position.copy(camera.position); placeOcean(camera.position); rainU.uCam.value.copy(camera.position);
  setShadowFocus(shadowC, shadowR);
  deskLight.castShadow = interior;
  // fade
  let fade = smooth(0, 1.5, t) * (1 - smooth(65.0, 66.2, t));
  for (const c of CUTS) { const d = Math.abs(t - c); if ([38, 44.5, 51, 57.6, 60.4].includes(c)) fade *= mix(0.0, 1, smooth(0.0, 0.08, d)) * 0 + 1; else fade *= smooth(0.0, 0.22, d); }
  grade.uniforms.uFade.value = fade; grade.uniforms.uSepia.value = sepia; grade.uniforms.uFlick.value = flick;
  if (window.__hook) eval(window.__hook);
  composer.render();
}

window.renderAt = (t) => { renderAt(t); return true; };
window.grab = (q = 0.95) => renderer.domElement.toDataURL('image/jpeg', q);
window.OBJ = { lampGlow, beam, lampLight, lh, bloom, handGlow };
window.READY = true;
