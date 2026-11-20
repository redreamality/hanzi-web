// 「火」：通用测试加上本字特有的判定（考据基准：etymology.md「火」条）。
import { test, expect } from '@playwright/test';
import { lessonTests, scene, open, start, tapPicture } from './lesson.js';

lessonTests('huo');

// 楷书形态的最后一帧要和真实笔画外框对齐（四笔逐笔比），不然切到笔顺动画会「跳」。
// fast 模式下场景一闪而过，所以在变形过程中轮询，等到对上的那一刻。
test('火：变形的楷书和笔画数据的外框对齐', async ({ page }) => {
  await open(page, 'huo');
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

// 考据基准（etymology.md「火」条，拓片 refs/huo/）：甲骨文＝主焰一笔贯通（中峰最高）
// ＋左右两颗游离的小火星（与主焰不相连）；小篆＝中线一笔贯底、两颗火星变成两侧浮线。
// fast 模式下场景一闪而过，用 rAF 持续采样、按场景记录每个部件的最后一帧外框。
test('火：甲骨文主焰贯通两侧火星游离，小篆两侧浮线分立', async ({ page }) => {
  await open(page, 'huo');
  await page.getByTestId('start').click();
  await page.waitForSelector('body[data-scene="picture"]');
  // 等火苗画完（空 path 的外框是 0 会污染联合框）
  await page.waitForFunction(() => {
    const parts = [...document.querySelectorAll('#picture-layer [data-huo-tongue]')];
    return parts.length >= 4 && parts.every((p) => p.getBBox().height > 100);
  }, null, { timeout: 10_000 });
  // 摸一下开始变形；采样每个场景里四个部件的外框和「火星中心点是否落在主焰里」
  await page.evaluate(() => {
    window.__parts = {};
    const sample = () => {
      const s = document.body.dataset.scene;
      const rec = (window.__parts[s] ??= {});
      const m = document.querySelector('#morph-layer .morph');
      if (m && Number(m.getAttribute('opacity') ?? 0) > 0.5) {
        const paths = Object.fromEntries([...m.querySelectorAll('path[data-part]')].map((p) => [p.dataset.part, p]));
        const box = (p) => {
          const b = p.getBBox();
          return { x0: b.x, x1: b.x + b.width, y0: b.y, y1: b.y + b.height };
        };
        for (const [name, p] of Object.entries(paths)) {
          const b = p.getBBox();
          if (b.width > 1 && b.height > 1) rec[name] = box(p);
        }
        if (rec.main && rec.sparkL && rec.sparkR && paths.main) {
          // 火星中心点是否落在主焰笔画里（游离＝不在）
          const center = (b) => new DOMPoint((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2);
          rec.sparkLInMain = paths.main.isPointInFill(center(rec.sparkL));
          rec.sparkRInMain = paths.main.isPointInFill(center(rec.sparkR));
        }
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await tapPicture(page);
  await page.waitForSelector('body[data-scene="trace"]', { timeout: 20_000 });
  const parts = await page.evaluate(() => window.__parts);
  // 甲骨文：主焰一笔最高最长；两颗火星矮得多、分列左右、不与主焰相连
  const o = parts.oracle;
  for (const k of ['sparkL', 'sparkR', 'main', 'right']) expect(o[k]).toBeTruthy();
  const mainH = o.main.y1 - o.main.y0;
  expect(mainH).toBeGreaterThan(600);
  expect(o.sparkL.y1 - o.sparkL.y0).toBeLessThan(mainH * 0.6);
  expect(o.sparkR.y1 - o.sparkR.y0).toBeLessThan(mainH * 0.6);
  expect(o.sparkL.x1).toBeLessThan(440); // 左火星整体在主焰躯干左侧
  expect(o.sparkR.x0).toBeGreaterThan(550); // 右火星整体在主焰躯干右侧
  expect(o.sparkLInMain).toBe(false); // 游离（拓片：火星与主焰不相连）
  expect(o.sparkRInMain).toBe(false);
  // 小篆：中线仍是一笔贯底，两颗火星拉成两侧浮线，依旧分立不相连
  const z = parts.seal;
  for (const k of ['sparkL', 'sparkR', 'main']) expect(z[k]).toBeTruthy();
  expect(z.main.y1 - z.main.y0).toBeGreaterThan(600);
  expect(z.sparkL.x1).toBeLessThan(460);
  expect(z.sparkR.x0).toBeGreaterThan(540);
  expect(z.sparkLInMain).toBe(false);
});

// 火族色系（etymology.md 色系表）：外焰绛红、焰心暖黄，与日系朱砂平涂拉开层次。
test('火：火苗用火族色系——外焰绛红、焰心暖黄', async ({ page }) => {
  await open(page, 'huo');
  const colors = await page.evaluate(() => {
    const pick = (id) => document.querySelector(`#picture-layer [data-huo-part="${id}"]`)?.getAttribute('fill');
    return { outer: pick('flame-outer'), core: pick('flame-core') };
  });
  expect(colors.outer).toBe('#8e2b36'); // 绛红
  expect(colors.core).toBe('#fbe3a0'); // 焰心暖黄系最亮层
});

// 命中区要罩住视觉主体（审美红线 2.4），透明命中罩必须画在实物层最上层（前批教训：
// 罩在实物之下时真实速度会 miss，fast e2e 测不出）。
test('火：透明命中罩罩住火苗柴堆且在实物层最上层', async ({ page }) => {
  await start(page, 'huo');
  const info = await page.evaluate(() => {
    const hit = document.querySelector('#picture-layer .huo-hit');
    const rootEl = hit.parentElement;
    const kids = [...rootEl.children];
    const boxes = [...document.querySelectorAll('#picture-layer [data-huo-tongue]')].map((p) => p.getBBox());
    const hb = hit.getBBox();
    const covers = (b) => hb.x <= b.x + 2 && hb.y <= b.y + 2 && hb.x + hb.width >= b.x + b.width - 2 && hb.y + hb.height >= b.y + b.height - 2;
    return { isLast: kids[kids.length - 1] === hit, coversTongues: boxes.length >= 4 && boxes.every(covers) };
  });
  expect(info.isLast).toBe(true);
  expect(info.coversTongues).toBe(true);
});
