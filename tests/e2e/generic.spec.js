// 通用课（src/generic.js）的测试：样例字跑完整的通用交互测试，
// 覆盖数词、轻声虚词、象形字、方位词。样例取自不同阶段，防止只对前几个字好用。
// RUN_ALL=1 pnpm test:e2e 时，额外把所有课都打开一遍（每个字 3 秒内能进 start 场景）。
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { lessonTests, scene } from './lesson.js';

// 样例覆盖：医（后起形声）、了（轻声虚词）、的（最高频虚词）、上（方位）、
// 改过读音的字（石/那）、多音字（重）、末段字（逐）。
// 2026-11-20：yi1/da4 原是量产早期 id（一/大），rename-ids 后一/大为手绘课（yi/da）、
// yi1 改给了「医」、da4 不存在——da4 样例曾使 18 项 e2e 挂在首页守卫（?c=da4 回 home）。
const SAMPLE = ['yi1', 'le', 'de', 'shang4', 'shi2e', 'na4', 'zhong4', 'zhu2'];

for (const id of SAMPLE) lessonTests(id);

test('通用课的实物是词卡，本字在词里标红', async ({ page }) => {
  await page.goto(`/?c=na4&fast`);
  await page.getByTestId('start').click();
  await expect(page.getByTestId('picture')).toBeVisible();
  const card = await page.getByTestId('picture').textContent();
  expect(card).toContain('那边');
  const red = await page.getByTestId('picture').locator('tspan').first().getAttribute('fill');
  expect(red).toBe('#b8352a');
});

test.describe('全量冒烟：每个字都能开课', () => {
  test.skip(!process.env.RUN_ALL, '设 RUN_ALL=1 才跑全量扫描');
  for (const id of JSON.parse(readFileSync('data/lessons.json', 'utf8'))) {
    test(`${id}`, async ({ page }) => {
      await page.goto(`/?c=${id}&fast`);
      await expect(scene(page)).toHaveAttribute('data-scene', 'start', { timeout: 10_000 });
    });
  }
});
