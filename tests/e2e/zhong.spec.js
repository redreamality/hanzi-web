// 「众」：通用测试加上本字特有的判定。
import { test, expect } from '@playwright/test';
import { lessonTests, scene, open, tapPicture } from './lesson.js';

lessonTests('zhong');

// 楷书形态的最后一帧要和真实笔画外框对齐（六笔逐笔比），不然切到笔顺动画会「跳」。
// fast 模式下场景一闪而过，所以在变形过程中轮询，等到对上的那一刻。
test('众：变形的楷书和笔画数据的外框对齐', async ({ page }) => {
  await open(page, 'zhong');
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
      if (paths.length < 6) return false;
      return window.hz.data.strokes.every((d, i) => {
        const b = paths[i].getBBox();
        const m = { x0: b.x, x1: b.x + b.width, y0: b.y, y1: b.y + b.height };
        const k = outlineBox(d);
        return ['x0', 'x1', 'y0', 'y1'].every((key) => Math.abs(m[key] - k[key]) < 42);
      });
    };
  });
  await page.getByTestId('start').click();
  await tapPicture(page);
  await page.waitForFunction(() => window.__checkAlign(), null, { timeout: 15_000 });
});

// 任务卡【需特有测试：叠加动线/形态断言】：
// 一个人（两个部件）→ 两个人（四个，一左一右，正是「从」的布局）
// → 三个人（六个，品字叠立：上面的居中且更高，下面一左一右）。
// fast 模式下场景一闪而过，用 rAF 持续采样、按场景记录每个部件的最后一帧外框。
test('众：一人二人三人叠起来，三人成品字', async ({ page }) => {
  await open(page, 'zhong');
  await page.getByTestId('start').click();
  await page.waitForSelector('body[data-scene="picture"]');
  // 等人群画完（空 path 的外框是 0 会污染联合框）
  await page.waitForFunction(() => {
    const kids = [...document.querySelectorAll('#picture-layer .crowd path[data-part]')];
    return kids.length >= 14 && kids.every((p) => p.getBBox().height > 80);
  }, null, { timeout: 10_000 });
  // 摸一下开始变形；采样每个场景里六个部件的外框（每个场景记最后一帧）
  await page.evaluate(() => {
    window.__parts = {};
    const sample = () => {
      const s = document.body.dataset.scene;
      const rec = (window.__parts[s] ??= {});
      const m = document.querySelector('#morph-layer .morph');
      if (m && Number(m.getAttribute('opacity') ?? 0) > 0.5) {
        for (const p of m.querySelectorAll('path[data-part]')) {
          const b = p.getBBox();
          if (b.width > 1 && b.height > 1) rec[p.dataset.part] = { x0: b.x, x1: b.x + b.width, y0: b.y, y1: b.y + b.height };
        }
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await tapPicture(page);
  await page.waitForSelector('body[data-scene="trace"]', { timeout: 20_000 });
  const parts = await page.evaluate(() => window.__parts);
  // 一个人：只有 frontBody/frontLeg 两个部件
  expect(Object.keys(parts.one).sort()).toEqual(['frontBody', 'frontLeg']);
  // 两个人：四个部件，一左一右（正是「从」的两个人）
  expect(Object.keys(parts.duo).sort()).toEqual(['backBody', 'backLeg', 'frontBody', 'frontLeg']);
  expect(parts.duo.backBody.x0 - parts.duo.frontBody.x1).toBeGreaterThan(100);
  // 三个人：六个部件都在，品字叠立——上面的居中、更高；下面一左一右
  expect(Object.keys(parts.trio).length).toBe(6);
  const center = (b) => (b.x0 + b.x1) / 2;
  expect(center(parts.trio.topBody)).toBeGreaterThan(center(parts.trio.frontBody) + 50);
  expect(center(parts.trio.topBody)).toBeLessThan(center(parts.trio.backBody) - 50);
  expect(parts.trio.topBody.y0).toBeLessThan(parts.trio.frontBody.y0 - 250);
  expect(parts.trio.topBody.y0).toBeLessThan(parts.trio.backBody.y0 - 250);
  // 楷书时三个人还在（六笔齐全）
  expect(Object.keys(parts.kaishu).length).toBe(6);
});
