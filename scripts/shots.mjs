// 按真实速度走一遍某个字，在每个场景截图到 shots/<id>/，用来人工检查画面。
// 用法：先 node scripts/serve.mjs <端口>，再 node scripts/shots.mjs <字id> [端口]
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const id = process.argv[2] || 'ri';
const port = process.argv[3] || 4173;
const dir = `shots/${id}`;
mkdirSync(dir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
await page.goto(`http://localhost:${port}/?c=${id}`);
await page.waitForSelector('body[data-scene="start"]');
const forms = await page.evaluate(() => window.hz.data.forms.map((f) => f.id));
await page.screenshot({ path: `${dir}/0-start.png` });
await page.getByTestId('start').click();

let n = 1;
const at = async (scene, delay) => {
  await page.waitForSelector(`body[data-scene="${scene}"]`, { timeout: 60_000 });
  await page.waitForTimeout(delay);
  const path = `${dir}/${n++}-${scene}.png`;
  await page.screenshot({ path });
  console.log('shot', path);
};
await at('picture', 3000);
await page.getByTestId('picture').click({ force: true });
// 每个字形截两张：变形中途和快结束时
for (const f of forms) {
  await at(f, 1200);
  await page.waitForTimeout(1800);
  const path = `${dir}/${n++}-${f}-end.png`;
  await page.screenshot({ path });
  console.log('shot', path);
}
await at('order', 3500);
await at('trace', 1500);
await browser.close();
