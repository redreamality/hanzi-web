import { chromium } from '@playwright/test';
import { writeFileSync, unlinkSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REF = fileURLToPath(new URL('.', import.meta.url));
const htmlPath = join(REF, 'dbg2.html');
writeFileSync(htmlPath, `<!doctype html><meta charset="utf-8"><body>
<script type="module">
import * as m_ren from '../../../../src/chars/ren/morph.js';
window.__M = m_ren;
window.__READY = true;
</script></body>`);
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const p = await b.newPage();
p.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 300)));
await p.goto('file:///' + htmlPath.replace(/\\/g, '/'));
await p.waitForFunction(() => window.__READY === true, null, { timeout: 10000 });

const r = await p.evaluate(async () => {
  const NS = 'http://www.w3.org/2000/svg';
  const holder = document.createElementNS(NS, 'svg');
  const layer = document.createElementNS(NS, 'g');
  holder.appendChild(layer);
  document.body.appendChild(holder);
  const m = window.__M.createMorph(layer, undefined);
  m.reset();
  const root = layer.querySelector('g');
  root.setAttribute('opacity', '1');
  const paths = [...layer.querySelectorAll('path')];
  const bb = layer.getBBox();
  const info = {
    pathCount: paths.length,
    dLens: paths.map((el) => (el.getAttribute('d') || '').length),
    fills: paths.map((el) => el.getAttribute('fill')),
    strokes: paths.map((el) => el.getAttribute('stroke')),
    bbox: [bb.x, bb.y, bb.width, bb.height],
    rootOpacity: root.getAttribute('opacity'),
  };
  holder.setAttribute('viewBox', `${bb.x - 4} ${bb.y - 4} ${bb.width + 8} ${bb.height + 8}`);
  const xml = new XMLSerializer().serializeToString(holder);
  info.xmlHead = xml.slice(0, 300);
  const img = new Image();
  await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('img fail')); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml); });
  info.imgSize = [img.width, img.height];
  const c = document.createElement('canvas'); c.width = 80; c.height = 256;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, 80, 256);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let ink = 0;
  for (let i = 0; i < d.length / 4; i++) if (d[i * 4 + 3] >= 128) ink++;
  info.inkPixels = ink;
  return info;
});
console.log(JSON.stringify(r, null, 1));
unlinkSync(htmlPath);
await b.close();
