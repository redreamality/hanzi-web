// 「比」：通用测试加上本字特有的判定。
// 特有测试覆盖：楷书终形对齐（SOP 2.8）、甲骨文「并肩」形态锁定（区别于「从」的前后跟随）、
// 家族比较环节台词必点（hanzi-network spec「家族聚簇」：从是前后跟着，比是肩并肩）。
import { test, expect } from '@playwright/test';
import { lessonTests, tapPicture, scene, open } from './lesson.js';

lessonTests('bi');

// 楷书形态的最后一帧要和真实笔画外框对齐，不然切到笔顺动画会「跳」。
// fast 模式下场景一闪而过，所以在变形过程中轮询，等到对上的那一刻。
test('比：变形的楷书和笔画数据的外框对齐', async ({ page }) => {
  await open(page, 'bi');
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
      // fast 模式下 kaishu 场景一闪而过，但终形在 order 场景（压淡、淡出）一直维持，
      // 所以不筛场景：seal→kaishu 的插值中途四笔不会同时对上，对上了就是终形
      const paths = [...document.querySelectorAll('#morph-layer .morph path')];
      if (paths.length < 4) return false;
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
  await page.waitForFunction(() => window.__checkAlign(), null, { timeout: 20_000 });
});

// 形态基准（etymology.md「比」条）：甲骨文两人并肩同向——左右两组笔画在横向上分开、
// 高度一致；「从」才是两人一前一后（横向交叠、高低错落）。量每一笔的外框来锁定。
test('比：甲骨文的两个人是肩并肩，不是一前一后', async ({ page }) => {
  await open(page, 'bi');
  await page.getByTestId('start').click();
  await tapPicture(page);
  const layout = await page
    .waitForFunction(() => {
      if (document.body.dataset.scene !== 'oracle') return null;
      const m = document.querySelector('#morph-layer .morph');
      if (!m || Number(m.getAttribute('opacity') ?? 0) < 0.9) return null;
      const box = (sel) => {
        let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
        for (const p of document.querySelectorAll(sel)) {
          const b = p.getBBox();
          if (b.width < 1 || b.height < 1) continue; // 空路径不进联合外框
          x0 = Math.min(x0, b.x); x1 = Math.max(x1, b.x + b.width);
          y0 = Math.min(y0, b.y); y1 = Math.max(y1, b.y + b.height);
        }
        if (x0 > x1) return null;
        return { x0, x1, cy: (y0 + y1) / 2 };
      };
      const left = box('#morph-layer .morph path[data-part="heng"], #morph-layer .morph path[data-part="ti"]');
      const right = box('#morph-layer .morph path[data-part="pie"], #morph-layer .morph path[data-part="gou"]');
      if (!left || !right) return null;
      return { gap: right.x0 - left.x1, dy: Math.abs(left.cy - right.cy) };
    })
    .then((r) => r.jsonValue());
  // 左右两组完全分开（并排站着），高低一致（不前后错开）
  expect(layout.gap).toBeGreaterThan(0);
  expect(layout.dy).toBeLessThan(90);
});

// 家族比较环节必点（任务卡 / hanzi-network spec）：台词要点出「从是前后跟着，比是肩并肩」。
test('比：比较环节点出「从」和「肩并肩」', async ({ page }) => {
  await open(page, 'bi');
  const line = await page.evaluate(() => window.hz.data.lines.kaishu);
  expect(line).toContain('肩并肩');
  expect(line).toContain('从');
});
