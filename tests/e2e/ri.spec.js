// 「日」一课的交互：开始、摸太阳、字形演变顺序、描红判定、按钮。
// ?fast 让动画和语音几乎瞬间结束；body[data-last-audio] 记录最后一句该播的旁白。
import { test, expect } from '@playwright/test';

const scene = (page) => page.locator('body');

async function start(page) {
  await page.goto('/?fast');
  await expect(scene(page)).toHaveAttribute('data-scene', 'start');
  await page.getByTestId('start').click();
  await expect(scene(page)).toHaveAttribute('data-scene', 'sun');
}

async function enterTrace(page) {
  await start(page);
  await page.getByTestId('btn-write').click();
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
}

// 沿着第 i 笔的中线拖动；reverse 表示倒着写
async function drawStroke(page, i, { reverse = false } = {}) {
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

test('点开始后太阳出现，摸太阳会读「日」，然后进入甲骨文', async ({ page }) => {
  await start(page);
  await expect(page.getByTestId('sun')).toBeVisible();
  await expect(scene(page)).toHaveAttribute('data-last-audio', 'intro');
  await page.getByTestId('sun').click({ force: true });
  await expect(scene(page)).toHaveAttribute('data-last-audio', /sound|oracle/);
  await expect(scene(page)).not.toHaveAttribute('data-scene', 'sun');
});

test('太阳刚出现、开场白还没说完就摸，也算摸到了', async ({ page }) => {
  await page.goto('/?fast');
  await expect(scene(page)).toHaveAttribute('data-scene', 'start');
  await page.getByTestId('start').click();
  await page.getByTestId('sun').click({ force: true });
  await expect(scene(page)).toHaveAttribute('data-scene', 'trace', { timeout: 10_000 });
});

test('一直不摸太阳，提醒两次后自己往下走', async ({ page }) => {
  await start(page);
  await expect(scene(page)).toHaveAttribute('data-scene', 'trace', { timeout: 10_000 });
});

test('字形按 太阳→甲骨文→小篆→楷书→笔顺→描红 的顺序演变', async ({ page }) => {
  await page.goto('/?fast');
  await expect(scene(page)).toHaveAttribute('data-scene', 'start');
  await page.evaluate(() => {
    window.__scenes = [];
    new MutationObserver(() => {
      const s = document.body.dataset.scene;
      if (window.__scenes.at(-1) !== s) window.__scenes.push(s);
    }).observe(document.body, { attributes: true, attributeFilter: ['data-scene'] });
  });
  await page.getByTestId('start').click();
  await page.getByTestId('sun').click({ force: true });
  await expect(scene(page)).toHaveAttribute('data-scene', 'trace', { timeout: 20_000 });
  expect(await page.evaluate(() => window.__scenes)).toEqual(['sun', 'oracle', 'seal', 'kaishu', 'order', 'trace']);
});

test('印章依次标出 甲骨文、小篆、楷书', async ({ page }) => {
  await page.goto('/?fast');
  await expect(scene(page)).toHaveAttribute('data-scene', 'start');
  // 快速模式下旧印章很快就被移走，所以记录每一个出现过的印章，而不是去轮询
  await page.evaluate(() => {
    window.__stamps = [];
    new MutationObserver((records) => {
      for (const r of records) for (const n of r.addedNodes) if (n.dataset?.label) window.__stamps.push(n.dataset.label);
    }).observe(document.getElementById('stamp-layer'), { childList: true });
  });
  await page.getByTestId('start').click();
  await page.getByTestId('sun').click({ force: true });
  await expect(scene(page)).toHaveAttribute('data-scene', 'trace', { timeout: 20_000 });
  expect(await page.evaluate(() => window.__stamps)).toEqual(['甲骨文', '小篆', '楷书']);
});

test('按笔顺描对四笔，字就写完了', async ({ page }) => {
  await enterTrace(page);
  for (let i = 0; i < 4; i++) {
    await expect(scene(page)).toHaveAttribute('data-stroke-index', String(i));
    await drawStroke(page, i);
  }
  await expect(scene(page)).toHaveAttribute('data-scene', 'done');
  await expect(scene(page)).toHaveAttribute('data-last-audio', 'done');
});

test('倒着写不算；连错两次会播「再试一次」', async ({ page }) => {
  await enterTrace(page);
  await drawStroke(page, 0, { reverse: true });
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
  await drawStroke(page, 0, { reverse: true });
  await expect(scene(page)).toHaveAttribute('data-last-audio', 'retry');
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
  await drawStroke(page, 0);
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '1');
});

test('跳着写下一笔不算', async ({ page }) => {
  await enterTrace(page);
  await drawStroke(page, 2);
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
});

test('点一下不算一笔', async ({ page }) => {
  await enterTrace(page);
  const [x, y] = await page.evaluate(() => window.hz.dataToClient(...window.hz.data.medians[0][0]));
  await page.mouse.click(x, y);
  await expect(scene(page)).toHaveAttribute('data-stroke-index', '0');
});

test('喇叭按钮读「日」，再看一遍回到太阳', async ({ page }) => {
  await enterTrace(page);
  await page.getByTestId('btn-sound').click();
  await expect(scene(page)).toHaveAttribute('data-last-audio', 'sound');
  await page.getByTestId('btn-replay').click();
  await expect(scene(page)).toHaveAttribute('data-scene', 'sun');
  await expect(scene(page)).not.toHaveAttribute('data-stroke-index');
});
