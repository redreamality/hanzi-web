// 「日」：通用测试加上本字特有的判定。
import { test, expect } from '@playwright/test';
import { lessonTests, enterTrace, drawStroke, scene } from './lesson.js';

lessonTests('ri');

test('日：跳着写第三笔不算', async ({ page }) => {
  await enterTrace(page, 'ri');
  await drawStroke(page, 2);
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
});

test('日：默认打开的就是日', async ({ page }) => {
  await page.goto('/?fast');
  await expect(scene(page)).toHaveAttribute('data-char', 'ri');
});
