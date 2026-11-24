// 「明」：通用测试加上本字特有的判定。
import { test, expect } from '@playwright/test';
import { lessonTests, open, start, enterTrace, drawStroke, tapPicture, scene } from './lesson.js';

lessonTests('ming');

// 明先写日（左边四笔），跳去写月（右边第五笔的撇）不算
test('明：跳去写月的撇不算', async ({ page }) => {
  await enterTrace(page, 'ming');
  await drawStroke(page, 4);
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
});

test('明：夜星跟着夜色来，描红时收干净', async ({ page }) => {
  await start(page, 'ming');
  await expect(page.locator('#scenery circle').first()).toBeVisible();
  await page.getByTestId('btn-write').click();
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
  await expect(page.locator('#scenery')).toBeEmpty();
});

// 返修锁定（audit-11-chars.md「明」条）：甲骨从囧从月（拓片 4/4，从日 0 例）——
// 左构件是方格窗：外框＋竖横两笔窗格，窗宽高比落在拓片 0.62~1.38；
// 小篆囧左月右、月肚里一竖笔（拓片 EEF7 系），月内第二笔那时还没长出来。
// fast 模式下场景一闪而过，用 rAF 逐帧采样、每场景记最后一帧（seal 变形是从 oracle 起步的，不能取首帧）。
test('明：甲骨左边是方格窗囧，小篆月肚里是一小竖笔', async ({ page }) => {
  // 走真实速度（不带 fast）：fast 下小篆场景一闪而过，采不到连续两帧一致的稳定态
  await page.goto('/?c=ming');
  await expect(page.locator('body')).toHaveAttribute('data-scene', 'start');
  await page.evaluate(() => {
    window.__forms = {};
    window.__prev = {};
    const sample = () => {
      const s = document.body.dataset.scene;
      if (s === 'oracle' || s === 'seal') {
        const m = document.querySelector('#morph-layer .morph');
        if (m && Number(m.getAttribute('opacity') ?? 0) > 0.5) {
          const paths = [...m.querySelectorAll('path')];
          const box = (i) => paths[i].getBBox();
          // 骨架序：囧左框、右框、竖格、横格、月背、怀抱、月内一笔、月内二笔
          const l = box(0);
          const r = box(1);
          const val = {
            frameWH:
              (Math.max(l.x + l.width, r.x + r.width) - Math.min(l.x, r.x)) /
              (Math.max(l.y + l.height, r.y + r.height) - Math.min(l.y, r.y)),
            // 零长笔画（甲骨阶段的竖格）不画：d 为空，量出来按 0 记
            vGrid: paths[2].getAttribute('d') === '' ? 0 : box(2).height / Math.max(1, box(2).width),
            hGrid: box(3).width / Math.max(1, box(3).height),
            // 2026-11-21 回归锁：窗格必须浮在框内、与框留出可见空隙（拓片 EEF9/EEFA 横条悬空）。
            // 上一版格线中心线只离框 24px，被两笔各 13px 的半宽吃光，十字贴框读成「田」（用户终审指出）。
            // bbox 已含笔身，这里量格与框的 bbox 间隙：上下左右各 ≥8px。
            vGapTop: box(2).y - Math.min(l.y, r.y),
            vGapBot: Math.max(l.y + l.height, r.y + r.height) - (box(2).y + box(2).height),
            hGapL: box(3).x - Math.min(l.x, r.x),
            hGapR: Math.max(l.x + l.width, r.x + r.width) - (box(3).x + box(3).width),
            // 三修（11-22 像素剖析）：小篆囧是「中横棂贴左右框＋竖棂自横棂垂下」，不是四边封的十字
            mullionAtBar: Math.abs(box(2).y - box(3).y),
            yueIn1H: box(6).height / Math.max(1, box(6).width),
            yueIn1Drawn: paths[6].getAttribute('d') !== '',
            yueIn2Drawn: paths[7].getAttribute('d') !== '',
          };
          // 只记「连续两帧一致」的稳定态：变形途中（如 seal→楷书时竖格奔向横折）的帧会跑到框外，
          // 不能当终形（2026-11-21 竖屏就抓到过一帧 vGapTop=-283）。
          const key = JSON.stringify(val);
          if (window.__prev[s] === key) window.__forms[s] = val;
          window.__prev[s] = key;
        }
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.getByTestId('start').click();
  await page.getByTestId('picture').click({ force: true });
  await page.waitForSelector('body[data-scene="trace"]', { timeout: 120_000 }); // 真实速度整课一分多钟
  const f = await page.evaluate(() => window.__forms);
  // 甲骨：方格窗（框宽高比在拓片区间，竖格横格都真实存在且方向对）
  expect(f.oracle).toBeTruthy();
  expect(f.oracle.frameWH).toBeGreaterThan(0.6);
  expect(f.oracle.frameWH).toBeLessThan(1.4);
  // 甲骨：圆角方框＋一根浮横条（EEF9/EEFA 系）；十字格无甲骨实证，竖格甲骨不画
  expect(f.oracle.vGrid, '甲骨不该有竖格').toBeLessThan(1);
  expect(f.oracle.hGrid).toBeGreaterThan(3);
  // 横条浮空不贴框（间隙含笔身，≥8px 才肉眼可见）
  expect(f.oracle.hGapL, '甲骨横条与框的左间隙').toBeGreaterThan(8);
  expect(f.oracle.hGapR, '甲骨横条与框的右间隙').toBeGreaterThan(8);
  // 小篆：窗棂不是十字（两件拓片无一字是十字）——横棂贴左右框（swxz_6719 横棂连框），
  // 竖棂自横棂垂下、上下都不抵框（660E 中部浮空竖棂），月加粗循 660E 线宽比
  expect(f.seal.vGrid).toBeGreaterThan(3);
  expect(f.seal.hGrid).toBeGreaterThan(3);
  expect(f.seal.hGapL, '小篆横棂应贴左框').toBeLessThan(9);
  expect(f.seal.hGapR, '小篆横棂应贴右框').toBeLessThan(9);
  expect(f.seal.vGapTop, '小篆竖棂不抵顶').toBeGreaterThan(40);
  expect(f.seal.vGapBot, '小篆竖棂不抵底').toBeGreaterThan(20);
  expect(f.seal.mullionAtBar, '竖棂应挂在横棂上').toBeLessThan(12);
  // 小篆：窗格还在；月肚里是一竖笔，第二笔还是没长的点
  expect(f.seal).toBeTruthy();
  expect(f.seal.frameWH).toBeGreaterThan(0.55);
  expect(f.seal.frameWH).toBeLessThan(1.1);
  expect(f.seal.vGrid).toBeGreaterThan(3);
  expect(f.seal.hGrid).toBeGreaterThan(3);
  expect(f.seal.yueIn1Drawn).toBe(true);
  expect(f.seal.yueIn1H).toBeGreaterThan(2.5);
  expect(f.seal.yueIn2Drawn).toBe(false);
});

// 变形的最后一步用的是笔画数据的中线，切到笔顺动画时不能「跳」
test('明：楷书变形要和真正的笔画对上', async ({ page }) => {
  await open(page, 'ming');
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
