// Шаг 2: рендер кадров сцены в видео (без звука) + список звуковых эффектов.
// node render.js            — полный рендер в build/video.mp4
// node render.js 12.5 30    — превью кадров в build/preview/*.png
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const FPS = 30;
const B = path.join(__dirname, 'build');

(async () => {
  const tl = JSON.parse(fs.readFileSync(path.join(B, 'timeline.json'), 'utf8'));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', e => { console.error('PAGE ERROR', e); process.exit(1); });
  await page.goto('file://' + path.join(__dirname, 'scene.html'));
  await page.evaluate(tl => window.init(tl), tl);
  const frame = (t, type) => page.evaluate(([t, type]) => {
    window.render(t);
    return document.getElementById('c').toDataURL(type, 0.95).split(',')[1];
  }, [t, type]);

  const times = process.argv.slice(2).map(Number);
  if (times.length) {
    fs.mkdirSync(path.join(B, 'preview'), { recursive: true });
    for (const t of times) {
      const f = path.join(B, 'preview', `t${t.toFixed(2)}.png`);
      fs.writeFileSync(f, Buffer.from(await frame(t, 'image/png'), 'base64'));
      console.log(f);
    }
    await browser.close();
    return;
  }

  fs.writeFileSync(path.join(B, 'sfx.json'), JSON.stringify(await page.evaluate(() => window.getSfx())));
  const n = Math.ceil(tl.duration * FPS);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS),
    '-i', '-', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'medium',
    path.join(B, 'video.mp4')], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < n; i++) {
    const buf = Buffer.from(await frame(i / FPS, 'image/jpeg'), 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 300 === 0) console.log(`frame ${i}/${n}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('video done');
})();
