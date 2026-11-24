// 「北」：通用测试加上本字特有的判定。
// 特有测试覆盖：楷书终形对齐（SOP 2.8）、「相背」形态锁定（任务卡标注的特有机制，
// 参照 ren.spec.js 的形态锁定思路：画面和甲骨文里两个小人都是镜像相背——
// 左臂朝左甩、右臂朝右甩、两人中间留缝、头顶齐平，区别于「从」的同向相随和「比」的并肩同向）、
// 家族比较环节台词必点（hanzi-network spec「家族聚簇」：从是前后跟着，比是肩并肩，北是背对背）。
import { test, expect } from '@playwright/test';
import { lessonTests, tapPicture, open } from './lesson.js';

lessonTests('bei');

// 楷书形态的最后一帧要和真实笔画外框对齐，不然切到笔顺动画会「跳」。
// fast 模式下场景一闪而过，所以在变形过程中轮询，等到对上的那一刻。
test('北：变形的楷书和笔画数据的外框对齐', async ({ page }) => {
  await open(page, 'bei');
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
      // 所以不筛场景：seal→kaishu 的插值中途五笔不会同时对上，对上了就是终形
      const paths = [...document.querySelectorAll('#morph-layer .morph path')];
      if (paths.length < 5) return false;
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

// 形态基准（etymology.md「北」条）：两个小人镜像相背——左臂甩向左、右臂甩向右、
// 两人中间留缝、头顶齐平。「从」是两人同向朝左（手臂都往一边），「比」是并肩同向。
// 画面阶段和甲骨文阶段各量一次，锁定整条动线都是「相背」。
test('北：画面和甲骨文的两个人都是背对背，手臂朝两边甩', async ({ page }) => {
  await open(page, 'bei');
  await page.getByTestId('start').click();
  // 等两个小朋友五笔都写完（空 path 不进外框）
  await page.waitForFunction(() => {
    const parts = [...document.querySelectorAll('#picture-layer [data-part]')];
    return parts.length >= 5 && parts.every((p) => {
      const b = p.getBBox();
      return b.width > 1 && b.height > 1;
    });
  }, null, { timeout: 10_000 });
  const measure = (layerSel) =>
    page.evaluate((layerSel) => {
      const boxOf = (el) => {
        const b = el.getBBox();
        return { x0: b.x, x1: b.x + b.width, y0: b.y, y1: b.y + b.height };
      };
      const get = (part) => {
        const el = document.querySelector(`${layerSel} [data-part="${part}"]`);
        if (!el) return null;
        const b = boxOf(el);
        if (b.x1 - b.x0 < 1 || b.y1 - b.y0 < 1) return null;
        return b;
      };
      const parts = { shu: get('shu'), heng: get('heng'), ti: get('ti'), pie: get('pie'), gou: get('gou') };
      if (Object.values(parts).some((b) => !b)) return null;
      const u = (a, b) => ({
        x0: Math.min(a.x0, b.x0), x1: Math.max(a.x1, b.x1),
        y0: Math.min(a.y0, b.y0), y1: Math.max(a.y1, b.y1),
      });
      return { ...parts, leftFig: u(u(parts.shu, parts.heng), parts.ti), rightFig: u(parts.pie, parts.gou) };
    }, layerSel);
  const assertBackToBack = (b, label) => {
    // 两人中间留缝：左人整体在右人左边，不粘连
    expect(b.rightFig.x0 - b.leftFig.x1, `${label} 中缝`).toBeGreaterThan(40);
    // 左臂甩向左：远远探出左人的身子；且不越过中线
    expect(b.shu.x0 - b.heng.x0, `${label} 左臂探出`).toBeGreaterThan(60);
    expect(b.heng.x1, `${label} 左臂不越中线`).toBeLessThan(512);
    // 右臂甩向右：整条手臂都在中线右边；且不越过中线
    expect(b.pie.x0, `${label} 右臂不越中线`).toBeGreaterThan(512);
    // 头顶齐平（两个小人一般高，不是一前一后）
    expect(Math.abs(b.shu.y0 - b.gou.y0), `${label} 头顶齐平`).toBeLessThan(90);
  };
  assertBackToBack(await measure('#picture-layer'), '画面');
  await tapPicture(page);
  const oracle = await page
    .waitForFunction(() => {
      if (document.body.dataset.scene !== 'oracle') return null;
      const m = document.querySelector('#morph-layer .morph');
      if (!m || Number(m.getAttribute('opacity') ?? 0) < 0.9) return null;
      return true;
    })
    .then(() => measure('#morph-layer'));
  assertBackToBack(oracle, '甲骨文');
});

// 返修锁定（audit-11-chars.md「北」条）：拓片 F60B～F60F 每人笔笔相连、各自连成一体——
// 右人手臂（pie）的起笔要落在头身竖线（gou）的墨迹上，不再悬空成第三个独立域。
// 在两笔外框交集里撒点，数同时落在两笔墨迹里的点（isPointInFill），相交才算相连。
test('北：甲骨文右人的手臂连在身子上，不是悬空的一笔', async ({ page }) => {
  await open(page, 'bei');
  await page.evaluate(() => {
    window.__hits = 0;
    const sample = () => {
      if (document.body.dataset.scene === 'oracle') {
        const m = document.querySelector('#morph-layer .morph');
        if (m && Number(m.getAttribute('opacity') ?? 0) >= 0.9) {
          const pie = m.querySelector('[data-part="pie"]');
          const gou = m.querySelector('[data-part="gou"]');
          const bp = pie.getBBox();
          const bg = gou.getBBox();
          const x0 = Math.max(bp.x, bg.x), x1 = Math.min(bp.x + bp.width, bg.x + bg.width);
          const y0 = Math.max(bp.y, bg.y), y1 = Math.min(bp.y + bp.height, bg.y + bg.height);
          if (x1 > x0 && y1 > y0) {
            let n = 0;
            for (let x = x0; x <= x1; x += 3)
              for (let y = y0; y <= y1; y += 3) {
                const pt = new DOMPoint(x, y);
                if (pie.isPointInFill(pt) && gou.isPointInFill(pt)) n++;
              }
            window.__hits = Math.max(window.__hits, n);
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
  const hits = await page.evaluate(() => window.__hits);
  expect(hits).toBeGreaterThan(3);
});

// 家族比较环节必点（任务卡 / hanzi-network spec）：人形族双人三式——
// 「从是一前一后，比是肩并肩，北是背对背」，台词要点全。
test('北：比较环节点出「从」「比」和「背对背」', async ({ page }) => {
  await open(page, 'bei');
  const line = await page.evaluate(() => window.hz.data.lines.kaishu);
  expect(line).toContain('背对背');
  expect(line).toContain('从');
  expect(line).toContain('比');
});
