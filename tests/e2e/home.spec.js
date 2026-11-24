// 首页：下一课、学过的字卡和「会」字印、即将学的淡字排、进课和回首页。
// 期望值直接从 data/ 下的 json 里读，测试跟着数据走，不用硬编码字表。
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { scene, enterTrace, drawStroke } from './lesson.js';

const index = JSON.parse(readFileSync('data/index.json', 'utf8'));

test('没学过任何字时，首页只有一张亮着的「下一课」字卡，后面跟着淡淡的预告', async ({ page }) => {
  await page.goto('/?fast');
  await expect(scene(page)).toHaveAttribute('data-scene', 'home');
  const tiles = page.getByTestId('tile');
  await expect(tiles).toHaveCount(1);
  await expect(tiles.first()).toHaveAttribute('data-char', index[0].id);
  await expect(tiles.first()).toContainText('下一课');
  const soon = page.getByTestId('tile-soon');
  await expect(soon.first()).toBeVisible();
  const soonChars = await soon.evaluateAll((els) => els.map((e) => e.textContent));
  expect(soonChars).toEqual(index.slice(1, 17).map((x) => x.char)); // 下一课之后的 16 个字
  await expect(page.getByTestId('start')).toBeHidden();
});

test('不认识的 ?c 也回首页', async ({ page }) => {
  await page.goto('/?c=nope&fast');
  await expect(scene(page)).toHaveAttribute('data-scene', 'home');
});

test('字卡和预告都在屏幕里，不用滚动', async ({ page }) => {
  await page.goto('/?fast');
  await expect(scene(page)).toHaveAttribute('data-scene', 'home');
  const vp = page.viewportSize();
  for (const el of await page.locator('#home .tile, #home .soon').all()) {
    const b = await el.boundingBox();
    expect(b.y).toBeGreaterThanOrEqual(-1);
    expect(b.y + b.height).toBeLessThanOrEqual(vp.height + 1);
    expect(b.x).toBeGreaterThanOrEqual(-1);
    expect(b.x + b.width).toBeLessThanOrEqual(vp.width + 1);
  }
});

test('学过的字排成字卡，最多摆十六张，后面跟下一课', async ({ page }) => {
  const all = index.map((x) => x.id);
  const done = all.slice(0, Math.min(20, all.length)); // 有多少课算多少；满 20 课起才真正考验 16 张上限
  await page.addInitScript((done) => localStorage.setItem('hanzi.done', JSON.stringify(done)), done);
  await page.goto('/?fast');
  const shown = done.slice(-16);
  const rest = all.slice(done.length);
  await expect(page.getByTestId('tile')).toHaveCount(shown.length + (rest.length ? 1 : 0));
  expect(await page.getByTestId('tile').evaluateAll((els) => els.map((e) => e.dataset.char))).toEqual([
    ...shown,
    ...(rest.length ? [rest[0]] : []),
  ]);
  await expect(page.locator('[data-testid="tile"][data-done]')).toHaveCount(shown.length);
  if (rest.length) await expect(page.locator('.tile.next')).toHaveAttribute('data-char', rest[0]);
});

test('点下一课的字卡，进这个字的一课', async ({ page }) => {
  await page.goto('/?fast');
  await page.locator('.tile.next').click();
  await expect(scene(page)).toHaveAttribute('data-char', index[0].id);
  await expect(scene(page)).toHaveAttribute('data-scene', 'start');
  expect(new URL(page.url()).searchParams.get('c')).toBe(index[0].id);
});

test('课里的房子按钮回到首页', async ({ page }) => {
  await enterTrace(page, 'yue');
  await page.getByTestId('btn-home').click();
  await expect(scene(page)).toHaveAttribute('data-scene', 'home');
});

test('写完一个字，首页上它盖了「会」字印，下一课顺延', async ({ page }) => {
  await enterTrace(page, 'ri');
  const n = await page.evaluate(() => window.hz.data.medians.length);
  for (let i = 0; i < n; i++) await drawStroke(page, i);
  await expect(scene(page)).toHaveAttribute('data-scene', 'done');
  await page.getByTestId('btn-home').click();
  await expect(scene(page)).toHaveAttribute('data-scene', 'home');
  await expect(page.locator('[data-char="ri"] .seal')).toHaveText('会');
  await expect(page.locator('.tile.next')).toHaveAttribute('data-char', index[1].id);
  expect(await page.locator('[data-testid="tile"][data-done]').count()).toBe(1);
});

// 回归锁：shelf 从 grid 改成 flex-wrap 后，.tile 的百分比 padding 按整条书架宽解析，
// 内容区被吃成 0，字卡上的汉字和田字格整个消失（2026-11-21 截图终审发现）。
test('字卡上的汉字真的画出来：glyph 有尺寸，标题和预告都在屏幕里', async ({ page }) => {
  const done = index.slice(0, 20).map((x) => x.id); // 字卡最多（16 张学会的＋1 张下一课）的挤压态
  await page.addInitScript((d) => localStorage.setItem('hanzi.done', JSON.stringify(d)), done);
  await page.goto('/?fast');
  await expect(scene(page)).toHaveAttribute('data-scene', 'home');
  const glyphs = await page.locator('[data-testid="tile"] svg.glyph').all();
  expect(glyphs.length).toBeGreaterThan(0);
  for (const g of glyphs) {
    const b = await g.boundingBox();
    expect(b, '汉字 SVG 不应是 0×0').toBeTruthy();
    expect(b.width).toBeGreaterThan(30);
    expect(b.height).toBeGreaterThan(30);
  }
  const vp = page.viewportSize();
  for (const sel of ['#home .title', '#home .soon-row']) {
    const b = await page.locator(sel).boundingBox();
    expect(b, `${sel} 应在页面上`).toBeTruthy();
    expect(b.y).toBeGreaterThanOrEqual(-1);
    expect(b.y + b.height).toBeLessThanOrEqual(vp.height + 1);
  }
});
