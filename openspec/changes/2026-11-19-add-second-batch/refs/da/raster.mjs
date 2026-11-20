// 栅格化汉典拓片 SVG 成 ASCII 密度图，供字形结构比对。
// 配方见 pitfalls/hanzi-data.md：同目录写 HTML 引相对路径，--allow-file-access-from-files。
import pw from 'file:///C:/Users/unknown/orca/workspaces/agents/%E4%BA%A4%E4%BA%92%E5%BC%8F%E6%B1%89%E5%AD%97/projects/2026-11_hanzi-web/node_modules/@playwright/test/index.js';
const { chromium } = pw;
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, basename } from 'node:path';

const dir = process.argv[2];
const files = process.argv.slice(3);
const html = `<!doctype html><meta charset="utf-8">` + files.map((f, i) => `<img id="g${i}" src="${basename(f)}">`).join('');
writeFileSync(`${dir}/_raster.html`, html);

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.goto(`file:///${dir.replaceAll('\\', '/')}/_raster.html`);

for (let i = 0; i < files.length; i++) {
  const grid = await page.evaluate((i) => {
    const img = document.getElementById(`g${i}`);
    const S = 256;
    const cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, S, S);
    ctx.drawImage(img, 0, 0, S, S);
    const d = ctx.getImageData(0, 0, S, S).data;
    // 4x4 块密度 → 字符
    const rows = [];
    for (let y = 0; y < S; y += 4) {
      let line = '';
      for (let x = 0; x < S; x += 4) {
        let dark = 0;
        for (let dy = 0; dy < 4; dy++) for (let dx = 0; dx < 4; dx++) {
          const k = ((y + dy) * S + x + dx) * 4;
          if (d[k] < 128 || d[k + 3] < 128) dark++;
        }
        line += dark >= 10 ? '#' : dark >= 5 ? '+' : dark >= 2 ? '.' : ' ';
      }
      rows.push(line);
    }
    // 整体外框（暗像素）
    let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const k = (y * S + x) * 4;
      if (d[k] < 128 || d[k + 3] < 128) {
        x0 = Math.min(x0, x); x1 = Math.max(x1, x);
        y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      }
    }
    return { rows, box: [x0, y0, x1, y1], size: S };
  }, i);
  console.log(`\n===== ${basename(files[i])} 外框[${grid.box}] =====`);
  for (const r of grid.rows) console.log(r);
}
await browser.close();
