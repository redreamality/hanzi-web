// 「木」：通用测试加上本字特有的判定。
import { test, expect } from '@playwright/test';
import { lessonTests, enterTrace, drawStroke, scene } from './lesson.js';

lessonTests('mu');

test('木：先写捺不算', async ({ page }) => {
  await enterTrace(page, 'mu');
  await drawStroke(page, 3);
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
});

test('木：先写撇不算；按横竖撇捺写完就收尾', async ({ page }) => {
  await enterTrace(page, 'mu');
  await drawStroke(page, 2);
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
  for (let i = 0; i < 4; i++) {
    await expect(scene(page)).toHaveAttribute('data-stroke-index', String(i));
    await drawStroke(page, i);
  }
  await expect(scene(page)).toHaveAttribute('data-scene', 'done');
});
