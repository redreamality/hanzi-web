// 「森」：通用测试加上本字特有的判定。
import { test, expect } from '@playwright/test';
import { lessonTests, open, start, enterTrace, drawStroke, tapPicture, scene } from './lesson.js';

lessonTests('sen');

test('森：跳着写下左木的横不算', async ({ page }) => {
  await enterTrace(page, 'sen');
  await drawStroke(page, 4);
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
});

test('森：先写上木的竖不算；按笔顺写完三棵木就收尾', async ({ page }) => {
  await enterTrace(page, 'sen');
  await drawStroke(page, 1);
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
  for (let i = 0; i < 12; i++) {
    await expect(scene(page)).toHaveAttribute('data-stroke-index', String(i));
    await drawStroke(page, i);
  }
  await expect(scene(page)).toHaveAttribute('data-scene', 'done');
});

test('森：画面是三棵树，字是三个木，描红时背景收干净', async ({ page }) => {
  await start(page, 'sen');
  await expect(page.locator('#picture-layer .sen-tree')).toHaveCount(3);
  await expect(page.locator('#morph-layer .morph path')).toHaveCount(15);
  await page.getByTestId('btn-write').click();
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
  await expect(page.locator('#scenery')).toBeEmpty();
});

// 变形的最后一步用的是笔画数据的中线，切到笔顺动画时不能「跳」
test('森：楷书变形要和真正的笔画对上', async ({ page }) => {
  await open(page, 'sen');
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
