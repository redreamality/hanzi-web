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

// 形态基准（etymology.md「比」条 + 2026-11-20 审计）：甲骨文两人并肩同向、贴肩紧挨——
// 左右两组笔画的横向间隙不超过全宽的百分之六（拓片 F609 是 0.01、F60A 交错；改前 0.24 偏松），
// 高度一致；「从」才是两人一前一后（横向交叠、高低错落）。量每一笔的外框来锁定。
// 变形从实物小孩起手（起手间隙约 160）一路收到贴肩：fast 下逐帧采样记间隙最小值（≈终形），不赌时序。
test('比：甲骨文的两个人贴着肩并排，不是松松地站着', async ({ page }) => {
  await open(page, 'bi');
  await page.evaluate(() => {
    window.__oracle = null;
    const box = (sel) => {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const p of document.querySelectorAll(sel)) {
        const b = p.getBBox();
        if (b.width < 1 || b.height < 1) continue; // 空路径不进联合外框
        x0 = Math.min(x0, b.x); x1 = Math.max(x1, b.x + b.width);
        y0 = Math.min(y0, b.y); y1 = Math.max(y1, b.y + b.height);
      }
      return x0 > x1 ? null : { x0, x1, cy: (y0 + y1) / 2 };
    };
    const sample = () => {
      if (document.body.dataset.scene === 'oracle') {
        const m = document.querySelector('#morph-layer .morph');
        if (m && Number(m.getAttribute('opacity') ?? 0) >= 0.9) {
          const left = box('#morph-layer .morph path[data-part="heng"], #morph-layer .morph path[data-part="ti"]');
          const right = box('#morph-layer .morph path[data-part="pie"], #morph-layer .morph path[data-part="gou"]');
          if (left && right) {
            const gap = right.x0 - left.x1;
            const whole = Math.max(right.x1, left.x1) - Math.min(right.x0, left.x0);
            const rec = (window.__oracle ??= { gap: 1e9, dy: 1e9 });
            rec.gap = Math.min(rec.gap, gap);
            rec.gapFrac = Math.min(rec.gapFrac ?? 1e9, gap / whole);
            rec.dy = Math.abs(left.cy - right.cy);
          }
        }
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.getByTestId('start').click();
  await tapPicture(page);
  await page.waitForSelector('body[data-scene="trace"]', { timeout: 20_000 });
  const layout = await page.evaluate(() => window.__oracle);
  // 左右两组还各自成一体（贴肩不粘连、没有连成一片），但间隙很窄
  expect(layout).toBeTruthy();
  expect(layout.gap).toBeGreaterThan(0);
  expect(layout.gapFrac).toBeLessThan(0.06);
  // 高度一致（不前后错开）
  expect(layout.dy).toBeLessThan(90);
});

// 家族比较环节必点（任务卡 / hanzi-network spec）：台词要点出「从是前后跟着，比是肩并肩」。
test('比：比较环节点出「从」和「肩并肩」', async ({ page }) => {
  await open(page, 'bi');
  const line = await page.evaluate(() => window.hz.data.lines.kaishu);
  expect(line).toContain('肩并肩');
  expect(line).toContain('从');
});
