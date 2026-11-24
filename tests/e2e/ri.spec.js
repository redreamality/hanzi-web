// 「日」：通用测试加上本字特有的判定。
import { test, expect } from '@playwright/test';
import { lessonTests, enterTrace, drawStroke, scene, open } from './lesson.js';

lessonTests('ri');

test('日：跳着写第三笔不算', async ({ page }) => {
  await enterTrace(page, 'ri');
  await drawStroke(page, 2);
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
});

// 返修锁定（audit-ri-yue-mu.md「日」条）：拓片 5/5 内笔是横（长 0.29~0.62 环宽，中位 0.46）、
// 环 W/H 5/5 ≥1.04（扁或近圆），代码不再画点、环不竖长。fast 模式下场景一闪而过，用 rAF 采样不赌时序。
test('日：甲骨文中间是短短一横，环形略扁不竖长', async ({ page }) => {
  await open(page, 'ri');
  await page.evaluate(() => {
    window.__oracle = null;
    const sample = () => {
      if (document.body.dataset.scene === 'oracle') {
        const m = document.querySelector('#morph-layer .morph');
        if (m && Number(m.getAttribute('opacity') ?? 0) > 0.5) {
          const [outer, inner] = m.querySelectorAll('path');
          const ob = outer.getBBox();
          window.__oracle = { ring: ob.width / ob.height, span: inner.getBBox().width / ob.width };
        }
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.getByTestId('start').click();
  await page.getByTestId('picture').click({ force: true });
  await page.waitForSelector('body[data-scene="trace"]', { timeout: 20_000 });
  const o = await page.evaluate(() => window.__oracle);
  expect(o).toBeTruthy();
  expect(o.ring).toBeGreaterThan(1.03); // 拓片 5/5 ≥1.04，代码目标 ≈1.10（点旧版 0.96）
  expect(o.span).toBeGreaterThan(0.35); // 内笔是横不是点（拓片中位 0.46，代码 ≈0.47；点旧版 0.06）
  expect(o.span).toBeLessThan(0.62); // 拓片全距上沿
});
