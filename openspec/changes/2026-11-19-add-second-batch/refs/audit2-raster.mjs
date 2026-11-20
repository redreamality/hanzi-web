// 第二阶段栅格化：11 字拓片（refs/<id>/）+ 代码 ORACLE 形（浏览器 import 各字 morph.js 渲染）。
// 代码形经 createMorph().reset() 渲染——用各字自己的渲染代码，零重画误差；huo 的 reset 渲染 flame，
// 特例改用其 forms.js 导出的 ORACLE + ribbon.js 手动渲染。
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, readdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REF = fileURLToPath(new URL('.', import.meta.url));
const IDS = ['ren', 'ming', 'lin', 'sen', 'xiu', 'da', 'cong', 'bi', 'bei', 'huo', 'xin'];
const NEED_DATA = new Set(['ming', 'lin', 'sen', 'xiu', 'da', 'xin']);
const S = 256;

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage();

// ---- 拓片 ----
const rubbings = {};
for (const id of IDS) {
  const dir = join(REF, id);
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
    const c = document.getElementById('c'); c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.clearRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h);
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
  const htmlPath = join(dir, 'view2.html');
  writeFileSync(htmlPath, html);
  await page.goto('file:///' + htmlPath.replace(/\\/g, '/'));
  rubbings[id] = await page.evaluate(() => window.raster());
  unlinkSync(htmlPath);
}

// ---- 代码形 ----
const htmlPath = join(REF, 'codeforms2.html');
writeFileSync(htmlPath, `<!doctype html><meta charset="utf-8"><body>
<script type="module">
${IDS.map((id) => `import * as m_${id} from '../../../../src/chars/${id}/morph.js';`).join('\n')}
import { ORACLE as HUO_ORACLE, PARTS as HUO_PARTS } from '../../../../src/chars/huo/forms.js';
import { makeStroke as huoMake, strokePath as huoPath } from '../../../../src/chars/huo/ribbon.js';
window.__MODS = { ${IDS.map((id) => `${id}: m_${id}`).join(', ')} };
window.__HUO = { ORACLE: HUO_ORACLE, PARTS: HUO_PARTS, make: huoMake, path: huoPath };
window.__READY = true;
</script></body>`);
await page.goto('file:///' + htmlPath.replace(/\\/g, '/'));
await page.waitForFunction(() => window.__READY === true, null, { timeout: 15000 });
page.on('console', (m) => { if (m.text().startsWith('DBG')) console.log(m.text()); });

const dataMap = {};
for (const id of IDS) {
  if (!NEED_DATA.has(id)) continue;
  const base = join(fileURLToPath(new URL('../../../../', import.meta.url)), 'data', 'chars');
  const a = JSON.parse(readFileSync(join(base, `${id}.json`), 'utf8'));
  const b = JSON.parse(readFileSync(join(base, `${id}.strokes.json`), 'utf8'));
  dataMap[id] = { ...a, ...b };
}

const code = await page.evaluate(async ({ IDS, dataMap, S }) => {
  const { __MODS: MODS, __HUO: HUO } = window;
  const out = {};
  const NS = 'http://www.w3.org/2000/svg';
  for (const id of IDS) {
    const holder = document.createElementNS(NS, 'svg');
    holder.setAttribute('xmlns', NS);
    holder.style.cssText = 'position:absolute;visibility:hidden;left:0;top:0';
    const layer = document.createElementNS(NS, 'g');
    holder.appendChild(layer);
    document.body.appendChild(holder);
    if (id === 'huo') {
      for (const p of HUO.PARTS) {
        const el = document.createElementNS(NS, 'path');
        el.setAttribute('fill', 'rgb(34,29,26)');
        el.setAttribute('d', HUO.path(HUO.make(HUO.ORACLE[p])));
        layer.appendChild(el);
      }
    } else {
      const m = MODS[id].createMorph(layer, dataMap[id]);
      m.reset();
      const root = layer.querySelector('g');
      if (root) root.setAttribute('opacity', '1');
    }
    const bb = layer.getBBox();
    const pad = 4;
    holder.setAttribute('viewBox', `${bb.x - pad} ${bb.y - pad} ${bb.width + 2 * pad} ${bb.height + 2 * pad}`);
    const xml = new XMLSerializer().serializeToString(holder);
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('img fail ' + id)); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml); });
    const k = Math.min(S / img.width, S / img.height);
    const w = Math.max(1, Math.round(img.width * k)), h = Math.max(1, Math.round(img.height * k));
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    const bits = new Uint8Array(w * h);
    let dbgInk = 0, dbgAlpha = 0;
    for (let i = 0; i < bits.length; i++) {
      const a = d[i * 4 + 3], lum = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) / 3;
      if (a >= 128) dbgAlpha++;
      bits[i] = a >= 128 && lum <= 160 ? 1 : 0;
      dbgInk += bits[i];
    }
    console.log('DBG', id, 'bb', bb.width.toFixed(0) + 'x' + bb.height.toFixed(0), 'img', img.width + 'x' + img.height, 'alphaPx', dbgAlpha, 'ink', dbgInk);
    out[id] = { w, h, bits: Array.from(bits) };
    holder.remove();
  }
  return out;
}, { IDS, dataMap, S });
unlinkSync(htmlPath);
await browser.close();

const all = { ...rubbings, CODE: code };
const dest = process.env.CLAUDE_JOB_DIR + '/tmp/rasters2.json';
writeFileSync(dest, JSON.stringify(all));
console.log('written', dest, Object.fromEntries(Object.entries(all).map(([g, v]) => [g, Object.keys(v).length])));
