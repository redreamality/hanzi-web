// 审计用：把 refs/{yue,ri,mu}/ 的拓片 SVG 栅格化成二值位图，存 rasters.json。
// 配方照总部 pitfalls/hanzi-data.md：HTML 与 SVG 同目录 + page.goto(file://) + --allow-file-access-from-files。
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

import { fileURLToPath } from 'node:url';

const REF = fileURLToPath(new URL('.', import.meta.url));
const S = 256; // 最长边栅格到 256

const groups = process.argv[2] ? process.argv.slice(2) : ['yue', 'ri', 'mu'];
const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage();
const out = {};
for (const g of groups) {
  const dir = join(REF, g);
  const files = readdirSync(dir).filter((f) => f.endsWith('.svg'));
  const html = `<!doctype html><meta charset="utf-8"><body>
${files.map((f) => `<img id="${f}" src="${f}">`).join('\n')}
<canvas id="c"></canvas>
<script>
window.raster = async () => {
  const out = {};
  for (const f of ${JSON.stringify(files)}) {
    const img = document.getElementById(f);
    if (!img.complete || !img.naturalWidth) await new Promise((r) => { img.onload = r; setTimeout(r, 3000); });
    const w0 = img.naturalWidth, h0 = img.naturalHeight;
    const k = Math.min(${S} / w0, ${S} / h0);
    const w = Math.max(1, Math.round(w0 * k)), h = Math.max(1, Math.round(h0 * k));
    const c = document.getElementById('c');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    const bits = new Uint8Array(w * h);
    for (let i = 0; i < bits.length; i++) {
      const a = d[i * 4 + 3], lum = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3;
      bits[i] = a >= 128 && lum <= 160 ? 1 : 0;
    }
    out[f] = { w, h, bits: Array.from(bits) };
  }
  return out;
};
</script></body>`;
  const htmlPath = join(dir, 'view.html');
  writeFileSync(htmlPath, html);
  await page.goto('file:///' + htmlPath.replace(/\\/g, '/'));
  out[g] = await page.evaluate(() => window.raster());
  unlinkSync(htmlPath);
}
const dest = process.env.CLAUDE_JOB_DIR + '/tmp/rasters.json';
writeFileSync(dest, JSON.stringify(out));
console.log('written', dest, Object.fromEntries(Object.entries(out).map(([g, v]) => [g, Object.keys(v).length])));
await browser.close();
