// 量首页和一课的首屏开销：请求数、传输字节、关键时间点。
// 用法：先 node scripts/serve.mjs <端口>，再 node scripts/measure-load.mjs [端口]
import { chromium } from '@playwright/test';

const port = process.argv[2] || 4173;

async function measure(page, name, url) {
  let requests = 0;
  let bytes = 0;
  const sizes = [];
  page.on('response', async (r) => {
    requests++;
    try {
      const body = await r.body().catch(() => null);
      if (body) {
        bytes += body.length;
        sizes.push([body.length, new URL(r.url()).pathname]);
      }
    } catch {}
  });
  const t0 = Date.now();
  await page.goto(url, { waitUntil: 'load' });
  const loadMs = Date.now() - t0;
  await page.waitForTimeout(2500); // 等惰性升级和 IntersectionObserver 触发的请求
  const totalMs = Date.now() - t0;
  sizes.sort((a, b) => b[0] - a[0]);
  console.log(`\n== ${name} ==`);
  console.log(`load 事件 ${loadMs}ms；含惰性加载共 ${totalMs}ms；请求 ${requests} 个，已知大小合计 ${(bytes / 1024).toFixed(0)}KB`);
  console.log(`最大的 5 个：${sizes.slice(0, 5).map(([l, p]) => `${p.match(/[^/]+$/)} ${(l / 1024).toFixed(1)}KB`).join('，')}`);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
await measure(page, '首页（全新进度）', `http://localhost:${port}/?fast`);
const idx = await page.evaluate(() => fetch('data/index.json').then((r) => r.json()));
await page.evaluate((done) => localStorage.setItem('hanzi.done', JSON.stringify(done)), idx.slice(0, 16).map((x) => x.id));
await measure(page, '首页（16 张学过 + 下一课）', `http://localhost:${port}/?fast`);
await measure(page, '一节通用课 yi1', `http://localhost:${port}/?c=yi1&fast`);
await browser.close();
