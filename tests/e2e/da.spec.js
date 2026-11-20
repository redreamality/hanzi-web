// 「大」：通用测试加上本字特有的判定。
// 特有之一：人形族比较环节——甲骨文先收成侧立的「人」（窄高），再转过来
// 张开手臂变成「大」（宽）。「人是侧着站，大是正面张开手臂」（brief 任务卡）。
// 特有之二：楷书终形与笔画数据外框对齐（横拆成左右两臂，撇是头身连左腿，捺是右腿）。
import { test, expect } from '@playwright/test';
import { lessonTests, scene, open, tapPicture } from './lesson.js';

lessonTests('da');

// 比较环节：morph 的 data-pose 要先后经历「侧立」（窄）和「张开」（宽），
// 且侧立的外框明显比张开窄——这就是「转过来张开手臂」被画面讲出来了。
// fast 模式下场景一闪而过，所以用 rAF 持续采样、按 pose 记录字形外框宽度。
test('大：甲骨文先收成侧立的人，再转过来张开手臂', async ({ page }) => {
  await open(page, 'da');
  await page.evaluate(() => {
    window.__poseWidths = {};
    const sample = () => {
      const m = document.querySelector('#morph-layer .morph');
      if (m && Number(m.getAttribute('opacity') ?? 0) > 0.5) {
        const pose = m.dataset.pose;
        const parts = [...m.querySelectorAll('path')].filter((p) => {
          const b = p.getBBox();
          return b.width > 1 && b.height > 1;
        });
        if (parts.length) {
          let x0 = 1e9, x1 = -1e9;
          for (const p of parts) {
            const b = p.getBBox();
            x0 = Math.min(x0, b.x);
            x1 = Math.max(x1, b.x + b.width);
          }
          const rec = (window.__poseWidths[pose] ??= { min: 1e9, max: 0 });
          rec.min = Math.min(rec.min, x1 - x0);
          rec.max = Math.max(rec.max, x1 - x0);
        }
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.getByTestId('start').click();
  await tapPicture(page);
  // fast 模式下场景一闪而过，不能等中间场景（等到的选择器会错过），
  // 等停住的终态 trace，比较数据由采样器全程记录
  await page.waitForSelector('body[data-scene="trace"]', { timeout: 20_000 });
  const w = await page.evaluate(() => window.__poseWidths);
  // 侧立的「人」定格要窄（和「人」课甲骨文同一量级，ren 的判据是小于三百二）；
  // pose 在变形完成后才切换，所以侧立的定格宽度取 min（收拢的最后一帧），
  // 张开的定格宽度取 max
  expect(w.side).toBeTruthy();
  expect(w.side.min).toBeGreaterThan(80);
  expect(w.side.min).toBeLessThan(280);
  // 张开手臂的「大」明显更宽
  expect(w.open).toBeTruthy();
  expect(w.open.max).toBeGreaterThan(320);
  // 从侧立到张开是拓宽（比较点：人窄、大宽）
  expect(w.open.max - w.side.min).toBeGreaterThan(120);
});

// 楷书形态的最后一帧要和真实笔画外框对齐，不然切到笔顺动画会「跳」。
// 「大」的四笔对应三笔：armL＋armR ↔ 横，body ↔ 撇，leg ↔ 捺。
// fast 模式下场景一闪而过，所以在变形过程中轮询，等到对上的那一刻。
test('大：变形的楷书和笔画数据的外框对齐', async ({ page }) => {
  await open(page, 'da');
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
    const unionBox = (paths) => {
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const p of paths) {
        const b = p.getBBox();
        if (b.width < 1 && b.height < 1) continue; // 空 path 不进联合外框
        x0 = Math.min(x0, b.x);
        x1 = Math.max(x1, b.x + b.width);
        y0 = Math.min(y0, b.y);
        y1 = Math.max(y1, b.y + b.height);
      }
      return { x0, x1, y0, y1 };
    };
    window.__checkAlign = () => {
      const m = document.querySelector('#morph-layer .morph');
      if (!m || Number(m.getAttribute('opacity') ?? 0) < 0.9) return false;
      const of = (name) => m.querySelector(`path[data-part="${name}"]`);
      const pairs = [
        [[of('armL'), of('armR')], 0],
        [[of('body')], 1],
        [[of('leg')], 2],
      ];
      return pairs.every(([paths, i]) => {
        if (paths.some((p) => !p)) return false;
        const u = unionBox(paths);
        const k = outlineBox(window.hz.data.strokes[i]);
        return ['x0', 'x1', 'y0', 'y1'].every((key) => Math.abs(u[key] - k[key]) < 42);
      });
    };
  });
  await page.getByTestId('start').click();
  await tapPicture(page);
  await page.waitForFunction(() => window.__checkAlign(), null, { timeout: 20_000 });
});
