
// =====================================================================================
// PART 2 — "Находка на вершине"
// =====================================================================================
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { BokehPass } from 'three/addons/postprocessing/BokehPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const SHOT = window.SHOT_TIMES; // filled by timing.js
const R3 = mulberry32(2024);

// ---------------------------------------------------------------- procedural PBR textures
function pixTex(w, h, fn, srgb) { // fn(x,y) -> [r,g,b] (0..255)
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); const id = g.createImageData(w, h); const d = id.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = fn(x, y); const i = (y * w + x) * 4; d[i] = v[0]; d[i + 1] = v[1]; d[i + 2] = v[2]; d[i + 3] = 255; }
  g.putImageData(id, 0, 0); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; return t;
}
function normalFromHeight(hf, w, h, strength) { // hf: Float32Array
  return pixTex(w, h, (x, y) => {
    const xl = hf[y * w + ((x - 1 + w) % w)], xr = hf[y * w + ((x + 1) % w)], yu = hf[((y - 1 + h) % h) * w + x], yd = hf[((y + 1) % h) * w + x];
    let nx = (xl - xr) * strength, ny = (yd - yu) * strength, nz = 1; const l = Math.hypot(nx, ny, nz);
    return [(nx / l * 0.5 + 0.5) * 255, (ny / l * 0.5 + 0.5) * 255, (nz / l * 0.5 + 0.5) * 255];
  }, false);
}
function pbrSet(w, h, sample, nStrength = 3) { // sample(x,y) -> {c:[r,g,b] 0..1, h:0..1, r:0..1}
  const col = new Float32Array(w * h * 3), hf = new Float32Array(w * h), rf = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const s = sample(x, y); const i = y * w + x; col[i * 3] = s.c[0]; col[i * 3 + 1] = s.c[1]; col[i * 3 + 2] = s.c[2]; hf[i] = s.h; rf[i] = s.r; }
  const map = pixTex(w, h, (x, y) => { const i = (y * w + x) * 3; return [clamp(col[i], 0, 1) * 255, clamp(col[i + 1], 0, 1) * 255, clamp(col[i + 2], 0, 1) * 255]; }, true);
  const normalMap = normalFromHeight(hf, w, h, nStrength);
  const roughnessMap = pixTex(w, h, (x, y) => { const v = clamp(rf[y * w + x], 0, 1) * 255; return [v, v, v]; }, false);
  return { map, normalMap, roughnessMap };
}
const lerp3 = (a, b, k) => [mix(a[0], b[0], k), mix(a[1], b[1], k), mix(a[2], b[2], k)];
function tileable(fx, fy, x, y, w, h, sc, o = 5) { // tileable fbm by blending
  const a = fbm(x * sc, y * sc, o), b = fbm((x - w) * sc, y * sc, o), c = fbm(x * sc, (y - h) * sc, o), d = fbm((x - w) * sc, (y - h) * sc, o);
  const u = x / w, v = y / h; return mix(mix(a, b, u), mix(c, d, u), v);
}

// stone wall (represents 6m x 3m)
const stoneTex = (() => {
  const W2 = 1024, H2 = 512; const rows = []; let yy = 0; const rr = mulberry32(5);
  while (yy < H2) { const hgt2 = 52 + Math.floor(rr() * 20); const blocks = []; let xx = -Math.floor(rr() * 80); while (xx < W2) { const bw = 90 + Math.floor(rr() * 90); blocks.push([xx, bw, rr()]); xx += bw; } rows.push([yy, Math.min(hgt2, H2 - yy), blocks]); yy += hgt2; }
  const cell = new Float32Array(W2 * H2 * 3); // edge dist, tone, id
  for (const [y0, rh, blocks] of rows) for (const [x0, bw, tone] of blocks) for (let y = y0; y < y0 + rh; y++) for (let x = Math.max(0, x0); x < Math.min(W2, x0 + bw); x++) { const e = Math.min(x - x0, x0 + bw - 1 - x, y - y0, y0 + rh - 1 - y); const i = (y * W2 + x) * 3; cell[i] = e; cell[i + 1] = tone; }
  return pbrSet(W2, H2, (x, y) => {
    const i = (y * W2 + x) * 3, e = cell[i], tone = cell[i + 1];
    const n = tileable(0, 0, x, y, W2, H2, 0.02), n2 = fbm(x * 0.15, y * 0.15, 3), damp = smooth(0.25, 1.0, y / H2) * (0.6 + 0.4 * tileable(0, 0, x, y, W2, H2, 0.008, 3));
    const mortar = 1 - smooth(1.5, 5, e + n * 3);
    let c = lerp3([0.52, 0.49, 0.44], [0.62, 0.58, 0.52], tone); c = lerp3(c, [0.4, 0.38, 0.35], smooth(-0.3, 0.5, n)); c = c.map(v => v * (0.9 + n2 * 0.15));
    c = lerp3(c, [0.36, 0.34, 0.3], mortar);
    c = lerp3(c, [0.22, 0.25, 0.18], damp * 0.55); c = lerp3(c, [0.18, 0.17, 0.15], smooth(0.85, 1, y / H2) * 0.5);
    const hh = (1 - mortar) * (0.7 + 0.3 * smooth(0, 12, e)) + n * 0.15 + n2 * 0.05;
    return { c, h: hh, r: mix(0.92, 0.55, damp * 0.7) };
  }, 4);
})();
// cast iron with rust + diamond tread
const ironTex = (() => pbrSet(512, 512, (x, y) => {
  const n = tileable(0, 0, x, y, 512, 512, 0.02), n2 = fbm(x * 0.2, y * 0.2, 3);
  const rust = smooth(0.0, 0.35, n + n2 * 0.15);
  const dx = ((x % 32) - 16) / 16, dy = ((y % 32) - 16) / 16, dia = Math.max(0, 1 - (Math.abs(dx + dy) * 3 + Math.abs(dx - dy) * 0.6));
  let c = lerp3([0.11, 0.105, 0.1], [0.36, 0.17, 0.07], rust); c = c.map(v => v * (0.85 + n2 * 0.3));
  return { c, h: dia * 0.6 + rust * 0.2 + n2 * 0.1, r: mix(0.5, 0.95, rust) };
}, 4))();
// rough rusty metal (no tread)
const rustTex = (() => pbrSet(512, 512, (x, y) => {
  const n = tileable(0, 0, x, y, 512, 512, 0.015), n2 = fbm(x * 0.25, y * 0.25, 3), n3 = fbm(x * 0.06 + 9, y * 0.06, 4);
  const rust = smooth(-0.25, 0.3, n + n3 * 0.3);
  let c = lerp3([0.16, 0.15, 0.14], lerp3([0.42, 0.2, 0.08], [0.25, 0.11, 0.05], smooth(-0.3, 0.3, n2)), rust);
  return { c, h: rust * 0.3 + n2 * 0.25, r: mix(0.45, 0.95, rust) };
}, 3))();
// wood (oak) — grain along x
function woodSet(base, dark, dust = 0, seed = 0) {
  return pbrSet(1024, 512, (x, y) => {
    const plank = Math.floor(y / 128), py = y % 128; const off = plank * 37.3 + seed;
    const warp = fbm(x * 0.004 + off, py * 0.02, 4) * 6;
    const ring = 0.5 + 0.5 * Math.sin((py * 0.12 + warp * 3 + off) * 2.2);
    const fine = fbm(x * 0.08, py * 0.9 + off, 2);
    const gap = 1 - smooth(0, 3, Math.min(py, 127 - py));
    let c = lerp3(base, dark, ring * 0.6 + fine * 0.2); c = c.map(v => v * (0.9 + 0.2 * fbm(off, 3)));
    c = lerp3(c, [0.05, 0.04, 0.03], gap * 0.85);
    const dn = dust * smooth(-0.4, 0.5, fbm(x * 0.01 + seed, y * 0.01, 4)) ;
    c = lerp3(c, [0.55, 0.52, 0.47], dn);
    return { c, h: (1 - gap) * (0.5 + ring * 0.15 + fine * 0.1), r: mix(0.65, 0.95, dn) };
  }, 3);
}
const oakDoor = woodSet([0.36, 0.25, 0.15], [0.18, 0.11, 0.06], 0, 3);
const deskWood = woodSet([0.33, 0.2, 0.11], [0.16, 0.09, 0.05], 0.75, 11);
const floorWood = woodSet([0.3, 0.22, 0.15], [0.14, 0.1, 0.07], 0.55, 23);
// old plaster (top room)
const plasterTex = pbrSet(1024, 512, (x, y) => {
  const n = tileable(0, 0, x, y, 1024, 512, 0.01), n2 = fbm(x * 0.12, y * 0.12, 3);
  const peel = smooth(0.22, 0.26, n);
  let c = lerp3([0.55, 0.6, 0.55], [0.6, 0.55, 0.47], peel); c = c.map(v => v * (0.88 + 0.12 * n2));
  c = lerp3(c, [0.35, 0.33, 0.28], smooth(0.6, 1, y / 512) * 0.4);
  return { c, h: (1 - peel) * 0.4 + n2 * 0.1, r: 0.9 };
}, 3);
// stone floor slabs with puddles
const slabTex = pbrSet(512, 512, (x, y) => {
  const gx = Math.min(x % 128, 127 - x % 128), gy = Math.min(y % 128, 127 - y % 128), e = Math.min(gx, gy);
  const n = tileable(0, 0, x, y, 512, 512, 0.03), n2 = fbm(x * 0.2, y * 0.2, 3), wet = smooth(0.15, 0.3, tileable(0, 0, x + 50, y, 512, 512, 0.01, 4));
  let c = lerp3([0.4, 0.38, 0.35], [0.3, 0.29, 0.27], smooth(-0.3, 0.4, n)); c = c.map(v => v * (0.9 + n2 * 0.15) * (1 - wet * 0.45));
  c = lerp3(c, [0.15, 0.14, 0.13], 1 - smooth(1, 4, e));
  return { c, h: smooth(1, 5, e) * 0.6 + n2 * 0.1, r: mix(0.85, 0.08, wet) };
}, 3);
// brass engraving normal
const brassTex = pbrSet(512, 512, (x, y) => {
  const cx = x / 512 - 0.5, cy = y / 512 - 0.5, r = Math.hypot(cx, cy), a = Math.atan2(cy, cx);
  const border = smooth(0.012, 0.0, Math.abs(Math.max(Math.abs(cx), Math.abs(cy)) - 0.44));
  const rose = smooth(0.01, 0.0, Math.abs(r - 0.18 - 0.05 * Math.sin(a * 8))) + smooth(0.008, 0.0, Math.abs(r - 0.1 - 0.03 * Math.cos(a * 8)));
  const scroll = smooth(0.006, 0, Math.abs(Math.sin(cx * 40 + Math.sin(cy * 20) * 2) * 0.05)) * smooth(0.3, 0.42, Math.max(Math.abs(cx), Math.abs(cy)));
  const eng = clamp(border + rose + scroll * 0.6, 0, 1);
  const n = fbm(x * 0.05, y * 0.05, 3);
  return { c: lerp3([0.93, 0.74, 0.42], [0.55, 0.38, 0.16], eng * 0.8), h: 1 - eng * 0.8 + n * 0.02, r: 0.16 + eng * 0.3 + n * 0.04 };
}, 6);
// fabric (jacket)
const fabricTex = pbrSet(256, 256, (x, y) => { const wv = (Math.sin(x * 1.6) * Math.sin(y * 1.6)) * 0.5 + 0.5; const n = fbm(x * 0.1, y * 0.1, 3); return { c: [0.16 + n * 0.03, 0.17 + n * 0.03, 0.13], h: wv * 0.5 + n * 0.2, r: 0.95 }; }, 2);
// skin
const skinTex = pbrSet(256, 256, (x, y) => { const n = fbm(x * 0.3, y * 0.3, 3), n2 = fbm(x * 0.04, y * 0.04, 3); return { c: [0.78 + n2 * 0.05, 0.55 + n2 * 0.03, 0.44 + n * 0.02], h: n * 0.3, r: 0.55 + n * 0.1 }; }, 1.2);
// cobweb alpha
const webTex = canvasTex(512, 512, (g, w, h) => {
  g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1.1;
  const cx = 30, cy = 30; const rays = 12; const ang = [];
  for (let i = 0; i < rays; i++) { const a = (i / (rays - 1)) * Math.PI / 2 + (R3() - 0.5) * 0.08; ang.push(a); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * 520, cy + Math.sin(a) * 520); g.stroke(); }
  for (let r = 25; r < 480; r += 14 + R3() * 10) { g.beginPath(); for (let i = 0; i < rays; i++) { const rr = r * (0.92 + R3() * 0.16); const x = cx + Math.cos(ang[i]) * rr, y = cy + Math.sin(ang[i]) * rr; i ? g.quadraticCurveTo(cx + Math.cos(ang[i] - 0.06) * rr * 0.93, cy + Math.sin(ang[i] - 0.06) * rr * 0.93, x, y) : g.moveTo(x, y); } g.globalAlpha = 0.35 + R3() * 0.5; g.stroke(); }
  g.globalAlpha = 1;
}, false);

{ const gt = pbrSet(512, 512, (x, y) => { const n = tileable(0, 0, x, y, 512, 512, 0.06, 4), n2 = fbm(x * 0.5, y * 0.5, 2); const v = 0.75 + n * 0.35 + n2 * 0.18; return { c: [v, v * 1.02, v * 0.9], h: n2 * 0.5 + n * 0.3, r: 0.95 }; }, 2);
  for (const t of [gt.map, gt.normalMap]) t.repeat.set(160, 160); terrain.material.map = gt.map; terrain.material.normalMap = gt.normalMap; terrain.material.needsUpdate = true; }
// ---------------------------------------------------------------- newspaper texture
const PAPER_W = 1600, PAPER_H = 2240;
const portrait = document.createElement('canvas'); portrait.width = 360; portrait.height = 440;
const newsCanvas = document.createElement('canvas'); newsCanvas.width = PAPER_W; newsCanvas.height = PAPER_H;
const WORDS = 'в на по за под над из о у к с со при для про через после около рыбаки берег порт шторм ночью утром жители района сообщают что администрация посёлка вновь напоминает прогноз погоды ветер волны лодки вчера сегодня завтра школа библиотека рынок причал улов маяк мыс дорога ремонт глава собрание вечер праздник музей старый новый местный известный городской сельский ноябрь неделя дождь туман холодно тепло солнце'.split(' ');
function fakeText(g, x, y, w, lines, lh, font, rnd, color = '#1d1b19') {
  g.font = font; g.fillStyle = color;
  for (let l = 0; l < lines; l++) { let s = '', line = l === lines - 1 ? 0.6 : 1; while (g.measureText(s).width < w * line - 40) { let wd = WORDS[Math.floor(rnd() * WORDS.length)]; if (s === '' && l % 7 === 0) wd = wd[0].toUpperCase() + wd.slice(1); s += wd + (rnd() < 0.08 ? ', ' : ' '); } s = s.trim() + (rnd() < 0.3 ? '.' : ''); g.fillText(s, x, y + l * lh, w); }
}
function drawNewspaper() {
  const g = newsCanvas.getContext('2d'); const rnd = mulberry32(99);
  g.fillStyle = '#f1ede3'; g.fillRect(0, 0, PAPER_W, PAPER_H);
  for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(120,110,90,${0.03 * rnd()})`; g.fillRect(rnd() * PAPER_W, rnd() * PAPER_H, 2, 2); }
  const M = 90; g.fillStyle = '#141210';
  g.textAlign = 'center'; g.font = 'bold 150px DejaVu Serif'; g.fillText('ВЕСТНИК ПОБЕРЕЖЬЯ', PAPER_W / 2, 230, PAPER_W - 2 * M);
  g.fillRect(M, 270, PAPER_W - 2 * M, 6); g.fillRect(M, 284, PAPER_W - 2 * M, 2);
  g.font = '34px DejaVu Serif'; g.textAlign = 'left'; g.fillText('№ 47 (3128)', M, 330); g.textAlign = 'center'; g.fillText('ЕЖЕДНЕВНАЯ ГАЗЕТА МЫСА СКАЛИСТОГО', PAPER_W / 2, 330);
  g.textAlign = 'right'; g.font = 'bold 40px DejaVu Serif'; g.fillText('18 НОЯБРЯ', PAPER_W - M, 330); g.textAlign = 'left';
  g.fillRect(M, 352, PAPER_W - 2 * M, 2);
  // top story (left)
  g.font = 'bold 72px DejaVu Serif'; g.fillText('Шторм повредил причал', M, 450, 900);
  fakeText(g, M, 510, 860, 13, 44, '30px DejaVu Serif', rnd);
  // right column
  g.fillRect(1010, 380, 3, 640);
  g.font = 'bold 46px DejaVu Serif'; g.fillText('Прогноз на неделю', 1040, 440, 470);
  fakeText(g, 1040, 495, 470, 12, 42, '28px DejaVu Serif', rnd);
  g.fillRect(M, 1040, PAPER_W - 2 * M, 3);
  // THE article
  const ax = M, ay = 1090;
  g.font = 'italic 34px DejaVu Serif'; g.fillStyle = '#3a3530'; g.fillText('ПРОИСШЕСТВИЯ', ax, ay + 10);
  g.fillStyle = '#141210'; g.font = 'bold 96px DejaVu Serif'; g.fillText('ПРОПАЛ МОЛОДОЙ', ax, ay + 120); g.fillText('ПИСАТЕЛЬ', ax, ay + 225);
  g.font = 'italic 40px DejaVu Serif'; g.fillText('Марк не вернулся из старого маяка', ax, ay + 295); g.fillText('на мысе Скалистом', ax, ay + 345);
  g.font = 'bold 44px DejaVu Serif'; g.fillStyle = '#141210'; g.fillText('19 ноября.', ax, ay + 430);
  g.font = '30px DejaVu Serif'; fakeText(g, ax + 275, ay + 430, 560, 1, 44, '30px DejaVu Serif', rnd);
  fakeText(g, ax, ay + 476, 830, 12, 44, '30px DejaVu Serif', rnd);
  // photo
  const px = 980, py = ay + 60; g.drawImage(portrait, px, py, 520, 640);
  g.strokeStyle = '#141210'; g.lineWidth = 3; g.strokeRect(px, py, 520, 640);
  g.font = 'italic 28px DejaVu Serif'; g.fillStyle = '#2a2622'; g.fillText('Марк. Фото из архива редакции', px, py + 680);
  fakeText(g, 980, py + 740, 520, 6, 42, '28px DejaVu Serif', rnd);
  // lower rule + small ads
  g.fillStyle = '#141210'; g.fillRect(M, 2010, PAPER_W - 2 * M, 3);
  g.font = 'bold 34px DejaVu Serif'; g.fillText('ОБЪЯВЛЕНИЯ', M, 2065); fakeText(g, M, 2110, PAPER_W - 2 * M, 2, 40, '26px DejaVu Serif', rnd);
  // red marker (hand drawn, two loops)
  g.strokeStyle = 'rgba(205,20,20,0.88)'; g.lineCap = 'round'; g.lineJoin = 'round';
  for (let loop = 0; loop < 2; loop++) {
    g.lineWidth = 15 - loop * 4; g.beginPath();
    const cx = 800, cy = ay + 420, rx = 760 + loop * 18, ry = 480 - loop * 12;
    for (let k = 0; k <= 120; k++) { const a = -2.6 + k / 120 * (Math.PI * 2 + 0.5) + loop * 0.3; const wob = 1 + 0.025 * Math.sin(a * 3 + loop) + 0.012 * Math.sin(a * 7); const x = cx + Math.cos(a) * rx * wob, y = cy + Math.sin(a) * ry * wob + a * 6; k ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.stroke();
  }
  // marker underline on the date
  g.lineWidth = 9; g.beginPath(); g.moveTo(ax - 5, ay + 445); g.bezierCurveTo(ax + 80, ay + 452, ax + 160, ay + 440, ax + 225, ay + 448); g.stroke();
  const t = new THREE.CanvasTexture(newsCanvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 16; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; return t;
}

// ---------------------------------------------------------------- interior scene
const inner = new THREE.Scene();
inner.fog = new THREE.FogExp2(0x1b1e22, 0.015);
inner.background = new THREE.Color(0x050506);
const IR = y => 2.75 - y * 0.035; // interior radius by height
const TOP = 13.6; // top room floor
const P = (o) => new THREE.MeshPhysicalMaterial(o);
const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex.map, normalMap: stoneTex.normalMap, roughnessMap: stoneTex.roughnessMap, normalScale: new THREE.Vector2(1.4, 1.4), side: THREE.BackSide });
for (const t of [stoneTex.map, stoneTex.normalMap, stoneTex.roughnessMap]) t.repeat.set(3, 1);
{ // shaft wall (lower ring has the door opening at phi=0 -> +z)
  const mk = (y0, y1, n, ph0, phL, uScale) => { const prof = []; for (let i = 0; i <= n; i++) { const y = mix(y0, y1, i / n); prof.push(new THREE.Vector2(IR(y) + 0.02, y)); }
    const g = new THREE.LatheGeometry(prof, 72, ph0, phL); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * uScale, mix(y0, y1, uv.getY(i)) / 3);
    const m = new THREE.Mesh(g, stoneMat); m.receiveShadow = true; inner.add(m); };
  const hw = 0.23; mk(0, 2.35, 4, hw, Math.PI * 2 - 2 * hw, (Math.PI * 2 - 2 * hw) / (Math.PI * 2)); mk(2.35, TOP, 26, 0, Math.PI * 2, 1);
  const jm = new THREE.MeshStandardMaterial({ map: stoneTex.map, normalMap: stoneTex.normalMap, roughness: 0.9, color: 0xaaaaaa });
  for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.12, 2.35, 0.7), jm, s * 0.66, 1.175, IR(0) + 0.3, inner);
  mesh(new THREE.BoxGeometry(1.45, 0.14, 0.7), jm, 0, 2.3, IR(0) + 0.3, inner);
  mesh(new THREE.BoxGeometry(1.3, 0.06, 0.7), jm, 0, 0.01, IR(0) + 0.3, inner);
}
const slabMat = new THREE.MeshStandardMaterial({ map: slabTex.map, normalMap: slabTex.normalMap, roughnessMap: slabTex.roughnessMap });
for (const t of [slabTex.map, slabTex.normalMap, slabTex.roughnessMap]) t.repeat.set(2.5, 2.5);
{ const f = mesh(new THREE.CircleGeometry(IR(0) + 0.05, 64), slabMat, 0, 0, 0, inner, false, true); f.rotation.x = -Math.PI / 2; }
// door (inside view) facing direction angle DA (local: door on wall at angle 0 -> +z)
const DOOR_A = 0; const doorPos = V3(Math.sin(DOOR_A) * IR(0), 0, Math.cos(DOOR_A) * IR(0));
const doorMat = new THREE.MeshStandardMaterial({ map: oakDoor.map, normalMap: oakDoor.normalMap, roughnessMap: oakDoor.roughnessMap, normalScale: new THREE.Vector2(1.5, 1.5) });
const ironMat = new THREE.MeshStandardMaterial({ map: rustTex.map, normalMap: rustTex.normalMap, roughnessMap: rustTex.roughnessMap, metalness: 0.75 });
function buildDoor(parent, withLock) {
  const g = new THREE.Group(); parent.add(g);
  const leaf = new THREE.Group(); g.add(leaf); // hinge at x=-0.55
  const slab = mesh(new RoundedBoxGeometry(1.1, 2.2, 0.09, 2, 0.01), doorMat, 0.55, 1.1, 0, leaf);
  for (const y of [0.35, 1.1, 1.85]) { mesh(new THREE.BoxGeometry(1.0, 0.09, 0.025), ironMat, 0.52, y, 0.058, leaf); for (let k = 0; k < 6; k++) mesh(new THREE.SphereGeometry(0.014, 8, 6), ironMat, 0.1 + k * 0.17, y, 0.072, leaf); }
  mesh(new THREE.TorusGeometry(0.07, 0.012, 8, 20), ironMat, 0.95, 1.12, 0.09, leaf);
  return { g, leaf };
}
const innerDoor = buildDoor(inner, false);
innerDoor.g.position.copy(doorPos).setLength(IR(0) - 0.05); innerDoor.g.position.x -= 0.55; innerDoor.g.rotation.y = Math.PI; innerDoor.g.position.x += 1.1; // facing inside
// bright doorway (outside light)
const outsideMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.75, 1.9) });
const doorway = mesh(new THREE.PlaneGeometry(1.3, 2.3), outsideMat, 0, 1.15, IR(0) + 0.62, inner, false, false); doorway.rotation.y = Math.PI;
const doorFrame = mesh(new THREE.BoxGeometry(1.4, 2.5, 0.35), new THREE.MeshStandardMaterial({ map: stoneTex.map, normalMap: stoneTex.normalMap, roughness: 0.9 }), 0, 1.25, IR(0) + 0.1, inner);
doorFrame.visible = false;
// silhouette Mark at door (for entering shot) uses mark model clone later

// ----- staircase
const STEPS = 62, RISE = TOP / STEPS, STEP_A = Math.PI * 2 / 15;
const stepMat = new THREE.MeshStandardMaterial({ map: ironTex.map, normalMap: ironTex.normalMap, roughnessMap: ironTex.roughnessMap, metalness: 0.7, normalScale: new THREE.Vector2(1.2, 1.2) });
const stairStart = 0.1; // angle of first step (door at 1.5PI is passed above 2.6m)
const stepAngle = i => stairStart + i * STEP_A;
const stepY = i => (i + 1) * RISE;
{
  for (let i = 0; i < STEPS; i++) {
    const y = stepY(i), ro = IR(y) - 0.04, ri = IR(y) * 0.46;
    const sh = new THREE.Shape(); const a0 = -STEP_A * 0.62, a1 = STEP_A * 0.62;
    sh.moveTo(Math.cos(a0) * ri, Math.sin(a0) * ri); sh.lineTo(Math.cos(a0) * ro, Math.sin(a0) * ro);
    for (let k = 1; k <= 6; k++) { const a = mix(a0, a1, k / 6); sh.lineTo(Math.cos(a) * ro, Math.sin(a) * ro); }
    sh.lineTo(Math.cos(a1) * ri, Math.sin(a1) * ri);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.045, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 1 });
    geo.rotateX(-Math.PI / 2); // shape xy -> xz (y up=depth)
    const uv = geo.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * 0.6, uv.getY(k) * 0.6);
    const s = mesh(geo, stepMat, 0, y - 0.045, 0, inner); s.rotation.y = stepAngle(i);
    // bracket under step
    const bl = ro - ri; const br = mesh(new THREE.BoxGeometry(bl, 0.06, 0.03), stepMat, 0, y - 0.09, 0, inner); br.geometry.translate(bl / 2 + ri, 0, 0); br.rotation.y = stepAngle(i); br.rotation.z = 0;
  }
  // inner stringer + handrail with balusters along the open well
  const ip = [], ipr = []; for (let k = 0; k <= 700; k++) { const f = k / 700 * (STEPS - 1); const a = stepAngle(f), y = stepY(f), r = IR(y) * 0.46 + 0.02; ip.push(V3(Math.cos(a) * r, y - 0.08, -Math.sin(a) * r)); ipr.push(V3(Math.cos(a) * r, y + 0.92, -Math.sin(a) * r)); }
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ip), 1000, 0.05, 6), stepMat, 0, 0, 0, inner);
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ipr), 1000, 0.025, 8), new THREE.MeshStandardMaterial({ color: 0x5a3a20, metalness: 0.5, roughness: 0.4 }), 0, 0, 0, inner);
  for (let i = 0; i < STEPS; i++) { const a = stepAngle(i), y = stepY(i), r = IR(y) * 0.46 + 0.03; mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.92, 6), stepMat, Math.cos(a) * r, y + 0.46, -Math.sin(a) * r, inner); }
  // handrail on wall side (helix) with brackets
  const pts = []; for (let k = 0; k <= 600; k++) { const f = k / 600 * (STEPS - 1); const a = stepAngle(f), y = stepY(f) + 0.95, r = IR(y) - 0.16; pts.push(V3(Math.cos(a) * r, y, -Math.sin(a) * r)); }
  const railC = new THREE.CatmullRomCurve3(pts);
  mesh(new THREE.TubeGeometry(railC, 900, 0.022, 8), new THREE.MeshStandardMaterial({ color: 0x6b4a2a, metalness: 0.6, roughness: 0.35 }), 0, 0, 0, inner);
  for (let i = 0; i < STEPS; i += 3) { const a = stepAngle(i), y = stepY(i) + 0.95, r = IR(y) - 0.08; const b = mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.16, 6), stepMat, Math.cos(a) * r, y, -Math.sin(a) * r, inner); b.rotation.z = Math.PI / 2; b.rotation.y = a; }
}
const helixPos = (f, dy = 0, dr = 0) => { const a = stepAngle(f), y = stepY(f) + dy, r = IR(y) * 0.73 + dr; return V3(Math.cos(a) * r, y, -Math.sin(a) * r); };

// ----- shaft windows + beams
const beams = []; // {o, d, r, len, I}
const beamMatI = (I) => new THREE.ShaderMaterial({
  uniforms: { uI: { value: I }, uTime: { value: 0 }, uCol: { value: V3(1.0, 0.95, 0.85) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  vertexShader: `varying vec3 vW; varying vec3 vN; varying float vL; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); vL = uv.y; gl_Position=projectionMatrix*viewMatrix*w; }`,
  fragmentShader: NOISE_GLSL + `uniform float uI,uTime; uniform vec3 uCol; varying vec3 vW; varying vec3 vN; varying float vL;
    void main(){ vec3 V = normalize(cameraPosition - vW); float f = pow(abs(dot(normalize(vN),V)),2.2);
      float n = fbm4(vW.xz*1.5 + vW.y*0.7 + vec2(uTime*0.05, uTime*0.03))*0.8 + 0.4;
      float a = f*n*smoothstep(0.,0.15,vL)*smoothstep(1.,0.55,vL)*uI*smoothstep(0.3,1.5,length(cameraPosition-vW));
      gl_FragColor = vec4(uCol*a,1.); }` });
function addBeam(scene, origin, dir, r0, r1, len, I, light = true, lightI = 30) {
  const g = new THREE.CylinderGeometry(r0, r1, len, 32, 1, true); g.translate(0, -len / 2, 0); g.rotateX(-Math.PI / 2); // along +z? -> origin at 0, extends to -z... fix below
  const m = new THREE.Mesh(g, beamMatI(I)); m.position.copy(origin); m.lookAt(origin.clone().add(dir)); scene.add(m); m.frustumCulled = false;
  const b = { o: origin.clone(), d: dir.clone().normalize(), r: (r0 + r1) / 2, len, mesh: m };
  if (light) { const sl = new THREE.SpotLight(0xfff1dc, lightI, len * 1.6, Math.atan((r1 - r0) / len + r0 / len * 1.2) + 0.12, 0.6, 1.5); sl.position.copy(origin); sl.target.position.copy(origin.clone().addScaledVector(dir, len)); sl.castShadow = true; sl.shadow.mapSize.set(1024, 1024); sl.shadow.bias = -0.0008; sl.shadow.normalBias = 0.02; scene.add(sl); scene.add(sl.target); b.light = sl; }
  beams.push(b); return b;
}
function addWindow(scene, a, y, w = 0.42, h = 0.9) { // narrow arched window in shaft
  const r = IR(y); const g = new THREE.Group(); g.position.set(Math.cos(a) * (r + 0.01), y, -Math.sin(a) * (r + 0.01)); g.lookAt(0, y, 0); scene.add(g);
  const sh = new THREE.Shape(); sh.moveTo(-w / 2, -h / 2); sh.lineTo(w / 2, -h / 2); sh.lineTo(w / 2, h / 2 - w / 2); sh.absarc(0, h / 2 - w / 2, w / 2, 0, Math.PI, false); sh.lineTo(-w / 2, -h / 2);
  mesh(new THREE.ShapeGeometry(sh, 16), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 1.4, 1.5) }), 0, 0, 0.02, g, false, false);
  const fr = new THREE.Shape(); fr.moveTo(-w / 2 - 0.12, -h / 2 - 0.1); fr.lineTo(w / 2 + 0.12, -h / 2 - 0.1); fr.lineTo(w / 2 + 0.12, h / 2 + 0.06); fr.lineTo(-w / 2 - 0.12, h / 2 + 0.06); fr.lineTo(-w / 2 - 0.12, -h / 2 - 0.1); fr.holes.push(sh);
  const fg = new THREE.ExtrudeGeometry(fr, { depth: 0.2, bevelEnabled: false }); fg.translate(0, 0, 0.0);
  mesh(fg, new THREE.MeshStandardMaterial({ map: stoneTex.map, normalMap: stoneTex.normalMap, roughness: 0.9, color: 0xbbbbbb }), 0, 0, 0, g);
  mesh(new THREE.BoxGeometry(0.03, h, 0.03), ironMat, 0, 0, 0.06, g); mesh(new THREE.BoxGeometry(w, 0.03, 0.03), ironMat, 0, 0.05, 0.06, g);
  return g;
}
for (const [a, y] of [[0.4, 3.2], [2.6, 6.4], [4.6, 9.6], [0.9, 12.2]]) {
  addWindow(inner, a, y);
  const o = V3(Math.cos(a) * (IR(y) + 0.3), y + 0.1, -Math.sin(a) * (IR(y) + 0.3)); const d = V3(-Math.cos(a + 0.5), -0.55, Math.sin(a + 0.5));
  addBeam(inner, o, d, 0.22, 0.6, 5.5, 0.22, true, 20);
}
// doorway beam
const doorBeam = addBeam(inner, V3(0.0, 2.4, IR(0) + 0.4), V3(0.15, -0.42, -1), 0.55, 1.1, 6.0, 0.0, true, 0);

// ----- props on ground floor
const barrelMat = new THREE.MeshStandardMaterial({ map: rustTex.map, normalMap: rustTex.normalMap, roughnessMap: rustTex.roughnessMap, metalness: 0.6, color: 0x7a8a7a });
function barrel(x, z, s = 1, tilt = 0) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.z = tilt; g.scale.setScalar(s); inner.add(g);
  const prof = []; for (let i = 0; i <= 16; i++) { const y = i / 16 * 0.88; prof.push(new THREE.Vector2(0.29 + 0.02 * Math.sin(Math.PI * i / 16) + ((i === 3 || i === 13) ? 0.012 : 0), y)); }
  mesh(new THREE.LatheGeometry(prof, 32), barrelMat, 0, 0, 0, g); const lid = mesh(new THREE.CircleGeometry(0.29, 32), barrelMat, 0, 0.88, 0, g); lid.rotation.x = -Math.PI / 2; return g; }
barrel(-1.3, 1.6); barrel(-1.85, 1.0, 0.95); barrel(-1.55, 0.4, 0.9);
{ const b = barrel(1.6, 1.4, 0.9); b.rotation.x = Math.PI / 2; b.position.y = 0.27; b.rotation.z = 0.6; }
// oil cans
const canMat = new THREE.MeshStandardMaterial({ color: 0x6a2216, metalness: 0.5, roughness: 0.6, map: rustTex.map });
for (const [x, z, r] of [[-0.9, 2.0, 0.2], [-0.75, 2.12, 1.2], [1.0, 2.05, 0.5]]) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = r; inner.add(g); mesh(new RoundedBoxGeometry(0.22, 0.3, 0.12, 2, 0.015), canMat, 0, 0.15, 0, g); mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.06, 10), canMat, 0.06, 0.33, 0, g); mesh(new THREE.TorusGeometry(0.05, 0.01, 6, 14, Math.PI), ironMat, -0.03, 0.31, 0, g); }
// crates
const crateMat = new THREE.MeshStandardMaterial({ map: oakDoor.map, normalMap: oakDoor.normalMap, roughnessMap: oakDoor.roughnessMap, color: 0xb8a58a });
mesh(new RoundedBoxGeometry(0.7, 0.55, 0.6, 2, 0.02), crateMat, 1.7, 0.275, -0.7, inner).rotation.y = 0.4;
mesh(new RoundedBoxGeometry(0.5, 0.4, 0.45, 2, 0.02), crateMat, 1.62, 0.75, -0.62, inner).rotation.y = 0.25;
// coiled rope
{ const pts = []; for (let k = 0; k < 900; k++) { const a = k / 900 * Math.PI * 2 * 7, r = 0.22 + (k % 130) / 130 * 0.0 + Math.floor(k / 130) * 0.0; pts.push(V3(Math.cos(a) * (0.18 + 0.02 * Math.sin(k * 0.05)), 0.025 + k / 900 * 0.18, Math.sin(a) * (0.2))); }
  const rope = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 1400, 0.022, 8), new THREE.MeshStandardMaterial({ color: 0x7a6548, roughness: 1, normalMap: fabricTex.normalMap }), 1.05, 0, -1.65, inner); }
// tools on wall: lantern + hook
{ const g = new THREE.Group(); g.position.set(-2.3, 1.6, -1.2); g.lookAt(0, 1.6, 0); inner.add(g); mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.3, 12), ironMat, 0, 0, 0.12, g); mesh(new THREE.TorusGeometry(0.08, 0.01, 6, 16), ironMat, 0, 0.22, 0.12, g); }
// puddle (reflective)
{ const p = mesh(new THREE.CircleGeometry(0.6, 40), new THREE.MeshStandardMaterial({ color: 0x0a0b0c, roughness: 0.02, metalness: 0.0, transparent: true, opacity: 0.7 }), 0.4, 0.004, 0.9, inner, false, true); p.rotation.x = -Math.PI / 2; p.scale.set(1.4, 0.8, 1); }
// cobwebs helper
const webMat = new THREE.MeshStandardMaterial({ alphaMap: webTex, transparent: true, color: 0xd8d4cc, side: THREE.DoubleSide, depthWrite: false, roughness: 1 });
function web(scene, pos, rot, s) { const m = mesh(new THREE.PlaneGeometry(1, 1), webMat, pos.x, pos.y, pos.z, scene, false, false); m.rotation.set(rot[0], rot[1], rot[2]); m.scale.setScalar(s); return m; }
web(inner, V3(-1.7, 2.6, 1.6), [0, 2.2, 0], 1.1); web(inner, V3(1.9, 2.8, -1.0), [0.3, -1.0, 0], 0.9);

// ----- mechanism (around y 10.8, against wall at angle MECH_A)
const MECH_A = 3.6, MECH_Y = 10.4;
const mech = new THREE.Group(); { mech.position.set(0, MECH_Y, 0); mech.rotation.y = 0.6; inner.add(mech); const bm = new THREE.MeshStandardMaterial({ map: rustTex.map, normalMap: rustTex.normalMap, metalness: 0.7, roughness: 0.7 }); for (const s of [-1, 1]) mesh(new THREE.BoxGeometry(0.1, 0.12, IR(MECH_Y) * 2), bm, s * 0.6, -0.7, 0, mech); }
const brassOld = new THREE.MeshStandardMaterial({ color: 0x8a6a35, metalness: 0.9, roughness: 0.45, map: rustTex.map });
const brassNew = new THREE.MeshStandardMaterial({ color: 0xd8a85a, metalness: 1.0, roughness: 0.22 });
function gearGeo(r, teeth, th = 0.04, hole = 0.03, spokes = 5) {
  const sh = new THREE.Shape(); const td = r * 0.12;
  for (let i = 0; i < teeth; i++) { const a0 = i / teeth * Math.PI * 2, a1 = (i + 0.25) / teeth * Math.PI * 2, a2 = (i + 0.5) / teeth * Math.PI * 2, a3 = (i + 0.75) / teeth * Math.PI * 2;
    const p = (a, rr) => [Math.cos(a) * rr, Math.sin(a) * rr]; const q = [p(a0, r - td), p(a1, r + td * 0.9), p(a2, r + td * 0.9), p(a3, r - td)];
    if (i === 0) sh.moveTo(...q[0]); else sh.lineTo(...q[0]); sh.lineTo(...q[1]); sh.lineTo(...q[2]); sh.lineTo(...q[3]); }
  sh.closePath();
  const hp = new THREE.Path(); hp.absarc(0, 0, hole, 0, Math.PI * 2, true); sh.holes.push(hp);
  if (spokes) for (let s = 0; s < spokes; s++) { const a = s / spokes * Math.PI * 2 + Math.PI / spokes; const h = new THREE.Path(); const r0 = r * 0.32, r1 = r * 0.72, w = Math.PI / spokes * 0.62;
    h.absarc(0, 0, r1, a + w, a - w, true); h.absarc(0, 0, r0, a - w * 0.7, a + w * 0.7, false); h.closePath(); sh.holes.push(h); }
  const g = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 1, curveSegments: 6 }); g.translate(0, 0, -th / 2); return g;
}
const gears = [];
{ // frame
  const fm = new THREE.MeshStandardMaterial({ color: 0x2a3a2e, metalness: 0.6, roughness: 0.55, map: rustTex.map, normalMap: rustTex.normalMap });
  for (const x of [-0.55, 0.55]) { mesh(new THREE.BoxGeometry(0.06, 1.3, 0.06), fm, x, 0, -0.18, mech); mesh(new THREE.BoxGeometry(0.06, 1.3, 0.06), fm, x, 0, 0.18, mech); }
  mesh(new THREE.BoxGeometry(1.2, 0.06, 0.42), fm, 0, 0.65, 0, mech); mesh(new THREE.BoxGeometry(1.2, 0.06, 0.42), fm, 0, -0.65, 0, mech);
  mesh(new THREE.BoxGeometry(1.16, 0.9, 0.03), fm, 0, 0, -0.2, mech);
  const spec = [[0.34, 36, -0.2, 0.1, brassOld, 0.0], [0.17, 18, 0.26, 0.2, brassOld, 0.0], [0.24, 26, 0.12, -0.26, rustyGearMat(), 0], [0.12, 14, 0.36, -0.12, brassNew, 1], [0.2, 22, -0.35, -0.3, rustyGearMat(), 0], [0.09, 10, -0.05, 0.35, brassOld, 0]];
  for (const [r, n, x, y, mat, alive] of spec) { const gm = mesh(gearGeo(r, n), mat, x, y, 0.0, mech); gm.userData = { n, alive, r }; gears.push(gm); mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 10).rotateX(Math.PI / 2), fm, x, y, 0, mech); }
  // drum + cable + weight going down
  const drum = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.3, 24).rotateZ(Math.PI / 2), brassOld, 0, -0.45, 0.05, mech);
  mesh(new THREE.CylinderGeometry(0.004, 0.004, 3.5, 4), ironMat, 0.1, -2.2, 0.15, mech);
  mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.4, 16), ironMat, 0.1, -3.9, 0.15, mech);
  // governor
  const gov = new THREE.Group(); gov.position.set(0.0, 0.85, 0.05); mech.add(gov); mech.userData.gov = gov;
  mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.4, 8), brassOld, 0, 0, 0, gov);
  for (const s of [-1, 1]) { const arm = mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 6), brassOld, s * 0.05, 0.05, 0, gov); arm.rotation.z = -s * 0.7; mesh(new THREE.SphereGeometry(0.035, 14, 10), brassOld, s * 0.1, 0.0, 0, gov); }
  web(mech, V3(0.45, 0.45, 0.25), [0, 0.2, 0.3], 0.45); web(mech, V3(-0.5, -0.3, 0.25), [0, -0.3, 2.0], 0.4); const ml = new THREE.PointLight(0xdde6f0, 12, 5, 2); ml.position.set(0.3, 0.9, 1.2); mech.add(ml);
}
function rustyGearMat() { return new THREE.MeshStandardMaterial({ map: rustTex.map, normalMap: rustTex.normalMap, roughnessMap: rustTex.roughnessMap, metalness: 0.7, color: 0xa08070 }); }
// landing platform for mechanism


// ----- top room
const top = new THREE.Group(); top.position.y = TOP; inner.add(top);
const TR = IR(TOP);
const plasterMat = new THREE.MeshStandardMaterial({ map: plasterTex.map, normalMap: plasterTex.normalMap, roughness: 0.92, side: THREE.BackSide });
for (const t of [plasterTex.map, plasterTex.normalMap]) t.repeat.set(2, 1);
{
  const wall = mesh(new THREE.CylinderGeometry(TR + 0.02, TR + 0.02, 3.0, 64, 1, true), plasterMat, 0, 1.5, 0, top, false, true);
  const fl = new THREE.Shape(); fl.absarc(0, 0, TR + 0.03, 0, Math.PI * 2, false); const hole = new THREE.Path(); hole.absarc(0, 0, 0.95, stepAngle(STEPS - 4) - 0.2, stepAngle(STEPS - 1) + 0.25, false); hole.lineTo(0, 0); hole.closePath(); fl.holes.push(hole);
  const fg = new THREE.ShapeGeometry(fl, 48); fg.rotateX(-Math.PI / 2); const uv = fg.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) * 0.4, uv.getY(k) * 0.4);
  const fmat = new THREE.MeshStandardMaterial({ map: floorWood.map, normalMap: floorWood.normalMap, roughnessMap: floorWood.roughnessMap, side: THREE.DoubleSide });
  mesh(fg, fmat, 0, 0, 0, top, true, true);
  const ce = mesh(new THREE.CircleGeometry(TR + 0.03, 48), new THREE.MeshStandardMaterial({ color: 0x4a443c, roughness: 0.95 }), 0, 3.0, 0, top); ce.rotation.x = Math.PI / 2;
  for (let k = 0; k < 4; k++) { const b = mesh(new THREE.BoxGeometry(2 * TR, 0.14, 0.12), new THREE.MeshStandardMaterial({ map: deskWood.map, color: 0x6a5a48 }), 0, 2.92, (k - 1.5) * 0.9, top); }
}
// windows in top room (4) — bright overcast + one sun beam
const TOPWIN = [0.2, 1.75, 3.3, 4.85];
for (const a of TOPWIN) {
  const g = new THREE.Group(); g.position.set(Math.cos(a) * (TR + 0.01), 1.55, -Math.sin(a) * (TR + 0.01)); g.lookAt(0, 1.55, 0); top.add(g);
  mesh(new THREE.PlaneGeometry(0.75, 1.05), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.15, 1.22, 1.3) }), 0, 0, 0.015, g, false, false);
  const frM = new THREE.MeshStandardMaterial({ color: 0xcfc6b4, roughness: 0.7, map: plasterTex.map });
  for (const [w, h, x, y] of [[0.9, 0.07, 0, 0.55], [0.9, 0.09, 0, -0.55], [0.07, 1.15, 0.42, 0], [0.07, 1.15, -0.42, 0], [0.04, 1.05, 0, 0], [0.75, 0.04, 0, 0.12]]) mesh(new THREE.BoxGeometry(w, h, 0.08), frM, x, y, 0.05, g);
  mesh(new THREE.BoxGeometry(0.95, 0.05, 0.22), frM, 0, -0.6, 0.12, g);
  const dirt = canvasTex(256, 256, (c, w, h) => { c.clearRect(0, 0, w, h); for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(90,85,70,${0.08 * R3()})`; c.beginPath(); c.arc(R3() * w, h * (0.4 + 0.6 * R3()), 6 + R3() * 30, 0, 7); c.fill(); } }, false);
  mesh(new THREE.PlaneGeometry(0.75, 1.05), new THREE.MeshStandardMaterial({ alphaMap: dirt, transparent: true, color: 0x6a6656, roughness: 0.4, depthWrite: false }), 0, 0, 0.03, g, false, false);
}
const deskA = 0.2; // desk under first window
const deskPos = V3(Math.cos(deskA) * (TR - 0.45), TOP, -Math.sin(deskA) * (TR - 0.45));
const desk = new THREE.Group(); desk.position.copy(deskPos); desk.lookAt(0, TOP, 0); inner.add(desk);
const deskMat = new THREE.MeshStandardMaterial({ map: deskWood.map, normalMap: deskWood.normalMap, roughnessMap: deskWood.roughnessMap });
{
  mesh(new RoundedBoxGeometry(1.3, 0.05, 0.7, 2, 0.01), deskMat, 0, 0.78, 0, desk);
  for (const [x, z] of [[-0.6, -0.3], [0.6, -0.3], [-0.6, 0.3], [0.6, 0.3]]) mesh(new THREE.CylinderGeometry(0.03, 0.025, 0.76, 10), deskMat, x, 0.38, z, desk);
  mesh(new RoundedBoxGeometry(0.42, 0.18, 0.62, 2, 0.01), deskMat, 0.42, 0.65, 0, desk);
  // logbook open
  const pageTex = canvasTex(512, 360, (g, w, h) => { g.fillStyle = '#d9cfb6'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(60,40,20,0.12)'; for (let i = 0; i < 60; i++) { g.beginPath(); g.arc(R3() * w, R3() * h, 3 + R3() * 20, 0, 7); g.fill(); } g.strokeStyle = '#3a2a1a'; g.lineWidth = 1.2; for (let l = 0; l < 14; l++) for (const ox of [20, 270]) { g.beginPath(); let x = ox; const y = 40 + l * 22; g.moveTo(x, y); while (x < ox + 210) { x += 4; g.lineTo(x, y + Math.sin(x * 0.9 + l) * 3 * R3()); } g.stroke(); } g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(w / 2 - 2, 0, 4, h); });
  const book = mesh(new THREE.BoxGeometry(0.46, 0.025, 0.32), new THREE.MeshStandardMaterial({ color: 0x3a1f14, roughness: 0.8 }), -0.35, 0.815, 0.08, desk); book.rotation.y = 0.25;
  const pages = mesh(new THREE.PlaneGeometry(0.44, 0.3), new THREE.MeshStandardMaterial({ map: pageTex, roughness: 0.9 }), -0.35, 0.83, 0.08, desk); pages.rotation.x = -Math.PI / 2; pages.rotation.z = 0.25;
  // inkwell, pen, oil lamp
  mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.05, 16), new THREE.MeshPhysicalMaterial({ color: 0x0a1a10, roughness: 0.1, transmission: 0, clearcoat: 1 }), -0.05, 0.83, -0.18, desk);
  const pen = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.16, 8), new THREE.MeshStandardMaterial({ color: 0x111111 }), -0.15, 0.81, 0.18, desk); pen.rotation.z = Math.PI / 2; pen.rotation.y = 0.6;
  const lamp = new THREE.Group(); lamp.position.set(0.5, 0.805, -0.2); desk.add(lamp);
  mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.08, 20), brassOld, 0, 0.04, 0, lamp);
  const chimney = new THREE.LatheGeometry([0.02, 0.05, 0.06, 0.05, 0.03, 0.03].map((r, i) => new THREE.Vector2(r, 0.08 + i * 0.04)), 24);
  mesh(chimney, new THREE.MeshPhysicalMaterial({ color: 0xc8c0a8, roughness: 0.15, transparent: true, opacity: 0.35, depthWrite: false }), 0, 0, 0, lamp);
  // Arthur's cap on desk corner (callback)
  const cap = new THREE.Group(); cap.position.set(-0.52, 0.81, -0.22); cap.rotation.set(0.05, 0.6, 0.02); desk.add(cap);
  mesh(new THREE.CylinderGeometry(0.115, 0.11, 0.07, 28), new THREE.MeshStandardMaterial({ color: 0x1a2032, roughness: 0.9, normalMap: fabricTex.normalMap }), 0, 0.035, 0, cap);
  mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.02, 28), new THREE.MeshStandardMaterial({ color: 0x1a2032, roughness: 0.9 }), 0, 0.075, 0.01, cap);
  const vis = mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.008, 20, 1, false, -Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: 0x080808, roughness: 0.3 }), 0, 0.01, 0.07, cap); vis.scale.z = 0.9;
  mesh(new THREE.TorusGeometry(0.112, 0.006, 6, 30).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xb08a40, metalness: 0.9, roughness: 0.4 }), 0, 0.045, 0, cap);
}
// chair
{ const ch = new THREE.Group(); ch.position.set(-0.1, 0, -0.75); ch.rotation.y = 0.3; desk.add(ch); for (const [x, z] of [[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]]) mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.46, 8), deskMat, x, 0.23, z, ch); mesh(new RoundedBoxGeometry(0.46, 0.04, 0.46, 2, 0.01), deskMat, 0, 0.47, 0, ch); mesh(new RoundedBoxGeometry(0.46, 0.5, 0.03, 2, 0.01), deskMat, 0, 0.74, -0.22, ch); }
// wall clock and barometer, shelf with logbooks
{
  const a = 1.0; const g = new THREE.Group(); g.position.set(Math.cos(a) * (TR - 0.03), TOP + 2.0, -Math.sin(a) * (TR - 0.03)); g.lookAt(0, TOP + 2.0, 0); inner.add(g);
  const face = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#e8e0cc'; c.beginPath(); c.arc(128, 128, 126, 0, 7); c.fill(); c.fillStyle = '#1a1a1a'; c.font = 'bold 26px DejaVu Serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; const rn = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI']; for (let i = 0; i < 12; i++) { const an = i / 12 * Math.PI * 2 - Math.PI / 2; c.fillText(rn[i], 128 + Math.cos(an) * 100, 128 + Math.sin(an) * 100); } });
  mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 40).rotateX(Math.PI / 2), brassOld, 0, 0, 0.0, g);
  const f = mesh(new THREE.CircleGeometry(0.17, 40), new THREE.MeshStandardMaterial({ map: face, roughness: 0.6 }), 0, 0, 0.032, g);
  const hh = new THREE.Group(); hh.position.z = 0.036; g.add(hh); const hm = new THREE.Group(); hm.position.z = 0.04; g.add(hm); const hs = new THREE.Group(); hs.position.z = 0.044; g.add(hs);
  mesh(new THREE.BoxGeometry(0.012, 0.09, 0.004), new THREE.MeshStandardMaterial({ color: 0x111111 }), 0, 0.04, 0, hh); mesh(new THREE.BoxGeometry(0.008, 0.13, 0.004), new THREE.MeshStandardMaterial({ color: 0x111111 }), 0, 0.06, 0, hm); mesh(new THREE.BoxGeometry(0.003, 0.14, 0.003), new THREE.MeshStandardMaterial({ color: 0x8a1a1a }), 0, 0.05, 0, hs);
  inner.userData.clock = { hh, hm, hs };
  const s2 = new THREE.Group(); const a2 = 2.4; s2.position.set(Math.cos(a2) * (TR - 0.2), TOP + 1.2, -Math.sin(a2) * (TR - 0.2)); s2.lookAt(0, TOP + 1.2, 0); inner.add(s2);
  mesh(new THREE.BoxGeometry(0.9, 0.03, 0.28), deskMat, 0, 0, 0, s2); mesh(new THREE.BoxGeometry(0.9, 0.03, 0.28), deskMat, 0, 0.4, 0, s2);
  let x = -0.42; while (x < 0.4) { const w = 0.05 + R3() * 0.04, h = 0.25 + R3() * 0.08; mesh(new THREE.BoxGeometry(w, h, 0.2), new THREE.MeshStandardMaterial({ color: bookColors[Math.floor(R3() * 8)], roughness: 0.85 }), x + w / 2, 0.015 + h / 2, 0, s2); x += w + 0.006; }
  web(inner, V3(Math.cos(2.0) * (TR - 0.3), TOP + 2.75, -Math.sin(2.0) * (TR - 0.3)), [0.5, 2.0, 0], 0.9);
  web(inner, V3(Math.cos(5.6) * (TR - 0.3), TOP + 2.75, -Math.sin(5.6) * (TR - 0.3)), [0.5, -0.8, 0], 1.0);
  // coat hook with Arthur's old coat
  const a3 = 3.9; const coat = mesh(new THREE.CylinderGeometry(0.12, 0.3, 1.1, 16, 1, true), new THREE.MeshStandardMaterial({ color: 0x1c2333, roughness: 0.95, normalMap: fabricTex.normalMap, side: THREE.DoubleSide }), Math.cos(a3) * (TR - 0.25), TOP + 1.45, -Math.sin(a3) * (TR - 0.25), inner); coat.scale.z = 0.6; coat.lookAt(0, TOP + 1.45, 0);
}
// sun beam onto desk through first window
const sunBeam = addBeam(inner, V3(Math.cos(deskA - 0.25) * (TR + 0.6), TOP + 2.4, -Math.sin(deskA - 0.25) * (TR + 0.6)), V3(-Math.cos(deskA - 0.05), -0.9, Math.sin(deskA - 0.05)).normalize(), 0.3, 0.55, 3.0, 0.35, true, 40);
const roomFill2 = new THREE.PointLight(0xc8d4e8, 2.5, 6, 2); roomFill2.position.set(0, TOP + 2.3, 0); inner.add(roomFill2);
const hemiIn = new THREE.HemisphereLight(0x9aa8bb, 0x2a241e, 0.35); inner.add(hemiIn);
const groundFill = new THREE.PointLight(0xc0ccdd, 0, 8, 2); groundFill.position.set(0, 2.5, 1.2); inner.add(groundFill);

// ----- brass box
const box = new THREE.Group(); box.position.set(0.05, 0.805, 0.05); box.rotation.y = -0.15; desk.add(box);
const brassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: brassTex.map, normalMap: brassTex.normalMap, roughnessMap: brassTex.roughnessMap, metalness: 1, roughness: 1, clearcoat: 0.4, clearcoatRoughness: 0.1, envMapIntensity: 1.6 });
const velvet = new THREE.MeshPhysicalMaterial({ color: 0x5a0d14, roughness: 1, sheen: 1, sheenColor: new THREE.Color(0.8, 0.2, 0.25), sheenRoughness: 0.5 });
const BW = 0.34, BD = 0.24, BH = 0.11;
{
  // walls of box
  const t = 0.012;
  mesh(new RoundedBoxGeometry(BW, 0.012, BD, 2, 0.004), brassMat, 0, 0.006, 0, box);
  for (const s of [-1, 1]) { mesh(new RoundedBoxGeometry(BW, BH, t, 2, 0.004), brassMat, 0, BH / 2, s * (BD / 2 - t / 2), box); mesh(new RoundedBoxGeometry(t, BH, BD, 2, 0.004), brassMat, s * (BW / 2 - t / 2), BH / 2, 0, box); }
  mesh(new THREE.BoxGeometry(BW - 2 * t, 0.004, BD - 2 * t), velvet, 0, 0.015, 0, box);
  for (const s of [-1, 1]) for (const s2 of [-1, 1]) mesh(new THREE.SphereGeometry(0.014, 12, 10), brassMat, s * (BW / 2 - 0.01), -0.004, s2 * (BD / 2 - 0.01), box);
  // clasp front
  mesh(new RoundedBoxGeometry(0.04, 0.035, 0.008, 2, 0.003), brassMat, 0, BH - 0.015, BD / 2 + 0.003, box);
}
const lid = new THREE.Group(); lid.position.set(0, BH, -BD / 2); box.add(lid);
{ mesh(new RoundedBoxGeometry(BW + 0.008, 0.028, BD + 0.008, 3, 0.008), brassMat, 0, 0.014, BD / 2, lid); const ins = mesh(new THREE.PlaneGeometry(BW - 0.03, BD - 0.03), velvet, 0, -0.0005, BD / 2, lid); ins.rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.006, 0.006, BW * 0.8, 10).rotateZ(Math.PI / 2), brassMat, 0, 0, -0.002, lid); }
// newspaper (two halves, hinged on fold) — sits folded in box
const NEWS_W = 0.4, NEWS_H = 0.56; // full sheet (unfolded) dims (scaled down tabloid)
const newsTex = { value: null };
const news = new THREE.Group(); inner.add(news); const newsRoot = new THREE.Group(); news.add(newsRoot);
const newsMat = new THREE.MeshStandardMaterial({ roughness: 0.85, side: THREE.DoubleSide });
const newsBack = new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: 0.9, side: THREE.DoubleSide });
function halfPaper(v0, v1) { const g = new THREE.PlaneGeometry(NEWS_W, NEWS_H / 2, 20, 14); const uv = g.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setY(k, mix(v0, v1, uv.getY(k)));
  const p = g.attributes.position; for (let k = 0; k < p.count; k++) { const x = p.getX(k), y = p.getY(k); p.setZ(k, 0.004 * Math.sin(x * 9 + y * 4) + 0.006 * Math.sin(y * 6)); } g.computeVertexNormals(); return g; }
// lower half fixed (v 0..0.5), upper half hinged at its bottom edge (v 0.5..1)
const newsLower = new THREE.Group(); newsRoot.add(newsLower);
const lowerM = new THREE.Mesh(halfPaper(0, 0.5), newsMat); lowerM.position.y = -NEWS_H / 4; newsLower.add(lowerM); lowerM.castShadow = true; lowerM.receiveShadow = true;
const newsUpper = new THREE.Group(); newsRoot.add(newsUpper);
const upperM = new THREE.Mesh(halfPaper(0.5, 1), newsMat); upperM.position.y = NEWS_H / 4; newsUpper.add(upperM); upperM.castShadow = true; upperM.receiveShadow = true;

// ----- hands (first-person close-ups)
const skinMat = new THREE.MeshPhysicalMaterial({ map: skinTex.map, normalMap: skinTex.normalMap, roughness: 0.55, sheen: 0.3, sheenColor: new THREE.Color(1, 0.6, 0.5) });
const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x2c3326, map: fabricTex.map, normalMap: fabricTex.normalMap, roughness: 1 });
function makeHand(sign) { // sign: +1 right, -1 left. fingers +y, palm normal +z, thumb toward +x*sign
  const g = new THREE.Group(); const H = { group: g, fingers: [] };
  const palm = mesh(new RoundedBoxGeometry(0.084, 0.095, 0.03, 3, 0.012), skinMat, 0, 0, 0, g);
  const fl = [[0.046, 0.03, 0.022], [0.05, 0.032, 0.023], [0.047, 0.03, 0.021], [0.038, 0.024, 0.019]];
  for (let i = 0; i < 4; i++) { let parent = g; const x = (-0.03 + i * 0.02) * sign; const root = new THREE.Group(); root.position.set(x, 0.045 - Math.abs(i - 1.5) * 0.004, 0); g.add(root); parent = root; const segs = [];
    for (let s = 0; s < 3; s++) { const r = 0.0095 - s * 0.0012 - (i === 3 ? 0.001 : 0); const seg = new THREE.Group(); if (s > 0) seg.position.y = fl[i][s - 1]; parent.add(seg); mesh(new THREE.CapsuleGeometry(r, fl[i][s] - r, 4, 10), skinMat, 0, fl[i][s] / 2, 0, seg); segs.push(seg); parent = seg; }
    const nail = mesh(new THREE.SphereGeometry(0.007, 10, 6), new THREE.MeshStandardMaterial({ color: 0xe8b8a8, roughness: 0.3 }), 0, fl[i][2] * 0.6, -0.006, segs[2]); nail.scale.set(1, 1.4, 0.35);
    H.fingers.push(segs); }
  const th = new THREE.Group(); th.position.set(0.04 * sign, -0.025, 0.006); th.rotation.z = -0.9 * sign; th.rotation.y = 0.5 * sign; g.add(th); let p = th; const tsegs = [];
  for (let s = 0; s < 2; s++) { const seg = new THREE.Group(); if (s) seg.position.y = 0.036; p.add(seg); mesh(new THREE.CapsuleGeometry(0.011 - s * 0.001, 0.03, 4, 10), skinMat, 0, 0.018, 0, seg); tsegs.push(seg); p = seg; }
  H.thumb = tsegs;
  mesh(new THREE.CylinderGeometry(0.03, 0.033, 0.12, 16), skinMat, 0, -0.1, 0, g); // wrist
  mesh(new THREE.CylinderGeometry(0.048, 0.055, 0.35, 20), sleeveMat, 0, -0.3, 0, g); mesh(new THREE.TorusGeometry(0.047, 0.01, 8, 20).rotateX(Math.PI / 2), sleeveMat, 0, -0.13, 0, g);
  g.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return H;
}
function curl(H, c, thumb = c) { for (const f of H.fingers) { f[0].rotation.x = c * 1.1; f[1].rotation.x = c * 1.3; f[2].rotation.x = c * 0.9; } H.thumb[0].rotation.x = thumb * 0.5; H.thumb[1].rotation.x = thumb * 0.7; }
function placeHand(H, pos, xDir, zDir) { const X = xDir.clone().normalize(), Z = zDir.clone().normalize(); const Y = Z.clone().cross(X).normalize(); const Z2 = X.clone().cross(Y); const m = new THREE.Matrix4().makeBasis(X, Y, Z2); H.group.quaternion.setFromRotationMatrix(m); H.group.position.copy(pos); }
const handR = makeHand(1), handL = makeHand(-1);

// ----- dust motes (inner)
const DUST_N = 9000;
const dustU = { uTime: { value: 0 }, uPx: { value: H / 1080 }, uB: { value: [] } };
const dustB = []; for (let i = 0; i < 4; i++) dustB.push({ o: new THREE.Vector3(), d: new THREE.Vector3(0, -1, 0), r: 0, len: 0, I: 0 });
{
  const pos = new Float32Array(DUST_N * 3), aux = new Float32Array(DUST_N * 4);
  for (let i = 0; i < DUST_N; i++) { const a = R3() * Math.PI * 2, y = R3() * (TOP + 3), r = Math.sqrt(R3()) * (IR(y) - 0.1); pos.set([Math.cos(a) * r, y, Math.sin(a) * r], i * 3); aux.set([R3(), R3(), R3(), R3()], i * 4); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aux', new THREE.BufferAttribute(aux, 4));
  const m = new THREE.ShaderMaterial({ uniforms: { uTime: dustU.uTime, uPx: dustU.uPx, uBO: { value: dustB.map(b => b.o) }, uBD: { value: dustB.map(b => b.d) }, uBR: { value: [0, 0, 0, 0] }, uBL: { value: [0, 0, 0, 0] }, uBI: { value: [0, 0, 0, 0] } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `uniform float uTime,uPx; uniform vec3 uBO[4]; uniform vec3 uBD[4]; uniform float uBR[4]; uniform float uBL[4]; uniform float uBI[4]; attribute vec4 aux; varying float vA;
      void main(){ vec3 p = position + vec3(sin(uTime*0.13*(0.5+aux.x)+aux.y*30.)*0.25, sin(uTime*0.07+aux.z*20.)*0.15 - mod(uTime*0.01*aux.w,0.4), cos(uTime*0.11*(0.5+aux.y)+aux.x*30.)*0.25);
        float lit = 0.04;
        for(int i=0;i<4;i++){ vec3 q = p - uBO[i]; float t = dot(q,uBD[i]); vec3 c = q - uBD[i]*t; float rr = uBR[i]*(0.6+0.8*clamp(t/max(uBL[i],0.01),0.,1.)); lit += uBI[i]*smoothstep(rr, rr*0.5, length(c))*step(0.,t)*step(t,uBL[i]); }
        vec4 mv = viewMatrix*vec4(p,1.); float d = -mv.z; vA = lit*smoothstep(0.15,0.6,d)*(0.5+0.5*sin(uTime*2.+aux.x*40.));
        gl_PointSize = (3.0+aux.w*5.0)*uPx*clamp(2.2/d,0.3,4.0); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying float vA; void main(){ vec2 c=gl_PointCoord-0.5; float a = smoothstep(0.5,0.,length(c)); gl_FragColor = vec4(vec3(1.,0.95,0.85)*a*vA,1.); }` });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; inner.add(pts); inner.userData.dustMat = m;
}
function setDustBeams(list) { const m = inner.userData.dustMat; for (let i = 0; i < 4; i++) { const b = list[i]; if (b) { m.uniforms.uBO.value[i].copy(b.o); m.uniforms.uBD.value[i].copy(b.d); m.uniforms.uBR.value[i] = b.r * 1.3; m.uniforms.uBL.value[i] = b.len; m.uniforms.uBI.value[i] = b.dustI ?? 1; } else m.uniforms.uBI.value[i] = 0; } }

// ----- Mark (body, for climbing/door shots) — reuse makePerson with darker clothes
const mark2 = makePerson({ skin: 0xd9a58a, top: 0x2c3326, pants: 0x23272e, hair: 0x2a1a10, sweaterCollar: false });
inner.add(mark2.group); mark2.group.visible = false;
const markOut = makePerson({ skin: 0xd9a58a, top: 0x2c3326, pants: 0x23272e, hair: 0x2a1a10 }); scene.add(markOut.group); markOut.group.visible = false;
// crowbar
function makeCrowbar() { const g = new THREE.Group(); const pts = [V3(0, 0, 0), V3(0, 0.75, 0), V3(0.01, 0.8, 0.02), V3(0.03, 0.84, 0.06), V3(0.05, 0.86, 0.1)];
  const paint = new THREE.MeshStandardMaterial({ color: 0x7a1410, roughness: 0.45, metalness: 0.3, map: rustTex.map });
  const tube = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.012, 8), paint, 0, 0, 0, g);
  const hook = []; for (let k = 0; k <= 12; k++) { const a = k / 12 * Math.PI * 1.1; hook.push(V3(0, -Math.sin(a) * 0.05, 0.05 - Math.cos(a) * 0.05)); }
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hook), 20, 0.012, 8), paint, 0, 0, 0, g);
  return g; }
const crowbar = makeCrowbar(); scene.add(crowbar); crowbar.visible = false;

// ----- exterior detailed door + padlock in world
const extDoor = new THREE.Group(); scene.add(extDoor);
{ const da = lh.userData.doorAngle; const c = LH.clone().add(V3(Math.sin(da) * 2.42, 0.3, Math.cos(da) * 2.42)); extDoor.position.copy(c); extDoor.rotation.y = da; }
const extD = buildDoor(extDoor, true); extD.g.position.x = -0.55;
const hasp = new THREE.Group(); hasp.position.set(0.5, 1.12, 0.06); extDoor.add(hasp);
const padlock = new THREE.Group(); hasp.add(padlock);
{
  mesh(new THREE.BoxGeometry(0.18, 0.05, 0.012), ironMat, 0.06, 0, 0.0, hasp);
  for (const x of [0.0, 0.1]) mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.02, 8).rotateX(Math.PI / 2), ironMat, x, 0, 0.01, hasp);
  mesh(new THREE.TorusGeometry(0.018, 0.005, 6, 12), ironMat, 0.16, 0, 0.015, hasp).rotation.y = Math.PI / 2;
  const lockMat = new THREE.MeshStandardMaterial({ map: rustTex.map, normalMap: rustTex.normalMap, roughnessMap: rustTex.roughnessMap, metalness: 0.8, color: 0x9a8a70 });
  mesh(new RoundedBoxGeometry(0.07, 0.065, 0.028, 3, 0.008), lockMat, 0.16, -0.06, 0.02, padlock);
  const sh = mesh(new THREE.TorusGeometry(0.022, 0.006, 8, 16, Math.PI), new THREE.MeshStandardMaterial({ color: 0x5a5550, metalness: 0.9, roughness: 0.4 }), 0.16, -0.025, 0.02, padlock);
  mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.004, 8).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x050505 }), 0.16, -0.07, 0.035, padlock);
}
// dust puff (exterior)
const PUFF_N = 600; const puffU = { uTime: { value: 0 }, uT0: { value: 1e9 }, uO: { value: new THREE.Vector3() }, uPx: { value: H / 1080 } };
{ const pos = new Float32Array(PUFF_N * 3), aux = new Float32Array(PUFF_N * 4); for (let i = 0; i < PUFF_N; i++) { const v = V3(R3() - 0.5, R3() - 0.3, R3() * 0.8).normalize().multiplyScalar(0.2 + R3() * 0.6); pos.set([v.x, v.y, v.z], i * 3); aux.set([R3(), R3(), R3(), R3()], i * 4); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aux', new THREE.BufferAttribute(aux, 4));
  const m = new THREE.ShaderMaterial({ uniforms: puffU, transparent: true, depthWrite: false,
    vertexShader: `uniform float uTime,uT0,uPx; uniform vec3 uO; attribute vec4 aux; varying float vA; void main(){ float a = uTime-uT0; vec3 p = uO + position*(1.-exp(-a*3.))*0.6 + vec3(0.,-0.4*a*a*aux.x,0.); vA = step(0.,a)*smoothstep(1.6,0.1,a)*0.5; vec4 mv = viewMatrix*vec4(p,1.); gl_PointSize = (30.+aux.w*60.)*uPx*(1.+a)/(-mv.z); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying float vA; void main(){ vec2 c=gl_PointCoord-0.5; float a = smoothstep(0.5,0.,length(c)); gl_FragColor = vec4(vec3(0.55,0.5,0.45), a*vA*0.35); }` });
  const p = new THREE.Points(g, m); p.frustumCulled = false; scene.add(p); }
// gulls
const gulls = []; { const gm = new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.8, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) { const g = new THREE.Group(); const body = mesh(new THREE.CapsuleGeometry(0.12, 0.35, 4, 8).rotateX(Math.PI / 2), gm, 0, 0, 0, g, false, false); const wl = new THREE.Group(), wr = new THREE.Group(); g.add(wl, wr);
    const wg = new THREE.PlaneGeometry(0.9, 0.28); wg.translate(0.45, 0, 0); wg.rotateX(-Math.PI / 2); mesh(wg, gm, 0, 0, 0, wl, false, false); const wg2 = wg.clone(); wg2.scale(-1, 1, 1); mesh(wg2, gm, 0, 0, 0, wr, false, false);
    g.userData = { wl, wr, ph: R3() * 6, rad: 25 + R3() * 30, h: 30 + R3() * 18, sp: 0.15 + R3() * 0.1, c: V3(-10 + R3() * 30, 0, 20 + R3() * 30) }; scene.add(g); gulls.push(g); } }

// ---------------------------------------------------------------- environment maps
const pmrem = new THREE.PMREMGenerator(renderer);
const roomEnv = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
let innerEnv = null;
function buildInnerEnv() { // render interior from the box position
  const saved = inner.position.clone(); const bp = new THREE.Vector3(); box.getWorldPosition(bp); bp.y += 0.3;
  inner.position.sub(bp); inner.updateMatrixWorld(true); innerEnv = pmrem.fromScene(inner, 0.02, 0.05, 50).texture; inner.position.copy(saved); inner.updateMatrixWorld(true);
  brassMat.envMap = innerEnv; brassMat.needsUpdate = true;
}
inner.environment = roomEnv;
inner.traverse(o => { if (o.isMesh && o.material && 'envMapIntensity' in o.material && o.material !== brassMat) o.material.envMapIntensity = 0.25; });

// ---------------------------------------------------------------- portrait for newspaper (render Mark's head)
function makePortrait() {
  const ps = new THREE.Scene(); ps.background = new THREE.Color(0x9a9a9a);
  const pm = makePerson({ skin: 0xd9a58a, top: 0x2c3326, pants: 0x23272e, hair: 0x2a1a10, sweaterCollar: true }); ps.add(pm.group); resetPose(pm); pm.head.rotation.y = 0.25; pm.head.rotation.x = -0.05;
  ps.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2)); const dl = new THREE.DirectionalLight(0xffffff, 2.5); dl.position.set(1, 2, 2); ps.add(dl);
  const pc = new THREE.PerspectiveCamera(22, 360 / 440, 0.1, 10); pc.position.set(0.35, 1.72, 1.35); pc.lookAt(0, 1.62, 0);
  const rt = new THREE.WebGLRenderTarget(360, 440); const oldTM = renderer.toneMapping; renderer.setRenderTarget(rt); renderer.render(ps, pc); renderer.setRenderTarget(null);
  const buf = new Uint8Array(360 * 440 * 4); renderer.readRenderTargetPixels(rt, 0, 0, 360, 440, buf);
  const g = portrait.getContext('2d'); const id = g.createImageData(360, 440); const rr = mulberry32(5);
  for (let y = 0; y < 440; y++) for (let x = 0; x < 360; x++) { const i = ((439 - y) * 360 + x) * 4, o = (y * 360 + x) * 4; let l = (buf[i] * 0.3 + buf[i + 1] * 0.59 + buf[i + 2] * 0.11) / 255; l = Math.pow(l, 0.8) * 1.15; // halftone
    const cell = 5, cx = (x % cell) - cell / 2 + 0.5, cy = (y % cell) - cell / 2 + 0.5, dot = Math.hypot(cx, cy) / (cell * 0.7); const v = dot < (1 - l) ? 25 : 235 - rr() * 15; id.data[o] = v; id.data[o + 1] = v * 0.98; id.data[o + 2] = v * 0.94; id.data[o + 3] = 255; }
  g.putImageData(id, 0, 0);
}
makePortrait();
newsMat.map = drawNewspaper(); newsMat.needsUpdate = true;

// ---------------------------------------------------------------- post (part 2)
const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
const renderPass = new RenderPass(scene, camera); composer.addPass(renderPass);
const bokeh = new BokehPass(scene, camera, { focus: 1.0, aperture: 0.002, maxblur: 0.008 }); composer.addPass(bokeh);
const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.45, 0.6, 0.95); composer.addPass(bloom);
composer.addPass(new OutputPass());
const grade = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uFade: { value: 1 }, uSeed: { value: 0 }, uVig: { value: 0.4 }, uGrain: { value: 0.03 }, uRes: { value: new THREE.Vector2(W, H) }, uTint: { value: new THREE.Vector3(1, 1, 1) }, uCA: { value: 0.0015 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uFade,uSeed,uVig,uGrain,uCA; uniform vec2 uRes; uniform vec3 uTint; varying vec2 vUv;
    float h(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
    void main(){ vec2 d = (vUv-0.5)*uCA; vec3 c = vec3(texture2D(tDiffuse,vUv+d).r, texture2D(tDiffuse,vUv).g, texture2D(tDiffuse,vUv-d).b);
      float l = dot(c,vec3(0.299,0.587,0.114)); c = mix(vec3(l), c, 0.9); c *= uTint;
      c = c + (c - l)*0.0; c = mix(c, c*c*(3.-2.*c), 0.25);
      vec2 q = vUv-0.5; q.x *= uRes.x/uRes.y; c *= 1.-dot(q,q)*uVig;
      c += (h(vUv*uRes + uSeed*91.7)-0.5)*uGrain;
      gl_FragColor = vec4(c*uFade,1.); }` });
composer.addPass(grade);

// ---------------------------------------------------------------- morning env (exterior)
const MORNING = { top: [0.2, 0.26, 0.34], hor: [0.55, 0.57, 0.6], cloud: [0.42, 0.44, 0.48], moonDir: [0.7, 0.22, -0.68], moonCol: [1.0, 0.9, 0.78], moonI: 0.8, cov: 0.32, stars: 0, fog: [0.5, 0.53, 0.57], fogD: 0.0042, storm: 0.15, hemi: 1.3, moonL: 2.2, exp: 0.9, sunset: 0.3, deep: [0.02, 0.05, 0.06], foam: 0.7, rain: 0, wind: 0.5 };
function applyEnv2(e) {
  skyU.uTop.value.set(...e.top); skyU.uHor.value.set(...e.hor); skyU.uCloud.value.set(...e.cloud); skyU.uMoonDir.value.set(...e.moonDir).normalize(); skyU.uMoonCol.value.set(...e.moonCol); skyU.uMoonI.value = e.moonI; skyU.uCov.value = e.cov; skyU.uStars.value = e.stars; skyU.uSunset.value = e.sunset; skyU.uWind.value = e.wind;
  scene.fog.color.setRGB(...e.fog); scene.fog.density = e.fogD; oceanU.uFogCol.value.setRGB(...e.fog); oceanU.uFogDen.value = e.fogD; oceanU.uStorm.value = e.storm; oceanU.uDeep.value.set(...e.deep); oceanU.uFoamI.value = e.foam;
  hemi.intensity = e.hemi; hemi.color.setRGB(0.75, 0.8, 0.9); hemi.groundColor.setRGB(0.18, 0.17, 0.14); moon.intensity = e.moonL; moon.color.setRGB(...e.moonCol); rainU.uI.value = 0; sprayU.uI.value = 0; skyU.uFlash.value = 0;
}
scene.environment = roomEnv;
// hide part-1-only stuff
lampGlow.visible = false; beam.visible = false; lampLight.intensity = 0; outGlow.intensity = 0; deskLight.intensity = 0; stoveLight.intensity = 0; roomFill.intensity = 0; faceFlash.intensity = 0; handLantern.visible = false; arthur.group.visible = false; mark.group.visible = false;
for (const pl of lampPosts) pl.intensity = 0;
{ // hide the low-detail part-1 door so detailed one shows
  lh.traverse(o => { if (o.isMesh && o.parent !== lh && o.parent && o.parent.parent === lh && o.parent.rotation.y === lh.userData.doorAngle) o.visible = false; });
}

// ---------------------------------------------------------------- timeline
function lerpV2(a, b, k) { return a.clone().lerp(b, k); }
const ST = SHOT; // shot boundaries in seconds keyed by name
const between = (t, a, b) => t >= a && t < b;
const loc = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
let envBuilt = false;
function renderAt2(t) {
  if (!envBuilt) { buildInnerEnv(); envBuilt = true; }
  skyU.uTime.value = t; oceanU.uTime.value = t; dustU.uTime.value = t; puffU.uTime.value = t;
  for (const b of beams) b.mesh.material.uniforms.uTime.value = t;
  grade.uniforms.uSeed.value = (t * 24) % 1000 / 10;
  let useInner = false, dof = null, tint = [1, 1, 1];
  handR.group.visible = handL.group.visible = false; crowbar.visible = false; markOut.group.visible = false; mark2.group.visible = false;
  for (const g of gulls) { const u = g.userData; const a = t * u.sp + u.ph; g.position.set(u.c.x + Math.cos(a) * u.rad, u.h + Math.sin(t * 0.5 + u.ph) * 2, u.c.z + Math.sin(a) * u.rad); g.rotation.y = -a; const f = Math.sin(t * 6 + u.ph) * 0.5; u.wl.rotation.z = f; u.wr.rotation.z = -f; }
  applyEnv2(MORNING); renderer.toneMappingExposure = MORNING.exp;
  const da = lh.userData.doorAngle; const out = V3(Math.sin(da), 0, Math.cos(da)), side = V3(out.z, 0, -out.x);
  const doorC = extDoor.position.clone();
  extD.leaf.rotation.y = 0; hasp.rotation.set(0, 0, 0); hasp.position.set(0.5, 1.12, 0.06); padlock.visible = true;
  let shadowC = LH.clone(), shadowR = 30;
  sunBeam.mesh.position.copy(sunBeam.o); sunBeam.mesh.scale.z = 1; // default sun-beam cone (room shot shortens it)

  if (t < ST.walk) { // title: morning wide
    const k = ease(t / ST.walk);
    setCam(lerpV2(V3(60, 22, 95), V3(42, 18, 66), k), lerpV2(V3(0, 24, 0), V3(0, 22, 0), k), 36);
    shadowR = 50;
  } else if (t < ST.pry) { // Mark walks to the door with crowbar (behind)
    const k = loc(t, ST.walk, ST.pry);
    const p = doorC.clone().addScaledVector(out, mix(16, 3.2, ease(k) * 0.9 + k * 0.1)).addScaledVector(side, mix(1.5, 0.3, k)); p.y = hgt(p.x, p.z);
    markOut.group.visible = true; resetPose(markOut); markOut.group.position.copy(p); markOut.group.rotation.y = Math.atan2(-out.x, -out.z);
    const ph = (t - ST.walk) * 7.0; markOut.L.th.rotation.x = Math.sin(ph) * 0.45; markOut.R.th.rotation.x = -Math.sin(ph) * 0.45; markOut.L.kn.rotation.x = Math.max(0, -Math.sin(ph)) * 0.6; markOut.R.kn.rotation.x = Math.max(0, Math.sin(ph)) * 0.6; markOut.L.sh.rotation.x = -Math.sin(ph) * 0.35; markOut.R.sh.rotation.x = -0.2; markOut.R.el.rotation.x = -0.25; markOut.hips.position.y = 0.95 + Math.abs(Math.sin(ph)) * 0.025;
    markOut.group.updateMatrixWorld(true); crowbar.visible = true; const hand = markOut.R.el.localToWorld(V3(0, -0.3, 0)); crowbar.position.copy(hand).add(V3(0, -0.55, 0)); crowbar.rotation.set(0.15, markOut.group.rotation.y, 0);
    const cam = p.clone().addScaledVector(out, 4.5 - k * 0.5).addScaledVector(side, -1.6).add(V3(0, 1.7, 0));
    setCam(cam, doorC.clone().add(V3(0, 1.5 + (1 - k) * 2, 0)), 42);
    shadowC = doorC; shadowR = 12;
  } else if (t < ST.inside) { // close-up: crowbar prying the padlock hasp
    const k = loc(t, ST.pry, ST.inside); const T = t - ST.pry, dur = ST.inside - ST.pry;
    extDoor.updateMatrixWorld(true);
    const haspW = extDoor.localToWorld(V3(0.62, 1.12, 0.1));
    const snap = dur - 1.6; // time of break
    let pry = 0.0; if (T < snap) pry = 0.12 * smooth(0.3, 1.0, T) + 0.06 * Math.max(0, Math.sin((T - 1.0) * 4.5)) * smooth(1, 2, T) + 0.1 * smooth(snap - 1.2, snap, T); else pry = 0.35;
    // hasp bends then breaks and falls
    if (T > snap) { const f = T - snap; hasp.rotation.z = -0.4 - f * 4; hasp.position.set(0.5 + f * 0.15, 1.12 - 4.9 * f * f, 0.06 + f * 0.4); if (hasp.position.y < 0.05) hasp.position.y = 0.05; }
    else hasp.rotation.z = -pry * 0.6;
    if (T > snap) extD.leaf.rotation.y = -smooth(snap + 0.2, snap + 1.5, T) * 0.12;
    puffU.uT0.value = ST.pry + snap; puffU.uO.value.copy(haspW);
    // crowbar: tip under hasp, lever rotating
    crowbar.visible = true; const tip = haspW.clone().addScaledVector(out, 0.02);
    const beta = 0.35 + pry; const bdn = V3(0, -Math.cos(beta), 0).addScaledVector(out, Math.sin(beta)).addScaledVector(side, 0.12).normalize();
    const Yb = bdn.clone().negate(); let Zb = out.clone().negate(); Zb.addScaledVector(Yb, -Zb.dot(Yb)).normalize(); const Xb = Yb.clone().cross(Zb);
    crowbar.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(Xb, Yb, Zb)); crowbar.position.copy(tip).addScaledVector(bdn, 0.86).addScaledVector(Zb, -0.1);
    // hands gripping the bar near its bottom
    crowbar.updateMatrixWorld(true);
    const g1 = crowbar.localToWorld(V3(0, 0.12, 0)), g2 = crowbar.localToWorld(V3(0, 0.34, 0)); const bd = crowbar.localToWorld(V3(0, 1, 0)).sub(crowbar.localToWorld(V3(0, 0, 0))).normalize();
    placeHand(handR, g1.clone().addScaledVector(out, 0.035).addScaledVector(side, 0.0), bd, out.clone().negate()); placeHand(handL, g2.clone().addScaledVector(out, 0.035), bd.clone().negate(), out.clone().negate());
    const camT = haspW.clone().add(V3(0, -0.06, 0));
    const cam = haspW.clone().addScaledVector(out, mix(0.75, 0.62, k)).addScaledVector(side, mix(-0.38, -0.3, k)).add(V3(0, mix(-0.16, -0.08, k), 0));
    setCam(cam, camT, 40); dof = { focus: cam.distanceTo(haspW), aperture: 0.004 };
    shadowC = doorC; shadowR = 5;
    if (T > snap) camera.position.add(V3(Math.sin(t * 60) * 0.006 * Math.exp(-(T - snap) * 6), Math.sin(t * 47) * 0.006 * Math.exp(-(T - snap) * 6), 0));
  } else if (t < ST.smell) { // inside: door opens, light floods, Mark silhouette
    useInner = true; const k = loc(t, ST.inside, ST.smell); const T = t - ST.inside;
    innerDoor.leaf.rotation.y = -smooth(0.0, 2.2, T) * 1.35;
    const open = smooth(0.0, 2.0, T); outsideMat.color.setRGB(1.6, 1.75, 1.9).multiplyScalar(open);
    doorBeam.mesh.material.uniforms.uI.value = open * 0.55; doorBeam.light.intensity = open * 120; doorBeam.dustI = open * 1.2;
    mark2.group.visible = true; resetPose(mark2); const mp = V3(0, 0, IR(0) + 0.5 - smooth(1.4, 3.6, T) * 1.3); mark2.group.position.copy(mp); mark2.group.rotation.y = Math.PI;
    const ph = T * 6; if (T > 1.4 && T < 3.6) { mark2.L.th.rotation.x = Math.sin(ph) * 0.4; mark2.R.th.rotation.x = -Math.sin(ph) * 0.4; mark2.L.kn.rotation.x = Math.max(0, -Math.sin(ph)) * 0.5; mark2.R.kn.rotation.x = Math.max(0, Math.sin(ph)) * 0.5; }
    mark2.R.sh.rotation.x = -0.15;
    setCam(V3(0.35, 1.05, -0.9 + k * 0.25), V3(0.0, 1.35, IR(0)), 46);
    setDustBeams([doorBeam]);
  } else if (t < ST.stairs) { // ground floor pan across props (smell)
    useInner = true; const k = ease(loc(t, ST.smell, ST.stairs));
    innerDoor.leaf.rotation.y = -1.35; outsideMat.color.setRGB(1.6, 1.75, 1.9); doorBeam.mesh.material.uniforms.uI.value = 0.55; doorBeam.light.intensity = 120; doorBeam.dustI = 1.2;
    const a = mix(0.9, 2.6, k); setCam(V3(Math.cos(a) * -0.3, mix(1.1, 1.4, k), -Math.sin(a) * -0.3 + 0.3), V3(Math.cos(a) * 2.2, mix(0.5, 0.9, k), -Math.sin(a) * 2.2), 52);
    dof = { focus: 1.6, aperture: 0.0015 };
    setDustBeams([doorBeam, beams[0]]);
  } else if (t < ST.mech) { // staircase: look up the helix + Mark climbing
    useInner = true; const k = loc(t, ST.stairs, ST.mech); const dur = ST.mech - ST.stairs;
    innerDoor.leaf.rotation.y = -1.35; outsideMat.color.setRGB(1.6, 1.75, 1.9); doorBeam.mesh.material.uniforms.uI.value = 0.4; doorBeam.light.intensity = 90;
    const split = 0.45;
    if (k < split) { const kk = ease(k / split); const a = kk * 0.8; setCam(V3(0.05, 0.4 + kk * 0.3, 0.05), V3(Math.cos(a) * 0.15, 12, -Math.sin(a) * 0.15), 70); camera.rotateZ(kk * 0.6);
      mark2.group.visible = true; resetPose(mark2); const f = 6 + kk * 4; const p = helixPos(f, 0, 0.1); mark2.group.position.copy(p); mark2.group.rotation.y = stepAngle(f) + Math.PI; climbPose(mark2, t);
    } else { const kk = (k - split) / (1 - split); const f = 20 + kk * 9; mark2.group.visible = true; resetPose(mark2); const p = helixPos(f, 0, 0.1); mark2.group.position.copy(p); mark2.group.rotation.y = stepAngle(f) + Math.PI; climbPose(mark2, t);
      const cf = f - 2.2; const cp = helixPos(cf, 0.35, -0.05); const tgt = helixPos(f, 0.25, 0.1); setCam(cp, tgt, 55); dof = { focus: cp.distanceTo(tgt), aperture: 0.0025 }; }
    setDustBeams([beams[0], beams[1], beams[2]]);
  } else if (t < ST.room) { // mechanism
    useInner = true; const k = ease(loc(t, ST.mech, ST.room));
    mech.updateMatrixWorld(true);
    const c0 = mech.localToWorld(V3(-0.6, 0.25, 1.3)), c1 = mech.localToWorld(V3(0.45, 0.05, 1.05)); setCam(lerpV2(c0, c1, k), mech.localToWorld(V3(mix(-0.1, 0.25, k), 0.0, 0)), 42);
    dof = { focus: camera.position.distanceTo(mech.localToWorld(V3(0.36, -0.12, 0))), aperture: 0.003 };
    setDustBeams([beams[2], beams[3]]);
  } else if (t < ST.box) { // top room reveal: eyes rise above the hatch facing the window/clock wall, head turns to the desk, push to box
    useInner = true; const k = loc(t, ST.room, ST.box);
    const bw = new THREE.Vector3(); box.getWorldPosition(bw); bw.y += 0.05;
    const rise = smooth(0, 0.3, k), push = ease(smooth(0.45, 1, k));
    const Pr = V3(0.5, TOP + 0.04 + rise * 1.41 + Math.sin(t * 2.1) * 0.006 * (1 - push), 0.05); // inside the hatch opening
    const E = bw.clone().add(V3(-0.15, 0.5, 0)).lerp(V3(0.5, TOP + 1.45, 0.05), 0.35);
    const cam = lerpV2(Pr, E, push);
    // look target: first the far wall (window + ticking clock), then yaw/pitch turn toward the box (never through the camera)
    const L1 = V3(Math.cos(1.45) * (TR - 0.2), mix(cam.y + 0.25, TOP + 1.3, rise), -Math.sin(1.45) * (TR - 0.2));
    const dirTo = v => { const d = v.clone().sub(cam); return [Math.atan2(d.z, d.x), Math.atan2(d.y, Math.hypot(d.x, d.z))]; };
    const [y1, p1] = dirTo(L1), [y2, p2] = dirTo(bw);
    let dy = y2 - y1; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
    const turn = ease(smooth(0.22, 0.48, k)), yw = y1 + dy * turn, pt = mix(p1, p2, turn);
    const look = cam.clone().add(V3(Math.cos(yw) * Math.cos(pt), Math.sin(pt), Math.sin(yw) * Math.cos(pt)));
    setCam(cam, look, mix(55, 38, push)); dof = { focus: mix(cam.distanceTo(L1), cam.distanceTo(bw), turn), aperture: 0.002 * smooth(0.5, 1, k) };
    // start the haze cone inside the room so it fades in softly instead of cutting a hard edge into the wall
    sunBeam.mesh.position.copy(sunBeam.o).addScaledVector(sunBeam.d, 1.1); sunBeam.mesh.scale.z = (sunBeam.len - 1.1) / sunBeam.len;
    setDustBeams([sunBeam]);
  } else if (t < ST.news) { // box opens, folded newspaper inside (masthead: today's date)
    useInner = true; const k = loc(t, ST.box, ST.news); const T = t - ST.box;
    desk.updateMatrixWorld(true); const bw = new THREE.Vector3(); box.getWorldPosition(bw);
    lid.rotation.x = -smooth(0.6, 2.6, T) * 1.85 + Math.sin(smooth(0.6, 2.6, T) * Math.PI) * 0.03;
    news.visible = true; box.updateMatrixWorld(true);
    news.position.copy(box.localToWorld(V3(0, 0.03, 0.01)));
    news.quaternion.copy(new THREE.Quaternion().setFromRotationMatrix(box.matrixWorld).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0)))); news.scale.setScalar(0.62);
    newsLower.rotation.x = Math.PI - 0.02; newsLower.position.set(0, 0, -0.003); newsUpper.rotation.x = 0; newsRoot.position.y = -NEWS_H / 4;
    const toCam = V3(-Math.cos(deskA), 0, Math.sin(deskA)).normalize();
    const cam = bw.clone().addScaledVector(toCam, mix(0.75, 0.32, ease(k))).add(V3(0.04, mix(0.5, 0.42, ease(k)), 0));
    const tg = bw.clone().add(V3(0, mix(0.1, 0.02, smooth(0.2, 0.7, k)), 0));
    setCam(cam, tg, mix(40, 34, k)); dof = { focus: cam.distanceTo(tg), aperture: 0.004 };
    setDustBeams([sunBeam]);
  } else { // newspaper reveal: unfold, headline, date
    useInner = true; const T = t - ST.news; const dur = END2 - ST.news;
    const bw = new THREE.Vector3(); box.getWorldPosition(bw); lid.rotation.x = -1.85;
    const toCam = V3(-Math.cos(deskA), 0, Math.sin(deskA)).normalize();
    const camBase = bw.clone().addScaledVector(toCam, 0.6).add(V3(0, 0.62, 0));
    news.visible = true; news.scale.setScalar(1); desk.updateMatrixWorld(true);
    const unf = smooth(0.2, 1.6, T); newsLower.rotation.x = Math.PI * (1 - unf) * 0.98; newsLower.position.z = -0.003 * (1 - unf); newsUpper.rotation.x = 0; newsRoot.position.y = -NEWS_H / 4 * (1 - unf);
    // paper held in front of camera, facing it
    news.position.copy(desk.localToWorld(V3(-0.4, 0.845, 0.16)));
    news.quaternion.copy(new THREE.Quaternion().setFromRotationMatrix(desk.matrixWorld).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0.08))));
    news.updateMatrixWorld(true);
    // camera moves: overall -> headline+circle -> date
    const P_ALL = news.localToWorld(V3(0, -0.42, 0.62)), P_HEAD = news.localToWorld(V3(-0.04, -0.24, 0.3)), P_DATE = news.localToWorld(V3(-0.15, -0.19, 0.12));
    const L_ALL = news.localToWorld(V3(0, 0, 0)), L_HEAD = news.localToWorld(V3(-0.05, -0.06, 0)), L_DATE = news.localToWorld(V3(-0.155, -0.115, 0));
    const a = ST.date - ST.news; const kh = ease(smooth(1.6, a - 0.3, T)), kd = ease(smooth(a, a + 2.5, T));
    const cp = lerpV2(lerpV2(P_ALL, P_HEAD, kh), P_DATE, kd), ct = lerpV2(lerpV2(L_ALL, L_HEAD, kh), L_DATE, kd);
    setCam(cp, ct, mix(mix(45, 40, kh), 32, kd)); dof = { focus: cp.distanceTo(ct), aperture: mix(0.002, 0.006, kd) };
    // hands holding edges
    tint = [1, 1, 1];
    setDustBeams([sunBeam]);
  }
  // clock ticking (seconds hand) — eerily working
  { const c = inner.userData.clock; const sec = Math.floor(t) + smooth(0, 0.08, t % 1); c.hs.rotation.z = -sec / 60 * Math.PI * 2 - 2.0; c.hm.rotation.z = -1.1 - t / 3600 * Math.PI * 2; c.hh.rotation.z = -2.6; }
  // gears: only the clean brass one turns slowly
  for (const g of gears) if (g.userData.alive) g.rotation.z = t * 0.35; else g.rotation.z = 0.0;
  mech.userData.gov.rotation.y = 0;
  const sceneNow = useInner ? inner : scene;
  if (!useInner) { sky.position.copy(camera.position); placeOcean(camera.position); setShadowFocus(shadowC, shadowR); }
  sceneNow.add(handR.group); sceneNow.add(handL.group); sceneNow.add(crowbar);
  renderPass.scene = sceneNow; bokeh.scene = sceneNow;
  bokeh.enabled = !!dof; if (dof) { bokeh.uniforms.focus.value = dof.focus; bokeh.uniforms.aperture.value = dof.aperture; bokeh.uniforms.maxblur.value = 0.01; }
  renderer.toneMappingExposure = useInner ? 1.25 : MORNING.exp;
  grade.uniforms.uTint.value.set(...(useInner ? [1.02, 1.0, 0.96] : [0.98, 1.0, 1.03]));
  // fades
  let fade = smooth(0, 1.5, t) * (1 - smooth(END2 - 3.6, END2 - 2.4, t));
  for (const c of [ST.walk, ST.pry, ST.smell, ST.stairs, ST.mech, ST.room, ST.box, ST.news]) fade *= smooth(0, 0.2, Math.abs(t - c));
  grade.uniforms.uFade.value = fade;
  composer.render();
}
function camForward(d) { return new THREE.Vector3(0, 0, 0); }
function climbPose(P, t) { const ph = t * 4.2; P.L.th.rotation.x = -0.5 - Math.sin(ph) * 0.35; P.R.th.rotation.x = -0.5 + Math.sin(ph) * 0.35; P.L.kn.rotation.x = 0.7 + Math.sin(ph) * 0.3; P.R.kn.rotation.x = 0.7 - Math.sin(ph) * 0.3; P.hips.rotation.x = 0.25; P.R.sh.rotation.x = -0.6; P.R.sh.rotation.z = -0.5; P.L.sh.rotation.x = Math.sin(ph) * 0.3; P.hips.position.y = 0.88 + Math.abs(Math.sin(ph)) * 0.04; }
const END2 = window.END2;
window.renderAt = (t) => { renderAt2(t); return true; };
window.grab = (q = 0.95) => renderer.domElement.toDataURL('image/jpeg', q);
window.READY = true;
