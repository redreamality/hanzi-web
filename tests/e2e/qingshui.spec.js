// 「清」：通用测试加上本字特有的判定。
import { test, expect } from '@playwright/test';
import { lessonTests, open, start, enterTrace, drawStroke, tapPicture, scene } from './lesson.js';

lessonTests('qingshui');

// 三点水（前三笔点、点、提）没写完，跳去写右边青的横不算
test('清：跳去写右边青的横不算', async ({ page }) => {
  await enterTrace(page, 'qingshui');
  await drawStroke(page, 3);
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
});

// 提是从下往上挑的：倒着从上往下滑不算，顺着写才进到下一笔
test('清：第三笔提倒着写不算', async ({ page }) => {
  await enterTrace(page, 'qingshui');
  await drawStroke(page, 0);
  await drawStroke(page, 1);
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '2');
  await drawStroke(page, 2, { reverse: true });
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '2');
  await drawStroke(page, 2);
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '3');
});

// 组字时远山和水色都在背景里；进描红要把背景收干净
test('清：组字时背景有远山，描红时收干净', async ({ page }) => {
  await start(page, 'qingshui');
  await expect(page.locator('#scenery path').first()).toBeVisible();
  await page.getByTestId('btn-write').click();
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
  await expect(page.locator('#scenery')).toBeEmpty();
});

// 变形的最后一步用的是笔画数据的中线，切到笔顺动画时不能「跳」
test('清：楷书变形要和真正的笔画对上', async ({ page }) => {
  await open(page, 'qingshui');
  await page.getByTestId('start').click();
  await tapPicture(page);
  await page.waitForFunction(() => document.querySelector('#morph-layer .morph').dataset.kaishuBox, null, {
    timeout: 20_000,
  });
  const gap = await page.evaluate(() => {
    const [mcx, mcy, mw, mh] = document.querySelector('#morph-layer .morph').dataset.kaishuBox.split(',').map(Number);
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const m of window.hz.data.medians)
      for (const [x, y] of m) {
        x1 = Math.min(x1, x); y1 = Math.min(y1, y);
        x2 = Math.max(x2, x); y2 = Math.max(y2, y);
      }
    // 笔画数据 y 朝上，屏幕 y 朝下
    return {
      dx: Math.abs(mcx - (x1 + x2) / 2),
      dy: Math.abs(mcy - (900 - (y1 + y2) / 2)),
      dw: Math.abs(mw - (x2 - x1)),
      dh: Math.abs(mh - (y2 - y1)),
    };
  });
  expect(gap.dx).toBeLessThan(40);
  expect(gap.dy).toBeLessThan(40);
  expect(gap.dw).toBeLessThan(50);
  expect(gap.dh).toBeLessThan(50);
});
