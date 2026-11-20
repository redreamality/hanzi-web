// 在 kaishu 场景量 morph 各笔 bbox 与笔画数据轮廓外框的差（对齐诊断）。
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto('http://localhost:4212/?c=da&fast');
await page.waitForSelector('body[data-scene="start"]');
await page.getByTestId('start').click();
await page.getByTestId('picture').click({ force: true });
// 轮询到 kaishu 场景且对齐采样
const info = await page.waitForFunction(() => {
  const m = document.querySelector('#morph-layer .morph');
  return document.body.dataset.scene === 'kaishu' && m && Number(m.getAttribute('opacity') ?? 0) > 0.9;
}, null, { timeout: 15_000 }).then(() =>
  page.evaluate(() => {
    const outlineBox = (d) => {
      const v = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (let i = 0; i + 1 < v.length; i += 2) {
        x0 = Math.min(x0, v[i]);
        x1 = Math.max(x1, v[i]);
        y0 = Math.min(y0, 900 - v[i + 1]);
        y1 = Math.max(y1, 900 - v[i + 1]);
      }
      return { x0, x1, y0, y1 };
    };
    const m = document.querySelector('#morph-layer .morph');
    const box = (name) => {
      const p = m.querySelector(`path[data-part="${name}"]`);
      const b = p.getBBox();
      return { x0: b.x, x1: b.x + b.width, y0: b.y, y1: b.y + b.height };
    };
    const arms = ['armL', 'armR'].map(box);
    const u = {
      x0: Math.min(...arms.map((b) => b.x0)),
      x1: Math.max(...arms.map((b) => b.x1)),
      y0: Math.min(...arms.map((b) => b.y0)),
      y1: Math.max(...arms.map((b) => b.y1)),
    };
    const diff = (a, b) => Object.fromEntries(Object.keys(a).map((k) => [k, Math.round(a[k] - b[k])]));
    return {
      heng: { morph: u, data: outlineBox(window.hz.data.strokes[0]), diff: diff(u, outlineBox(window.hz.data.strokes[0])) },
      pie: { morph: box('body'), data: outlineBox(window.hz.data.strokes[1]), diff: diff(box('body'), outlineBox(window.hz.data.strokes[1])) },
      na: { morph: box('leg'), data: outlineBox(window.hz.data.strokes[2]), diff: diff(box('leg'), outlineBox(window.hz.data.strokes[2])) },
    };
  }),
);
console.log(JSON.stringify(info, null, 1));
await browser.close();
