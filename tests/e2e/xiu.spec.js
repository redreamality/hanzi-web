// 「休」：通用测试加上本字特有的判定。
import { test, expect } from '@playwright/test';
import { lessonTests, enterTrace, drawStroke, scene, open, tapPicture } from './lesson.js';

lessonTests('xiu');

// 撇竖横竖撇捺：先写最后一笔捺不算；按笔顺写完六笔就收尾
test('休：先写捺不算；按撇竖横竖撇捺写完就收尾', async ({ page }) => {
  await enterTrace(page, 'xiu');
  await drawStroke(page, 5);
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
  for (let i = 0; i < 6; i++) {
    await expect(scene(page)).toHaveAttribute('data-stroke-index', String(i));
    await drawStroke(page, i);
  }
  await expect(scene(page)).toHaveAttribute('data-scene', 'done');
});

// 木的长竖倒着写不算（第四笔）
test('休：第四笔竖倒着写不算', async ({ page }) => {
  await enterTrace(page, 'xiu');
  for (let i = 0; i < 3; i++) {
    await expect(scene(page)).toHaveAttribute('data-stroke-index', String(i));
    await drawStroke(page, i);
  }
  await drawStroke(page, 3, { reverse: true });
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '3');
});

// 楷书终形必须和笔画数据的中线外框对齐，切笔顺动画才不会「跳」
test('休：楷书终形与笔画外框对齐', async ({ page }) => {
  await open(page, 'xiu');
  await page.getByTestId('start').click();
  await tapPicture(page);
  // 楷书形态的外框宽度约九百，古文字形态只有六百上下；等到够宽再量
  const bb = await page
    .waitForFunction(() => {
      const b = document.querySelector('#morph-layer').getBBox();
      if (b.width > 780) return { x: b.x, y: b.y, w: b.width, h: b.height };
      return null;
    })
    .then((r) => r.jsonValue());
  const want = await page.evaluate(() => {
    let x0 = 1e9;
    let x1 = -1e9;
    let y0 = 1e9;
    let y1 = -1e9;
    for (const st of window.hz.data.medians) {
      for (const [x, y] of st) {
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x);
        y0 = Math.min(y0, 900 - y);
        y1 = Math.max(y1, 900 - y);
      }
    }
    return { x0, x1, y0, y1 };
  });
  expect(Math.abs(bb.x - want.x0)).toBeLessThan(60);
  expect(Math.abs(bb.x + bb.w - want.x1)).toBeLessThan(60);
  expect(Math.abs(bb.y - want.y0)).toBeLessThan(60);
  expect(Math.abs(bb.y + bb.h - want.y1)).toBeLessThan(60);
});
