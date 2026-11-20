// 「心」：通用测试加上本字特有的判定。
import { test, expect } from '@playwright/test';
import { lessonTests, enterTrace, drawStroke, scene, open } from './lesson.js';

lessonTests('xin');

// 楷书形态的最后一帧要和真实笔画外框对齐，不然切到笔顺动画会「跳」。
// 「心」的变形是四条笔画的联合：左点、卧钩、中点、右点——
// 卧钩和三点全部就位才算对上（fast 模式下一闪而过，轮询等到对上的那一刻）。
test('心：变形的楷书和笔画数据的外框对齐', async ({ page }) => {
  await open(page, 'xin');
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
      const morph = document.querySelector('#morph-layer .morph');
      if (!morph || Number(morph.getAttribute('opacity') ?? 0) < 0.1) return false;
      const paths = [...morph.querySelectorAll('path')];
      if (paths.length !== 4) return false;
      // 空路径（d=''）不进联合外框；三个点没长出来时也不算对齐
      const boxes = paths.map((p) => {
        const d = p.getAttribute('d') || '';
        if (!d) return null;
        const b = p.getBBox();
        if (b.width < 2 || b.height < 2) return null;
        return b;
      });
      if (boxes.some((b) => !b)) return false;
      const m = {
        x0: Math.min(...boxes.map((b) => b.x)),
        x1: Math.max(...boxes.map((b) => b.x + b.width)),
        y0: Math.min(...boxes.map((b) => b.y)),
        y1: Math.max(...boxes.map((b) => b.y + b.height)),
      };
      let k = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 };
      for (const s of window.hz.data.strokes) {
        const b = outlineBox(s);
        k = {
          x0: Math.min(k.x0, b.x0), x1: Math.max(k.x1, b.x1),
          y0: Math.min(k.y0, b.y0), y1: Math.max(k.y1, b.y1),
        };
      }
      return ['x0', 'x1', 'y0', 'y1'].every((key) => Math.abs(m[key] - k[key]) < 42);
    };
  });
  await page.getByTestId('start').click();
  await page.getByTestId('picture').click({ force: true });
  await page.waitForFunction(() => window.__checkAlign(), null, { timeout: 15_000 });
});

// 字形阶段实物必须退干净：孩子在字的正后方，留 0.12 的影子会压住字的躯干（审美红线 2.3）。
// 采样字形可见的每一帧：甲骨文开场是「拓印交接期」（孩子正在退、心廓正在刻），
// 允许重叠；交接完成以后（小篆、楷书阶段）实物层透明度都应几乎为零。
test('心：字形阶段孩子退干净，不与字透叠', async ({ page }) => {
  await open(page, 'xin');
  await page.evaluate(() => {
    window.__samples = [];
    const sample = () => {
      const morph = document.querySelector('#morph-layer .morph');
      if (morph && Number(morph.getAttribute('opacity') ?? 0) > 0.5) {
        const kid = document.querySelector('.xin-kid');
        const floats = document.querySelector('.xin-floats');
        window.__samples.push({
          scene: document.body.dataset.scene,
          kidOp: Number(kid?.getAttribute('opacity') ?? 1),
          floatsOp: Number(floats?.getAttribute('opacity') ?? 0),
          floatsN: floats ? floats.children.length : 0,
        });
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.getByTestId('start').click();
  await page.getByTestId('picture').click({ force: true });
  await page.waitForSelector('body[data-scene="trace"]', { timeout: 20_000 });
  const samples = await page.evaluate(() => window.__samples);
  expect(samples.length).toBeGreaterThanOrEqual(3);
  const afterOracle = samples.filter((s) => s.scene !== 'oracle');
  expect(afterOracle.length).toBeGreaterThanOrEqual(2);
  for (const s of afterOracle) {
    expect(s.kidOp).toBeLessThanOrEqual(0.05);
    expect(s.floatsOp).toBe(0);
    expect(s.floatsN).toBe(0);
  }
});

// 写完啦，孩子和心要回到字后面淡淡的（收尾呼应实物），
// 飘起来的小心心动画结束后移除干净，done 场景零残留。
test('心：写完后孩子心回到字后，飘心收干净', async ({ page }) => {
  await enterTrace(page, 'xin');
  for (let i = 0; i < 4; i++) {
    await expect(scene(page)).toHaveAttribute('data-stroke-index', String(i));
    await drawStroke(page, i);
  }
  await expect(scene(page)).toHaveAttribute('data-scene', 'done');
  await page.waitForTimeout(2500); // 等 finale 的飘心走完
  const s = await page.evaluate(() => {
    const root = document.querySelector('.xin-kid');
    const floats = document.querySelector('.xin-floats');
    return {
      rootOp: Number(root?.getAttribute('opacity') ?? -1),
      floatsOp: Number(floats?.getAttribute('opacity') ?? -1),
      floatsN: floats ? floats.children.length : -1,
      // picture 层里除了 kid、飘心两个常驻组，不该有动画残留下的零散元素
      stray: [...document.querySelectorAll('#picture-layer > g')].filter(
        (g) => !g.classList.contains('xin-kid') && !g.classList.contains('xin-floats'),
      ).length,
    };
  });
  expect(s.rootOp).toBeGreaterThanOrEqual(0.2);
  expect(s.rootOp).toBeLessThanOrEqual(0.6);
  expect(s.floatsOp).toBe(0);
  expect(s.floatsN).toBe(0);
  expect(s.stray).toBe(0);
});
