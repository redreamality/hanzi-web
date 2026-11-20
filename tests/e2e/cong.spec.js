// 「从」：通用测试加上本字特有的判定。
import { test, expect } from '@playwright/test';
import { lessonTests, scene, open, tapPicture } from './lesson.js';

lessonTests('cong');

// 楷书形态的最后一帧要和真实笔画外框对齐（四笔逐笔比），不然切到笔顺动画会「跳」。
// fast 模式下场景一闪而过，所以在变形过程中轮询，等到对上的那一刻。
test('从：变形的楷书和笔画数据的外框对齐', async ({ page }) => {
  await open(page, 'cong');
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
  await page.waitForFunction(() => window.__checkAlign(), null, { timeout: 15_000 });
});

// 考据基准（etymology.md「从」条）：两个人一前一后相随——前面的人头略高、
// 后面的人略低，两人之间留纸面空隙（部件分明，同拓片）；画面里两只手牵在一起。
// fast 模式下场景一闪而过，用 rAF 持续采样、按场景记录每个部件的最后一帧外框。
test('从：画面牵手，甲骨文和小篆都是一前一后两个人', async ({ page }) => {
  await open(page, 'cong');
  await page.getByTestId('start').click();
  await page.waitForSelector('body[data-scene="picture"]');
  // 等大人小孩都画完（空 path 的外框是 0 会污染联合框）
  await page.waitForFunction(() => {
    const parts = [...document.querySelectorAll('#picture-layer [data-part]')];
    return parts.length >= 4 && parts.every((p) => p.getBBox().height > 150);
  }, null, { timeout: 10_000 });
  // 画面：两条手臂的收笔要碰到（牵着手）
  const hands = await page.evaluate(() => {
    const pick = (name) => document.querySelector(`#picture-layer [data-part="${name}"]`).getBBox();
    const lead = pick('leadBody');
    const follow = pick('followBody');
    return { gap: follow.x - (lead.x + lead.width) };
  });
  expect(hands.gap).toBeLessThan(30); // 手挨着手（负数表示叠上）
  // 摸一下开始变形；采样每个场景里四个部件的外框（每个场景记最后一帧）
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
  // 甲骨文：一前一后——前面人的头顶更高，后面人整体低一截；两人之间留空隙
  const o = parts.oracle;
  for (const k of ['leadBody', 'leadLeg', 'followBody', 'followLeg']) expect(o[k]).toBeTruthy();
  for (const k of ['leadBody', 'leadLeg', 'followBody', 'followLeg']) expect(o[k].y1 - o[k].y0).toBeGreaterThan(250);
  expect(o.followBody.y0).toBeGreaterThan(o.leadBody.y0 + 40);
  expect(o.followBody.x0 - o.leadBody.x1).toBeGreaterThan(60);
  // 小篆：还是分开的两个人（两个窄长的拱）
  const z = parts.seal;
  expect(z.followBody.x0 - z.leadBody.x1).toBeGreaterThan(30);
  expect(z.followBody.y0).toBeGreaterThan(z.leadBody.y0 + 20);
});
