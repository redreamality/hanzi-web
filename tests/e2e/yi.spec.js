// 「一」：通用测试加上本字特有的判定。
import { test, expect } from '@playwright/test';
import { lessonTests, enterTrace, drawStroke, scene, open } from './lesson.js';

lessonTests('yi');

// 楷书形态的最后一帧要和真实笔画外框对齐，不然切到笔顺动画会「跳」。
// 「一」的变形是从桥的拱线到楷书横，fast 模式下一闪而过，轮询等到对上的那一刻。
test('一：变形的楷书和笔画数据的外框对齐', async ({ page }) => {
  await open(page, 'yi');
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
      const p = document.querySelector('#morph-layer .morph path');
      if (!p || !p.getAttribute('d')) return false;
      const morph = document.querySelector('#morph-layer .morph');
      if (Number(morph.getAttribute('opacity') ?? 0) < 0.1) return false;
      // getBBox 不含笔画宽度：把 stroke-width 外扩进去，量的才是视觉外框
      const b = p.getBBox();
      const w = Number(p.getAttribute('stroke-width') || 0) / 2;
      const m = { x0: b.x - w, x1: b.x + b.width + w, y0: b.y - w, y1: b.y + b.height + w };
      const k = outlineBox(window.hz.data.strokes[0]);
      return ['x0', 'x1', 'y0', 'y1'].every((key) => Math.abs(m[key] - k[key]) < 42);
    };
  });
  await page.getByTestId('start').click();
  await page.getByTestId('picture').click({ force: true });
  await page.waitForFunction(() => window.__checkAlign(), null, { timeout: 15_000 });
});

// 字形成形时，压淡的实物（溪、岸、鸭）和退场的木桥必须避开「一」的躯干，
// 不留透叠灰斑（审美红线 2.3）；木桥则整个退干净，不留 0.12 的影子。
test('一：淡出的实物避开字的躯干，木桥退场干净', async ({ page }) => {
  await open(page, 'yi');
  await page.evaluate(() => {
    window.__samples = [];
    const sample = () => {
      const morph = document.querySelector('#morph-layer .morph');
      if (morph && Number(morph.getAttribute('opacity') ?? 0) > 0.5) {
        const mp = morph.querySelector('path');
        const b = mp.getBBox();
        const bridge = document.querySelector('#picture-layer [data-part="bridge"]');
        const parts = [...document.querySelectorAll('#picture-layer .yi-scene-root > g:not([data-part])')];
        window.__samples.push({
          morph: { y0: b.y, y1: b.y + b.height, x0: b.x, x1: b.x + b.width },
          bridgeOpacity: Number(bridge?.getAttribute('opacity') ?? 1),
          sceneParts: parts.map((p) => {
            const bb = p.getBBox();
            return { op: Number(p.getAttribute('opacity') ?? 1), y0: bb.y, y1: bb.y + bb.height, x0: bb.x, x1: bb.x + bb.width };
          }),
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
  expect(samples.length).toBeGreaterThanOrEqual(3); // fast 模式下终形窗口很短，帧数不固定
  // 终形帧（字形已抬到楷书的位置）：木桥退干净，压淡的溪、岸、鸭都不超过 0.14，
  // 且整体落在「一」的下缘之下，不与字的躯干透叠。
  // 拓印交接期（桥还在退场）允许重叠，那是一瞬间的事。
  const final = samples.filter((s) => s.morph.y0 < 470);
  expect(final.length).toBeGreaterThan(0);
  for (const s of final) {
    expect(s.bridgeOpacity).toBeLessThanOrEqual(0.05);
    for (const p of s.sceneParts) {
      if (p.op <= 0.01) continue; // 已经完全淡出的不管
      expect(p.op).toBeLessThanOrEqual(0.14);
      expect(p.y0).toBeGreaterThanOrEqual(s.morph.y1 - 4);
    }
  }
});

// 「一」只有一笔：这一笔写完就直接收尾（引擎应立即进入 done，不会多等）
test('一：唯一一笔写对直接收尾', async ({ page }) => {
  await enterTrace(page, 'yi');
  await drawStroke(page, 0);
  await expect(scene(page)).toHaveAttribute('data-scene', 'done');
  await expect(scene(page)).toHaveAttribute('data-last-audio', 'done');
});

// 写完啦，小溪和鸭群要回到字下（收尾呼应实物）：实物层可见，
// 且鸭群整体落在「一」的下缘之下，不挡住孩子刚写好的字。
test('一：写完后小溪鸭群回到字下', async ({ page }) => {
  await enterTrace(page, 'yi');
  await drawStroke(page, 0);
  await expect(scene(page)).toHaveAttribute('data-scene', 'done');
  await page.waitForTimeout(1500);
  const s = await page.evaluate(() => {
    const outlineBox = (d) => {
      const v = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
      let y1 = -1e9;
      for (let i = 0; i + 1 < v.length; i += 2) y1 = Math.max(y1, 900 - v[i + 1]);
      return y1; // 字的下缘（舞台坐标）
    };
    const root = document.querySelector('.yi-scene-root');
    // 鸭群组：root 里没有 data-part、且有且只有三只鸭子
    const flock = [...root.children].find((c) => !c.getAttribute('data-part') && c.children.length === 3);
    return {
      rootOp: Number(root.getAttribute('opacity')),
      flockOp: Number(flock.getAttribute('opacity')),
      flockY0: Math.round(flock.getBBox().y),
      charY1: Math.round(outlineBox(window.hz.data.strokes[0])),
    };
  });
  expect(s.rootOp).toBeGreaterThanOrEqual(0.9);
  expect(s.flockOp).toBeGreaterThanOrEqual(0.9);
  expect(s.flockY0).toBeGreaterThan(s.charY1);
});
