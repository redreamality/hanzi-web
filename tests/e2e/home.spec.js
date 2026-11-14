// 首页：选字、读字音、进课、回首页、写会了盖印。
import { test, expect } from '@playwright/test';
import { scene, enterTrace, drawStroke } from './lesson.js';

const lessons = ['ri', 'yue', 'mu', 'ren', 'lin'];

test('不带 ?c 打开的是首页，学过的字按顺序排好，还没做的字点不了', async ({ page }) => {
  await page.goto('/?fast');
  await expect(scene(page)).toHaveAttribute('data-scene', 'home');
  const tiles = page.getByTestId('tile');
  await expect(tiles).toHaveCount(lessons.length);
  expect(await tiles.evaluateAll((els) => els.map((e) => e.dataset.char))).toEqual(lessons);
  await expect(page.getByTestId('tile-soon').first()).toBeVisible();
  await expect(page.getByTestId('start')).toBeHidden();
  await expect(page.getByTestId('btn-write')).toBeHidden();
});

test('不认识的 ?c 也回首页', async ({ page }) => {
  await page.goto('/?c=nope&fast');
  await expect(scene(page)).toHaveAttribute('data-scene', 'home');
});

test('字卡都在屏幕里，不用滚动', async ({ page }) => {
  await page.goto('/?fast');
  await expect(scene(page)).toHaveAttribute('data-scene', 'home');
  const vp = page.viewportSize();
  for (const el of await page.locator('#home .tile, #home .soon').all()) {
    const b = await el.boundingBox();
    expect(b.y).toBeGreaterThanOrEqual(0);
    expect(b.y + b.height).toBeLessThanOrEqual(vp.height);
    expect(b.x + b.width).toBeLessThanOrEqual(vp.width);
  }
});

test('点字卡进这个字的一课', async ({ page }) => {
  await page.goto('/?fast');
  await page.locator('[data-testid="tile"][data-char="mu"]').click();
  await expect(scene(page)).toHaveAttribute('data-char', 'mu');
  await expect(scene(page)).toHaveAttribute('data-scene', 'start');
  expect(new URL(page.url()).searchParams.get('c')).toBe('mu');
});

test('课里的房子按钮回到首页', async ({ page }) => {
  await enterTrace(page, 'yue');
  await page.getByTestId('btn-home').click();
  await expect(scene(page)).toHaveAttribute('data-scene', 'home');
});

test('写完一个字，首页上它盖了「会」字印，别的字没有', async ({ page }) => {
  await enterTrace(page, 'ri');
  const n = await page.evaluate(() => window.hz.data.medians.length);
  for (let i = 0; i < n; i++) await drawStroke(page, i);
  await expect(scene(page)).toHaveAttribute('data-scene', 'done');
  await page.getByTestId('btn-home').click();
  await expect(scene(page)).toHaveAttribute('data-scene', 'home');
  await expect(page.locator('[data-testid="tile"][data-done]')).toHaveCount(1);
  await expect(page.locator('[data-char="ri"] .seal')).toHaveText('会');
});
