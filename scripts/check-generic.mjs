// 通用课画面的几何体检：不靠肉眼，直接量 DOM。
// 检查：词卡文字在屏内、本字是朱红、拼音在词下方、楷书字形和笔顺动画层
// 完全对齐（切场景不跳）、flow 走完没有 JS 报错。用法：node scripts/check-generic.mjs [id] [端口]
import { chromium } from '@playwright/test';

const id = process.argv[2] || 'yi1';
const port = process.argv[3] || 4199;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('response', (r) => {
  // HEAD 探测 src/chars/<id>/index.js 的 404 是预期行为（判断有没有定制课）
  if (r.status() >= 400 && !r.url().includes('favicon') && r.request().method() !== 'HEAD') {
    errors.push(`http ${r.status()}: ${r.url()}`);
  }
});
page.on('console', (m) => {
  // HEAD 探测的 404 会留下这行 console；真正的坏资源由上面的 http 监听负责
  if (m.type() === 'error' && !/404/.test(m.text())) errors.push(`console: ${m.text()}`);
});

await page.goto(`http://localhost:${port}/?c=${id}`);
await page.waitForSelector('body[data-scene="start"]');
await page.getByTestId('start').click();
await page.waitForSelector('body[data-scene="picture"]');
await page.waitForTimeout(2500);

const vp = page.viewportSize();
const inView = (b) => b && b.x >= -2 && b.y >= -2 && b.x + b.width <= vp.width + 2 && b.y + b.height <= vp.height + 2;
const fail = [];
const ok = (name, cond) => (cond ? console.log(`  ✓ ${name}`) : fail.push(name));

// 词卡：文字、拼音、朱红本字
const card = await page.getByTestId('picture').textContent();
const picBox = await page.getByTestId('picture').boundingBox();
ok(`实物（${card}）可见且在屏内`, inView(picBox));
const red = await page.evaluate(() => {
  const t = [...document.querySelectorAll('#picture-layer tspan')];
  return t.filter((s) => s.getAttribute('fill') === '#b8352a').map((s) => s.textContent).join('');
});
const pinyinBox = await page.locator('#picture-layer text').nth(1).boundingBox();
ok('本字标朱红', red.length === 1);
ok('拼音在词下面且在屏内', pinyinBox && inView(pinyinBox) && pinyinBox.y > picBox.y);

await page.getByTestId('picture').click({ force: true });
await page.waitForSelector('body[data-scene="kaishu"]');
await page.waitForTimeout(3200);
await page.waitForSelector('body[data-scene="order"]', { timeout: 60_000 });
await page.waitForTimeout(4200); // 等笔顺动画写完

// 对齐检查：楷书字形层和笔顺动画层必须是同一份轮廓（d 完全一致）、
// 变换最终回到 scale(1)，这样笔顺动画开始时画面不会「跳」
const aligned = await page.evaluate(() => {
  const mine = [...document.querySelectorAll('#morph-layer path')].map((p) => p.getAttribute('d'));
  const clips = [...document.querySelectorAll('#kaishu-layer clipPath path')].map((p) => p.getAttribute('d'));
  const inner = document.querySelector('#morph-layer g g g');
  return JSON.stringify(mine) === JSON.stringify(clips) && /scale\(1(\.0+)?\)/.test(inner.getAttribute('transform'));
});
ok('楷书字形与笔顺动画层完全对齐（切换不跳）', aligned);

// 一路走到描红，检查田字格在屏内、无报错
await page.getByTestId('btn-write').click();
await page.waitForSelector('body[data-scene="trace"]');
await page.waitForTimeout(900);
ok('田字格在屏内', inView(await page.getByTestId('grid').boundingBox()));
ok('全程无 JS 报错', errors.length === 0);

console.log(errors.length ? errors.map((e) => `  ${e}`).join('\n') : '');
await browser.close();
if (fail.length) {
  console.log(`\n✗ ${id} 有 ${fail.length} 项不过：${fail.join('、')}`);
  process.exit(1);
}
console.log(`\n✓ ${id} 画面体检全部通过`);
