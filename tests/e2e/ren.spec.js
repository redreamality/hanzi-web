// 「人」：通用测试加上本字特有的判定。
import { test, expect } from '@playwright/test';
import { lessonTests, enterTrace, drawStroke, scene, open } from './lesson.js';

lessonTests('ren');

test('人：先写捺不算，还停在第一笔', async ({ page }) => {
  await enterTrace(page, 'ren');
  await drawStroke(page, 1);
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
});

// 返修基准（etymology.md「人」条）：实物小人和甲骨文都是侧立直立人形，不深弯腰。
// 深弯腰的旧形态会把整个字左右拉得很宽（约 450+），直立人形是窄高的（约 200-300）。
// fast 模式下场景一闪而过，所以用 rAF 持续采样、按场景记录字形外框宽度，不赌时序。
test('人：小人和甲骨文都是直立人形，不深弯腰', async ({ page }) => {
  await open(page, 'ren');
  await page.getByTestId('start').click();
  await page.waitForSelector('body[data-scene="picture"]');
  // 等小人画完（fast 模式下起手时腿还没落笔，空 path 的外框是 0 会污染联合框）
  await page.waitForFunction(() => {
    const parts = [...document.querySelectorAll('#picture-layer [data-part]')];
    return parts.length >= 2 && parts.every((p) => p.getBBox().height > 400);
  }, null, { timeout: 10_000 });
  // 实物小人：只量 body/leg 两条笔画（地面线和晕染不算）
  const personWidth = await page.evaluate(() => {
    const parts = [...document.querySelectorAll('#picture-layer [data-part]')].filter((p) => {
      const b = p.getBBox();
      return b.width > 1 && b.height > 1;
    });
    let x0 = 1e9, x1 = -1e9;
    for (const p of parts) {
      const b = p.getBBox();
      x0 = Math.min(x0, b.x);
      x1 = Math.max(x1, b.x + b.width);
    }
    return { n: parts.length, w: x1 - x0 };
  });
  expect(personWidth.n).toBeGreaterThanOrEqual(2);
  expect(personWidth.w).toBeLessThan(320);
  // 摸一下小人，开始变形；采样每个场景里字形的外框宽度
  await page.evaluate(() => {
    window.__formWidths = {};
    const sample = () => {
      const s = document.body.dataset.scene;
      const m = document.querySelector('#morph-layer .morph');
      if (m && Number(m.getAttribute('opacity') ?? 0) > 0.5) {
        const b = m.getBBox();
        const rec = (window.__formWidths[s] ??= { min: 1e9, max: 0 });
        rec.min = Math.min(rec.min, b.width);
        rec.max = Math.max(rec.max, b.width);
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.getByTestId('picture').click({ force: true });
  await page.waitForSelector('body[data-scene="trace"]', { timeout: 20_000 });
  const widths = await page.evaluate(() => window.__formWidths);
  expect(widths.oracle).toBeTruthy();
  expect(widths.oracle.max).toBeGreaterThan(120);
  expect(widths.oracle.max).toBeLessThan(320);
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
