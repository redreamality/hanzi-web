// 「月」：通用测试加上本字特有的判定。
import { test, expect } from '@playwright/test';
import { lessonTests, open, start, enterTrace, drawStroke, tapPicture, scene } from './lesson.js';

lessonTests('yue');

test('月：跳着写第三笔不算', async ({ page }) => {
  await enterTrace(page, 'yue');
  await drawStroke(page, 2);
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
});

test('月：夜色跟着月亮来，描红时收干净', async ({ page }) => {
  await start(page, 'yue');
  await expect(page.locator('#scenery circle').first()).toBeVisible();
  await page.getByTestId('btn-write').click();
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
  await expect(page.locator('#scenery')).toBeEmpty();
});

// 变形的最后一步用的是笔画数据的中线，切到笔顺动画时不能「跳」
test('月：楷书变形要和真正的笔画对上', async ({ page }) => {
  await open(page, 'yue');
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
