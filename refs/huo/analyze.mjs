// 栅格化 refs/huo/board.html 的拓片并做连通域分析：主焰＋火星的个数、位置、比例。
// 按 pitfalls：同目录 HTML + --allow-file-access-from-files。
import { chromium } from '@playwright/test';

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 420, height: 400 } });
await page.goto('file:///C:/Users/unknown/orca/workspaces/agents/%E4%BA%A4%E4%BA%92%E5%BC%8F%E6%B1%89%E5%AD%97/projects/2026-11_hanzi-web/refs/huo/board.html');
await page.waitForTimeout(800);

const out = await page.evaluate(() => {
  const ids = ['g_E50B', 'g_E50C', 'g_E50D', 'g_E50E', 'g_E512', 'g_xiaozhuan', 'g_swxz'];
  const results = {};
  for (const id of ids) {
    const img = document.getElementById(id);
    const N = 200;
    const cv = document.createElement('canvas');
    cv.width = N; cv.height = N;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, N, N);
    ctx.drawImage(img, 0, 0, N, N);
    const d = ctx.getImageData(0, 0, N, N).data;
    const dark = new Uint8Array(N * N);
    for (let i = 0; i < N * N; i++) dark[i] = (d[i * 4] + d[i * 4 + 1] + d[i * 4 + 2]) < 420 ? 1 : 0;
    // 连通域（四邻接），只要面积 >= 12 像素的
    const label = new Int32Array(N * N).fill(0);
    const comps = [];
    for (let i = 0; i < N * N; i++) {
      if (!dark[i] || label[i]) continue;
      const stack = [i];
      label[i] = comps.length + 1;
      let area = 0, x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
      while (stack.length) {
        const p = stack.pop();
        const x = p % N, y = (p / N) | 0;
        area++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
          const q = ny * N + nx;
          if (dark[q] && !label[q]) { label[q] = comps.length + 1; stack.push(q); }
        }
      }
      comps.push({ area, x0, x1, y0, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 });
    }
    const total = comps.reduce((s, c) => s + c.area, 0);
    results[id] = {
      ink: total,
      comps: comps
        .filter((c) => c.area >= 12)
        .sort((a, b) => b.area - a.area)
        .map((c) => ({
          area: c.area, pct: Math.round((100 * c.area) / total),
          bbox: [c.x0, c.y0, c.x1, c.y1],
          center: [Math.round(c.cx), Math.round(c.cy)],
          w: c.x1 - c.x0 + 1, h: c.y1 - c.y0 + 1,
        })),
    };
  }
  return results;
});
console.log(JSON.stringify(out, null, 1));

await page.screenshot({ path: 'refs/huo/board.png', fullPage: true });
await browser.close();
