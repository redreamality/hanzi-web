// 把拓片剪影打印成 ASCII 密度图（每格 4px，# = 墨 > 60%，+ = > 25%，. = > 5%）
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
    const cell = 4;
    const G = N / cell;
    const rows = [];
    for (let gy = 0; gy < G; gy++) {
      let row = '';
      for (let gx = 0; gx < G; gx++) {
        let dark = 0;
        for (let y = 0; y < cell; y++)
          for (let x = 0; x < cell; x++) {
            const i = ((gy * cell + y) * N + gx * cell + x) * 4;
            if (d[i] + d[i + 1] + d[i + 2] < 420) dark++;
          }
        const f = dark / (cell * cell);
        row += f > 0.6 ? '#' : f > 0.25 ? '+' : f > 0.05 ? '.' : ' ';
      }
      rows.push(row);
    }
    results[id] = rows;
  }
  return results;
});
for (const [id, rows] of Object.entries(out)) {
  console.log('==== ' + id + ' ====');
  console.log(rows.join('\n'));
}
await browser.close();
