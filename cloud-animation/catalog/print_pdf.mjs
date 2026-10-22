// print_pdf.mjs: prints catalog.html to a PDF with headless Chromium, and optionally PNG previews of each page.
//   node print_pdf.mjs catalog.html Journal_Cloud_Catalog.pdf [previewDir]
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const [src, out, previews] = process.argv.slice(2);
const browser = await chromium.launch({ args: ['--no-sandbox', '--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1123, height: 794 } });
await page.goto(pathToFileURL(resolve(src)).href, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
console.log('fonts:', await page.evaluate(() => [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight + ' ' + f.style).join(', ')));
// overflow check: any page whose content runs past its box
console.log('overflow:', JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('.page')].map((p, i) => [i + 1, p.scrollHeight - p.clientHeight]).filter(([, d]) => d > 1))));
await page.pdf({ path: out, width: '297mm', height: '210mm', printBackground: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
console.log('wrote', out);
if (previews) {
  mkdirSync(previews, { recursive: true });
  const pages = await page.$$('.page');
  for (let i = 0; i < pages.length; i++) await pages[i].screenshot({ path: `${previews}/p${String(i + 1).padStart(2, '0')}.png` });
}
await browser.close();
