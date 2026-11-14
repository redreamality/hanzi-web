// 每个字都要通过的通用交互测试。用法（tests/e2e/<id>.spec.js）：
//   import { lessonTests } from './lesson.js';
//   lessonTests('yue');
// ?fast 让动画和语音几乎瞬间结束；body[data-last-audio] 记录最后一句该播的旁白。
import { test, expect } from '@playwright/test';

export const scene = (page) => page.locator('body');

export async function open(page, id) {
  await page.goto(`/?c=${id}&fast`);
  await expect(scene(page)).toHaveAttribute('data-scene', 'start');
}

export async function start(page, id) {
  await open(page, id);
  await page.getByTestId('start').click();
  await expect(scene(page)).toHaveAttribute('data-scene', 'picture');
}

export async function enterTrace(page, id) {
  await start(page, id);
  await page.getByTestId('btn-write').click();
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
}

// 实物一直在呼吸，Playwright 等不到它「静止」，所以强制点
export const tapPicture = (page) => page.getByTestId('picture').click({ force: true });

// 沿着第 i 笔的中线拖动；reverse 表示倒着写
export async function drawStroke(page, i, { reverse = false } = {}) {
  const pts = await page.evaluate(
    ([i, reverse]) => {
      const m = window.hz.data.medians[i];
      return (reverse ? [...m].reverse() : m).map(([x, y]) => window.hz.dataToClient(x, y));
    },
    [i, reverse],
  );
  await page.mouse.move(pts[0][0], pts[0][1]);
  await page.mouse.down();
  for (const [x, y] of pts.slice(1)) await page.mouse.move(x, y, { steps: 6 });
  await page.mouse.up();
}

// 快速模式下场景和印章闪得太快，轮询抓不到，所以用 MutationObserver 记下每一次变化
async function record(page) {
  await page.evaluate(() => {
    window.__scenes = [];
    window.__stamps = [];
    new MutationObserver(() => {
      const s = document.body.dataset.scene;
      if (window.__scenes.at(-1) !== s) window.__scenes.push(s);
    }).observe(document.body, { attributes: true, attributeFilter: ['data-scene'] });
    new MutationObserver((records) => {
      for (const r of records) for (const n of r.addedNodes) if (n.dataset?.label) window.__stamps.push(n.dataset.label);
    }).observe(document.getElementById('stamp-layer'), { childList: true });
  });
}

export function lessonTests(id) {
  test.describe(`通用：${id}`, () => {
    test('点开始后实物出现并说开场白，摸它会读字音，然后往下走', async ({ page }) => {
      await start(page, id);
      await expect(page.getByTestId('picture')).toBeVisible();
      await expect(scene(page)).toHaveAttribute('data-last-audio', 'intro');
      await tapPicture(page);
      await expect(scene(page)).not.toHaveAttribute('data-scene', 'picture');
    });

    test('实物刚出现就摸，也算摸到了', async ({ page }) => {
      await open(page, id);
      await page.getByTestId('start').click();
      await tapPicture(page);
      await expect(scene(page)).toHaveAttribute('data-scene', 'trace', { timeout: 10_000 });
    });

    test('一直不摸，提醒两次后自己往下走', async ({ page }) => {
      await start(page, id);
      await expect(scene(page)).toHaveAttribute('data-scene', 'trace', { timeout: 10_000 });
    });

    test('场景按 实物→各字形→笔顺→描红 的顺序走，印章依次出现', async ({ page }) => {
      await open(page, id);
      await record(page);
      await page.getByTestId('start').click();
      await tapPicture(page);
      await expect(scene(page)).toHaveAttribute('data-scene', 'trace', { timeout: 20_000 });
      const forms = await page.evaluate(() => window.hz.data.forms);
      expect(await page.evaluate(() => window.__scenes)).toEqual(['picture', ...forms.map((f) => f.id), 'order', 'trace']);
      expect(await page.evaluate(() => window.__stamps)).toEqual(forms.map((f) => f.label));
    });

    test('按笔顺描对每一笔，字就写完了', async ({ page }) => {
      await enterTrace(page, id);
      const n = await page.evaluate(() => window.hz.data.medians.length);
      for (let i = 0; i < n; i++) {
        await expect(scene(page)).toHaveAttribute('data-stroke-index', String(i));
        await drawStroke(page, i);
      }
      await expect(scene(page)).toHaveAttribute('data-scene', 'done');
      await expect(scene(page)).toHaveAttribute('data-last-audio', 'done');
    });

    test('第一笔倒着写不算；连错两次会播「再试一次」', async ({ page }) => {
      await enterTrace(page, id);
      await drawStroke(page, 0, { reverse: true });
      await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
      await drawStroke(page, 0, { reverse: true });
      await expect(scene(page)).toHaveAttribute('data-last-audio', 'retry');
      await drawStroke(page, 0);
      await expect(scene(page)).toHaveAttribute('data-stroke-index', '1');
    });

    test('点一下不算一笔', async ({ page }) => {
      await enterTrace(page, id);
      const [x, y] = await page.evaluate(() => window.hz.dataToClient(...window.hz.data.medians[0][0]));
      await page.mouse.click(x, y);
      await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
    });

    test('喇叭按钮读字音，再看一遍回到实物', async ({ page }) => {
      await enterTrace(page, id);
      await page.getByTestId('btn-sound').click();
      await expect(scene(page)).toHaveAttribute('data-last-audio', 'sound');
      await page.getByTestId('btn-replay').click();
      await expect(scene(page)).toHaveAttribute('data-scene', 'picture');
      await expect(scene(page)).not.toHaveAttribute('data-stroke-index');
    });
  });
}
