// 「林」：通用测试加上本字特有的判定。
import { test, expect } from '@playwright/test';
import { lessonTests, enterTrace, drawStroke, scene, open, tapPicture } from './lesson.js';

lessonTests('lin');

// 左木、右木是两棵独立的树：先写右木的笔画不算
test('林：先写右边的木不算', async ({ page }) => {
  await enterTrace(page, 'lin');
  await drawStroke(page, 4);
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
});

// 按 横竖撇捺 写完左木、再写右木就收尾
test('林：左边写对才算数，整字写完就收尾', async ({ page }) => {
  await enterTrace(page, 'lin');
  await drawStroke(page, 5);
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
  for (let i = 0; i < 8; i++) {
    await expect(scene(page)).toHaveAttribute('data-stroke-index', String(i));
    await drawStroke(page, i);
  }
  await expect(scene(page)).toHaveAttribute('data-scene', 'done');
});

// 楷书最后一步要和真实笔画的外框对齐（差太多切到笔顺动画时就会「跳」）
test('林：楷书最后一步和笔画外框对齐', async ({ page }) => {
  await open(page, 'lin');
  await page.evaluate(() => {
    // 快速模式下场景一闪而过，用 MutationObserver 记下变形图层最后一次的几何
    const g = document.querySelector('[data-testid="morph"]');
    window.__morphD = new WeakMap();
    window.__morphW = new WeakMap();
    new MutationObserver((records) => {
      for (const r of records) {
        const el = r.target;
        if (el.tagName !== 'path') continue;
        window.__morphD.set(el, el.getAttribute('d'));
        window.__morphW.set(el, Number(el.getAttribute('stroke-width')) || 0);
      }
    }).observe(g, { subtree: true, attributes: true, attributeFilter: ['d', 'stroke-width'] });
  });
  await tapPicture(page);
  await expect(scene(page)).toHaveAttribute('data-scene', 'trace', { timeout: 20_000 });
  const box = await page.evaluate(() => {
    // 变形楷书的包围盒：点集包围盒，再各加半个笔宽
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const el of document.querySelectorAll('[data-testid="morph"] path')) {
      const d = window.__morphD.get(el);
      if (!d) continue;
      const hw = window.__morphW.get(el) / 2;
      const nums = d.match(/-?\d+(\.\d+)?/g).map(Number);
      for (let i = 0; i < nums.length; i += 2) {
        x0 = Math.min(x0, nums[i] - hw);
        y0 = Math.min(y0, nums[i + 1] - hw);
        x1 = Math.max(x1, nums[i] + hw);
        y1 = Math.max(y1, nums[i + 1] + hw);
      }
    }
    // 真实笔画外框的包围盒（data 坐标 y 朝上，换成 900 - y）
    let kx0 = Infinity, ky0 = Infinity, kx1 = -Infinity, ky1 = -Infinity;
    for (const s of window.hz.data.strokes) {
      const nums = s.match(/-?\d+(\.\d+)?/g).map(Number);
      for (let i = 0; i < nums.length; i += 2) {
        const x = nums[i], y = 900 - nums[i + 1];
        kx0 = Math.min(kx0, x);
        ky0 = Math.min(ky0, y);
        kx1 = Math.max(kx1, x);
        ky1 = Math.max(ky1, y);
      }
    }
    return { morph: [x0, y0, x1, y1], outline: [kx0, ky0, kx1, ky1] };
  });
  const [mx0, my0, mx1, my1] = box.morph;
  const [kx0, ky0, kx1, ky1] = box.outline;
  const TOL = 35;
  expect(mx0).toBeGreaterThanOrEqual(kx0 - TOL);
  expect(mx1).toBeLessThanOrEqual(kx1 + TOL);
  expect(my0).toBeGreaterThanOrEqual(ky0 - TOL);
  expect(my1).toBeLessThanOrEqual(ky1 + TOL);
});
