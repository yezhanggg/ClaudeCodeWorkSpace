// render.mjs: drives cloud.html in headless Chromium (Playwright, SwiftShader WebGL2), modelled on ClaudeAnimationBase's renderer.
//   node render.mjs --sheet=0.5,1.5,2.5 [--cols=3] [--w=640] [--samples=1] --out=out/check/a.jpg   contact sheet at chosen times
//   node render.mjs --strip=2.0:2.5 [--fps=30] ...                                                 every frame in a stretch
//   node render.mjs --stills=1.2,3.4 --w=1920 --out=out/stills                                     full-size PNGs
//   node render.mjs --frames --fps=30 --w=1920 --samples=4 --workers=2 [--range=0:10] [--dir=out/frames]   PNG frames (parallel, resumable)
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync, statSync, renameSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? true]; }));
const fps = +(args.fps || 30), w = +(args.w || (args.frames || args.stills ? 1920 : 640)), samples = +(args.samples || (args.frames ? 4 : 1));
const grain = args.grain !== undefined ? +args.grain : undefined;
const run = (cmd, a) => new Promise((ok, bad) => { const p = spawn(cmd, a, { stdio: 'inherit' }); p.on('close', c => c ? bad(new Error(cmd + ' exited ' + c)) : ok()); });
const times = s => String(s).split(',').map(Number);
const span = s => String(s).split(':').map(Number);

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--allow-file-access-from-files', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
    '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
});
async function openPage(tag = '') {
  const page = await browser.newPage();
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) console.log(`[page${tag}]`, m.text()); });
  page.on('pageerror', e => console.log(`[page error${tag}]`, e.message));
  await page.goto(pathToFileURL(resolve('cloud.html')).href + '?render');
  await page.waitForFunction('window.ready === true', null, { timeout: 60000 });
  return page;
}
const frameOf = async (page, t, o) => {
  const url = await page.evaluate(([t, o]) => window.renderAt(t, o), [t, o]);
  return Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
};
const opts = extra => ({ w, samples, fps, lookdev: !!args.lookdev, ...(grain !== undefined ? { grain } : {}), ...extra });

if (args.sheet || args.strip || args.stills) {
  const page = await openPage();
  console.log('GPU:', JSON.stringify(await page.evaluate(() => window.info())));
  let ts;
  if (args.strip) { const [a, b] = span(args.strip); ts = []; for (let i = Math.round(a * fps); i <= Math.round(b * fps); i++) ts.push(i / fps); }
  else ts = times(args.sheet || args.stills);
  if (args.stills) {
    const dir = args.out || 'out/stills'; mkdirSync(dir, { recursive: true });
    for (const t of ts) {
      const t0 = Date.now(), buf = await frameOf(page, t, opts());
      const f = `${dir}/t${t.toFixed(2).replace('.', '_')}.png`; writeFileSync(f, buf); console.log(`${f}  ${Date.now() - t0} ms`);
    }
  } else {
    const out = args.out || 'out/check/sheet.jpg', tmp = out + '.tmp'; mkdirSync(tmp, { recursive: true });
    const ms = [];
    for (let i = 0; i < ts.length; i++) {
      const t0 = Date.now(); writeFileSync(`${tmp}/s${String(i).padStart(3, '0')}.png`, await frameOf(page, ts[i], opts())); ms.push(Date.now() - t0);
    }
    const cols = +(args.cols || (args.strip ? 6 : 3)), rows = Math.ceil(ts.length / cols);
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', `${tmp}/s%03d.png`, '-vf', `tile=${cols}x${rows}:padding=4:color=0x222222`, '-frames:v', '1', '-q:v', '3', out]);
    rmSync(tmp, { recursive: true });
    console.log(`${out}  (${ts.length} frames: ${ts.map(t => t.toFixed(2)).join(' ')})  ms/frame: ${ms.join(' ')}`);
  }
} else if (args.frames) {
  // Parallel and resumable: each worker pulls the next missing frame; files are written atomically.
  const dir = args.dir || 'out/frames', [a, b] = args.range ? span(args.range) : [0, 10], workers = +(args.workers || 2);
  mkdirSync(dir, { recursive: true });
  const first = Math.round(a * fps), last = Math.round(b * fps) - 1;
  const todo = []; for (let i = first; i <= last; i++) { const f = `${dir}/f${String(i).padStart(5, '0')}.png`; if (!existsSync(f) || statSync(f).size < 1000) todo.push(i); }
  console.log(`${todo.length} frames to render (${last - first + 1 - todo.length} done), ${workers} workers, ${w}px, ${samples} samples`);
  let next = 0, done = 0; const start = Date.now();
  await Promise.all(Array.from({ length: workers }, async (_, k) => {
    const page = await openPage('#' + k);
    while (next < todo.length) {
      const i = todo[next++], f = `${dir}/f${String(i).padStart(5, '0')}.png`;
      writeFileSync(f + '.tmp', await frameOf(page, i / fps, opts())); renameSync(f + '.tmp', f);
      if (++done % 15 === 0 || done === todo.length) {
        const el = (Date.now() - start) / 1000;
        console.log(`frame ${done}/${todo.length}  ${(el / done * 1000).toFixed(0)} ms/frame  eta ${((todo.length - done) * el / done / 60).toFixed(1)} min`);
      }
    }
  }));
} else console.log('nothing to do: see the usage notes at the top of render.mjs');
await browser.close();
