// 「天」：通用测试加上本字特有的判定（组字是重头戏：大先写出，一横再落下）。
import { test, expect } from '@playwright/test';
import { lessonTests, open, start, enterTrace, drawStroke, tapPicture, scene } from './lesson.js';

lessonTests('tian');

// 组字动线：先写「大」（横、撇、捺三笔依次描出），那一横最后才落下显形。
// 「大」三笔的显形靠 stroke-dashoffset 从 1 走向 0，那一横靠 opacity 从 0 浮出——
// 记下这两类事件的发生顺序。
test('天：先写大，一横最后才落下', async ({ page }) => {
  await open(page, 'tian');
  await page.evaluate(() => {
    window.__events = [];
    const seen = new Set();
    const mo = new MutationObserver((records) => {
      if (document.body.dataset.scene !== 'zu') return; // 只统计组字场景内的事件
      for (const r of records) {
        const p = r.target;
        if (p.tagName !== 'path') continue; // 落下时荡开的青晕是 ellipse，不算
        const idx = [...document.querySelectorAll('#morph-layer .morph path')].indexOf(p);
        if (r.attributeName === 'stroke-dashoffset') {
          const v = p.getAttribute('stroke-dashoffset');
          if (v && v !== '1' && !seen.has('draw' + idx)) {
            seen.add('draw' + idx);
            window.__events.push(['draw', idx]);
          }
        } else if (r.attributeName === 'opacity') {
          const v = p.getAttribute('opacity');
          if (v && v !== '0' && !seen.has('show' + idx)) {
            seen.add('show' + idx);
            window.__events.push(['show', idx]);
          }
        }
      }
    });
    mo.observe(document.querySelector('#morph-layer .morph'), { subtree: true, attributes: true, attributeFilter: ['stroke-dashoffset', 'opacity'] });
  });
  await page.getByTestId('start').click();
  await tapPicture(page);
  await page.waitForFunction(() => document.body.dataset.scene === 'kaishu', null, { timeout: 20_000 });
  const events = await page.evaluate(() => window.__events);
  // 「大」的三笔（横、撇、捺）依次描出，那一横（第零条 path）最后落下显形
  expect(events.filter((e) => e[0] === 'draw').map((e) => e[1])).toEqual([1, 2, 3]);
  expect(events.at(-1)).toEqual(['show', 0]);
});

// 落下的一横停在头顶：zu 完成时，顶横的路径整体在大横的上方
test('天：那一横停在大头顶上', async ({ page }) => {
  await open(page, 'tian');
  await page.getByTestId('start').click();
  await tapPicture(page);
  await page.waitForFunction(() => document.body.dataset.scene === 'kaishu', null, { timeout: 20_000 });
  const gap = await page.evaluate(() => {
    const paths = [...document.querySelectorAll('#morph-layer .morph path')];
    const box = (p) => p.getBBox();
    const bar = box(paths[0]);
    const heng = box(paths[1]);
    return { top: bar.y + bar.height, bottomOfDaHeng: heng.y };
  });
  expect(gap.top).toBeLessThan(gap.bottomOfDaHeng);
});

// 变形的最后一步用的是笔画数据的中线，切到笔顺动画时不能「跳」
test('天：楷书变形要和真正的笔画对上', async ({ page }) => {
  await open(page, 'tian');
  await page.getByTestId('start').click();
  await tapPicture(page);
  await page.waitForFunction(() => document.querySelector('#morph-layer .morph').dataset.kaishuBox, null, {
    timeout: 20_000,
  });
  const gap = await page.evaluate(() => {
    const [mcx, mcy, mw, mh] = document.querySelector('#morph-layer .morph').dataset.kaishuBox.split(',').map(Number);
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const m of window.hz.data.medians)
      for (const [x, y] of m) {
        x1 = Math.min(x1, x); y1 = Math.min(y1, y);
        x2 = Math.max(x2, x); y2 = Math.max(y2, y);
      }
    // 笔画数据 y 朝上，屏幕 y 朝下
    return {
      dx: Math.abs(mcx - (x1 + x2) / 2),
      dy: Math.abs(mcy - (900 - (y1 + y2) / 2)),
      dw: Math.abs(mw - (x2 - x1)),
      dh: Math.abs(mh - (y2 - y1)),
    };
  });
  expect(gap.dx).toBeLessThan(40);
  expect(gap.dy).toBeLessThan(40);
  expect(gap.dw).toBeLessThan(50);
  expect(gap.dh).toBeLessThan(50);
});

// 组字时背景有青云带；进描红要把背景收干净
test('天：组字时背景有云，描红时收干净', async ({ page }) => {
  await start(page, 'tian');
  await expect(page.locator('#scenery path').first()).toBeVisible();
  await page.getByTestId('btn-write').click();
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
  await expect(page.locator('#scenery')).toBeEmpty();
});

// 描完四笔进入 done：天空亮起、小朋友回来——画面里不该留下组字的辅助线或残墨
test('天：写完后天空亮起，人物回来，无残墨', async ({ page }) => {
  await enterTrace(page, 'tian');
  const n = await page.evaluate(() => window.hz.data.medians.length);
  for (let i = 0; i < n; i++) {
    await expect(scene(page)).toHaveAttribute('data-stroke-index', String(i));
    await drawStroke(page, i);
  }
  await expect(scene(page)).toHaveAttribute('data-scene', 'done');
  await page.waitForTimeout(2500);
  const check = await page.evaluate(() => {
    const morph = document.querySelector('#morph-layer .morph');
    // 写完后的天空：背景层有内容（青云带），实物层的小朋友回来了
    return {
      morphOpacity: Number(morph.getAttribute('opacity')),
      sceneryPaths: document.querySelectorAll('#scenery path').length,
      personHead: Number(document.querySelector('.tian-person > circle')?.getAttribute('opacity') ?? 0),
    };
  });
  expect(check.morphOpacity).toBe(0);
  expect(check.sceneryPaths).toBeGreaterThan(0);
  expect(check.personHead).toBeGreaterThan(0.9);
});
