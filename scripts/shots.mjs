// 按真实速度走一遍「日」，在每个场景截图到 shots/，用来人工检查画面。
// 先 pnpm dev，再 node scripts/shots.mjs
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

mkdirSync('shots', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
await page.goto('http://localhost:4173/');
await page.waitForSelector('body[data-scene="start"]');
await page.screenshot({ path: 'shots/0-start.png' });
await page.getByTestId('start').click();

const at = async (name, scene, delay) => {
  await page.waitForSelector(`body[data-scene="${scene}"]`, { timeout: 60_000 });
  await page.waitForTimeout(delay);
  await page.screenshot({ path: `shots/${name}.png` });
  console.log('shot', name);
};
await at('1-sun', 'sun', 3000);
await page.getByTestId('sun').click({ force: true });
await at('2-oracle', 'oracle', 4500);
await at('3-seal', 'seal', 3200);
await at('4-kaishu', 'kaishu', 2800);
await at('5-order', 'order', 3500);
await at('6-trace', 'trace', 1500);
await browser.close();
