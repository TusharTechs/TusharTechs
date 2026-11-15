// Renders every scene in scenes.html to ../assets/*.webp
//   cd render && npm install && node fetch-textures.mjs && node render.mjs [scene ...]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(ROOT, '..', 'assets');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const JOBS = {
  hero: { dpr: 1.25, q: 62 },
  footer: { dpr: 1.25, q: 60 },
  trophies: { dpr: 1.5, q: 70 },
  stats: { dpr: 2, q: 88 },
  arsenal: { dpr: 2, q: 88 },
  'h-wins': { dpr: 2, q: 92 }, 'h-live': { dpr: 2, q: 92 }, 'h-arsenal': { dpr: 2, q: 92 }, 'h-flight': { dpr: 2, q: 92 },
  ...Object.fromEntries(['worldsmith', 'mutiny', 'window-sticker', 'buyable', 'staycovered', 'rangrez', 'dryrun', 'platelock']
    .map((s) => ['card-' + s, { dpr: 2, q: 60 }])),
};

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
}).listen(0);
const port = server.address().port;

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true,
  args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-webgl', '--hide-scrollbars'],
});

const wanted = process.argv.slice(2);
const names = wanted.length ? wanted : Object.keys(JOBS);
for (const name of names) {
  const job = JOBS[name];
  const page = await browser.newPage();
  page.on('console', (m) => m.type() === 'error' && console.error(`[${name}]`, m.text()));
  page.on('pageerror', (e) => console.error(`[${name}]`, e.message));
  await page.setViewport({ width: 1100, height: 1000, deviceScaleFactor: job.dpr });
  await page.goto(`http://localhost:${port}/scenes.html?scene=${name}`, { waitUntil: 'load' });
  await page.waitForFunction('window.SCENE_READY === true', { timeout: 60000 });
  const { frames, delay } = await page.evaluate(() => window.SCENE);
  const stage = await page.$('#stage');
  if (process.env.STILL_DIR) { // quick look: one frame per scene, no encoding
    for (const t of (process.env.STILL_T || '0.3').split(',').map(Number)) {
      await page.evaluate((t) => window.renderAt(t), t);
      await stage.screenshot({ path: path.join(process.env.STILL_DIR, `${name}-${t}.png`), omitBackground: true });
    }
    console.log('still', name); await page.close(); continue;
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `render-${name}-`));
  const files = [];
  for (let i = 0; i < frames; i++) {
    await page.evaluate((t) => window.renderAt(t), i / frames);
    const f = path.join(tmp, `f${String(i).padStart(4, '0')}.png`);
    await stage.screenshot({ path: f, omitBackground: true });
    files.push(f);
  }
  const out = path.join(OUT, `${name}.webp`);
  if (frames === 1) execFileSync('cwebp', ['-quiet', '-q', String(job.q), '-alpha_q', '100', '-m', '6', files[0], '-o', out]);
  else execFileSync('img2webp', ['-loop', '0', '-lossy', '-q', String(job.q), '-m', '6', '-d', String(delay), ...files, '-o', out]);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`${name.padEnd(22)} ${frames} frame(s)  ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
  await page.close();
}
await browser.close();
server.close();
