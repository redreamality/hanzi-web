// 「青」：通用测试加上本字特有的判定。
import { test, expect } from '@playwright/test';
import { lessonTests, enterTrace, drawStroke, scene } from './lesson.js';

lessonTests('qing');

test('青：字形只走 小篆→楷书 两步（不画甲骨文）', async ({ page }) => {
  await page.goto('/?c=qing&fast');
  await page.waitForSelector('body[data-scene="start"]');
  const forms = await page.evaluate(() => window.hz.data.forms.map((f) => `${f.id}:${f.label}`));
  expect(forms).toEqual(['seal:小篆', 'kaishu:楷书']);
});

test('青：倒写第二笔不算', async ({ page }) => {
  await enterTrace(page, 'qing');
  await drawStroke(page, 1, { reverse: true });
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
});

test('青：跳过上半部先写月里的横不算', async ({ page }) => {
  await enterTrace(page, 'qing');
  await drawStroke(page, 6);
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
});

// 楷书终形的端点要与笔画数据的中线端点对齐，切到笔顺动画时才不会「跳」
test('青：楷书终形与笔画数据对齐', async ({ page }) => {
  await page.goto('/?c=qing&fast');
  await page.getByTestId('start').click();
  await page.getByTestId('picture').click({ force: true });
  await page.waitForSelector('body[data-scene="order"]', { timeout: 20_000 });
  const worst = await page.evaluate(() => {
    const paths = [...document.querySelectorAll('#morph-layer .morph path')];
    const medians = window.hz.data.medians;
    let worst = 0;
    paths.forEach((p, i) => {
      const nums = p.getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);
      const ends = [
        [nums[0], nums[1]],
        [nums[nums.length - 2], nums[nums.length - 1]],
      ];
      const m = medians[i];
      const mEnds = [
        [m[0][0], 900 - m[0][1]],
        [m[m.length - 1][0], 900 - m[m.length - 1][1]],
      ];
      for (let k = 0; k < 2; k++) {
        worst = Math.max(worst, Math.hypot(ends[k][0] - mEnds[k][0], ends[k][1] - mEnds[k][1]));
      }
    });
    return worst;
  });
  expect(worst).toBeLessThan(12);
});
