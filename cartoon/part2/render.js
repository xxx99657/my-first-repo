// usage: node render.js out_dir fps t0 t1 [w h] | node render.js out_dir list t1,t2,...
const { chromium } = require('playwright'); const fs = require('fs');
const [,, out, mode, a, b, w = 1920, h = 1080] = process.argv;
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const br = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await br.newPage({ viewport: { width: +w, height: +h } });
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.log('PAGE:', m.text().slice(0, 300)); });
  p.on('pageerror', e => console.log('ERR:', e.message));
  await p.goto(`http://localhost:8765/${process.env.PAGE || "index.html"}?w=${w}&h=${h}`);
  await p.waitForFunction('window.READY === true', null, { timeout: 180000 });
  let times = [];
  if (mode === 'list') times = a.split(',').map(Number).map(t => [t, `t${t.toFixed(2)}`]);
  else { const fps = +mode; for (let f = +a; f < +b; f++) times.push([f / fps, String(f).padStart(5, '0')]); }
  for (const [t, name] of times) {
    const t0 = Date.now();
    const d = await p.evaluate(t => { window.renderAt(t); return window.grab(0.94); }, t);
    fs.writeFileSync(`${out}/${name}.jpg`, Buffer.from(d.split(',')[1], 'base64'));
    if (mode === 'list') console.log(name, Date.now() - t0, 'ms');
  }
  await br.close();
})();
