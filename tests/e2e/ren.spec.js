// 「人」：通用测试加上本字特有的判定。
import { test, expect } from '@playwright/test';
import { lessonTests, enterTrace, drawStroke, scene, open } from './lesson.js';

lessonTests('ren');

test('人：先写捺不算，还停在第一笔', async ({ page }) => {
  await enterTrace(page, 'ren');
  await drawStroke(page, 1);
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
});

// 楷书形态的最后一帧要和真实笔画外框对齐，不然切到笔顺动画会「跳」。
// fast 模式下场景一闪而过，所以在变形过程中轮询，等到对上的那一刻。
test('人：变形的楷书和笔画数据的外框对齐', async ({ page }) => {
  await open(page, 'ren');
  await page.evaluate(() => {
    const outlineBox = (d) => {
      const v = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (let i = 0; i + 1 < v.length; i += 2) {
        x0 = Math.min(x0, v[i]);
        x1 = Math.max(x1, v[i]);
        y0 = Math.min(y0, 900 - v[i + 1]); // 笔画数据 y 朝上，换成舞台坐标
        y1 = Math.max(y1, 900 - v[i + 1]);
      }
      return { x0, x1, y0, y1 };
    };
    window.__checkAlign = () => {
      const paths = [...document.querySelectorAll('#morph-layer .morph path')];
      if (paths.length < 2) return false;
      return window.hz.data.strokes.every((d, i) => {
        const b = paths[i].getBBox();
        const m = { x0: b.x, x1: b.x + b.width, y0: b.y, y1: b.y + b.height };
        const k = outlineBox(d);
        return ['x0', 'x1', 'y0', 'y1'].every((key) => Math.abs(m[key] - k[key]) < 42);
      });
    };
  });
  await page.getByTestId('start').click();
  await page.getByTestId('picture').click({ force: true });
  await page.waitForFunction(() => window.__checkAlign(), null, { timeout: 15_000 });
});
