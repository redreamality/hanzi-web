// 「情」：通用测试加上本字特有的判定。
import { test, expect } from '@playwright/test';
import { lessonTests, open, start, enterTrace, drawStroke, tapPicture, scene } from './lesson.js';

lessonTests('qingxin');

// 竖心旁（前三笔点、点、竖）没写完，跳去写右边青的横不算
test('情：跳去写右边青的横不算', async ({ page }) => {
  await enterTrace(page, 'qingxin');
  await drawStroke(page, 3);
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
});

// 组字是这一课的重头戏：小朋友捧的心要飞进字里。组字收尾时实物层必须完全让位
// （淡出的孩子和字透叠会出灰斑），且morph层十一笔（竖心旁三笔＋青八笔）都画齐了
test('情：组字完成后实物完全让位，十一笔画齐', async ({ page }) => {
  await start(page, 'qingxin');
  await tapPicture(page);
  await page.waitForFunction(() => {
    const kid = document.querySelector('.qingxin-kid');
    const morph = document.querySelector('#morph-layer .morph');
    if (!kid || !morph) return false;
    // 心已经化进字里（kidG 透明）且字形已写完，才算组字收了尾
    const person = kid.querySelector('.qingxin-person');
    const paths = [...morph.querySelectorAll('path')];
    return Number(person.getAttribute('opacity')) < 0.02
      && paths.length === 11
      && paths.every((p) => p.getAttribute('stroke-dashoffset') === '0');
  }, null, { timeout: 20_000 });
  // 孩子本体（qingxin-person）和心在组字后就是完全透明、且不会再变
  // （后面 order 场景的 fadeForms 只把整个实物层压成 0.06 的淡影，那是对的）
  await expect(page.locator('.qingxin-person')).toHaveAttribute('opacity', '0');
  // 心已经收窄站直、藏进竖心旁里了
  const heartOp = await page.evaluate(() => Number(document.querySelector('.qingxin-kid .qingxin-heart')?.getAttribute('opacity') ?? 1));
  expect(heartOp).toBeLessThan(0.05);
});

// 组字时青黛来自远山：背景里有青色的山；进描红要把背景收干净
test('情：组字时背景有远山，描红时收干净', async ({ page }) => {
  await start(page, 'qingxin');
  await expect(page.locator('#scenery path').first()).toBeVisible();
  await page.getByTestId('btn-write').click();
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
  await expect(page.locator('#scenery')).toBeEmpty();
});

// 变形的最后一步用的是笔画数据的中线，切到笔顺动画时不能「跳」
test('情：楷书变形要和真正的笔画对上', async ({ page }) => {
  await open(page, 'qingxin');
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
