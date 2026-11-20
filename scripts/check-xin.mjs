// 「心」的像素自检：真实速度走一遍课，在每个关键场景采样像素颜色 + DOM 几何断言。
// 用法：先 node scripts/serve.mjs 4220，再 node scripts/check-xin.mjs
import { chromium } from '@playwright/test';

const BASE = 'http://localhost:4220';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });

// 把 screenshot 解码成可采样的 canvas，返回采样点的颜色。
// 舞台→client 一律用引擎的 getScreenCTM（手工按 viewport 推算会有偏差）：
// 采样点用舞台坐标（y 向下）定义，先换成数据坐标（y 向上）再 dataToClient。
async function sample(buffer, stagePts) {
  const b64 = buffer.toString('base64');
  return page.evaluate(async ([b64, pts]) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    cv.getContext('2d').drawImage(img, 0, 0);
    const ctx = cv.getContext('2d');
    const out = {};
    for (const [name, [x, y]] of Object.entries(pts)) {
      const [cx, cy] = window.hz.dataToClient(x, 900 - y);
      const d = ctx.getImageData(Math.round(cx), Math.round(cy), 1, 1).data;
      out[name] = [d[0], d[1], d[2]];
    }
    return out;
  }, [b64, stagePts]);
}

const lum = ([r, g, b]) => Math.round(0.299 * r + 0.587 * g + 0.114 * b);
const results = [];
const judge = (name, cond, detail) => results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}  ${detail}`);

await page.goto(`${BASE}/?c=xin`);
await page.waitForSelector('body[data-scene="start"]');
await page.getByTestId('start').click();

// ---- picture：孩子 + 胸口的心 ----
await page.waitForSelector('body[data-scene="picture"]');
await page.waitForTimeout(6500);
let c = await sample(await page.screenshot(), {
  heart: [512, 452],   // 胸口心的中心：应为胭脂红
  halo: [648, 470],    // 心右侧外的暖光：暖、亮
  head: [512, 262],    // 头：深墨
  leg: [487, 700],     // 腿：深墨
  paper: [140, 140],   // 左上纸面：亮
});
console.log('picture', JSON.stringify(c));
judge('胸口心为胭脂红', c.heart[0] - c.heart[2] > 35 && c.heart[0] > 110, `rgb(${c.heart})`);
judge('心外暖晕暖色', c.halo[0] >= c.halo[2] && lum(c.halo) > 170, `rgb(${c.halo}) lum=${lum(c.halo)}`);
judge('头部深墨可辨', lum(c.head) < 120, `rgb(${c.head}) lum=${lum(c.head)}`);
judge('腿部深墨可辨', lum(c.leg) < 120, `rgb(${c.leg}) lum=${lum(c.leg)}`);
judge('纸面干净明亮', lum(c.paper) > 190, `rgb(${c.paper}) lum=${lum(c.paper)}`);

// ---- oracle：心廓 + 内点，孩子已退 ----
// 各场景都在「变形完成之后、旁白还没说完」的稳定窗口里采样
// （旁白说完 400ms 后引擎就切下一场景，固定延时必须卡在这个窗口内）。
await page.getByTestId('picture').click({ force: true });
await page.waitForSelector('body[data-scene="oracle"]');
await page.waitForTimeout(4600); // 刻字 4.3s 完成，旁白约 6s 还在说
c = await sample(await page.screenshot(), {
  rim: [443, 436],   // 外廓左线：墨
  inner: [516, 520], // 廓内点：墨
  hollow: [517, 340],// 廓内上部空白：亮
  hollow2: [517, 620],// 廓内下部（孩子原胸口位置）：亮，无残留
  paper: [140, 140],
});
console.log('oracle', JSON.stringify(c));
judge('甲骨外廓有墨', lum(c.rim) < 130, `rgb(${c.rim}) lum=${lum(c.rim)}`);
judge('廓内点有墨', lum(c.inner) < 130, `rgb(${c.inner}) lum=${lum(c.inner)}`);
judge('廓内留白干净', lum(c.hollow) > 185, `rgb(${c.hollow}) lum=${lum(c.hollow)}`);
judge('胸口无孩子残留', lum(c.hollow2) > 185, `rgb(${c.hollow2}) lum=${lum(c.hollow2)}`);

// ---- seal：圆转外廓 + 内短竖 ----
await page.waitForSelector('body[data-scene="seal"]');
await page.waitForTimeout(3200); // 变形 2.8s 完成，旁白约 5s 还在说
c = await sample(await page.screenshot(), {
  rim: [445, 530],   // 外廓左线
  inner: [517, 540], // 廓内短竖
  hollow: [517, 350],
});
console.log('seal', JSON.stringify(c));
judge('小篆外廓有墨', lum(c.rim) < 130, `rgb(${c.rim}) lum=${lum(c.rim)}`);
judge('小篆内竖有墨', lum(c.inner) < 130, `rgb(${c.inner}) lum=${lum(c.inner)}`);
judge('小篆廓内留白', lum(c.hollow) > 185, `rgb(${c.hollow}) lum=${lum(c.hollow)}`);

// ---- kaishu：卧钩 + 三点，与笔画外框对齐 ----
await page.waitForSelector('body[data-scene="kaishu"]');
await page.waitForTimeout(3600); // 变形 2.4s 完成（含三点长出），旁白约 7s 还在说
c = await sample(await page.screenshot(), {
  dotL: [168, 550], dotM: [500, 300], dotR: [862, 362], hook: [560, 710],
  inside: [480, 520], outside: [512, 120],
});
console.log('kaishu', JSON.stringify(c));
judge('左点有墨', lum(c.dotL) < 130, `rgb(${c.dotL}) lum=${lum(c.dotL)}`);
judge('中点有墨', lum(c.dotM) < 130, `rgb(${c.dotM}) lum=${lum(c.dotM)}`);
judge('右点有墨', lum(c.dotR) < 130, `rgb(${c.dotR}) lum=${lum(c.dotR)}`);
judge('卧钩底部有墨', lum(c.hook) < 130, `rgb(${c.hook}) lum=${lum(c.hook)}`);
judge('字内留白干净', lum(c.inside) > 185, `rgb(${c.inside}) lum=${lum(c.inside)}`);
judge('字外上方干净', lum(c.outside) > 185, `rgb(${c.outside}) lum=${lum(c.outside)}`);

// 楷书联合外框 vs 笔画数据外框（DOM 几何，给数字）
const box = await page.evaluate(() => {
  const outlineBox = (d) => {
    const v = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (let i = 0; i + 1 < v.length; i += 2) {
      x0 = Math.min(x0, v[i]); x1 = Math.max(x1, v[i]);
      y0 = Math.min(y0, 900 - v[i + 1]); y1 = Math.max(y1, 900 - v[i + 1]);
    }
    return { x0, x1, y0, y1 };
  };
  const morph = document.querySelector('#morph-layer .morph');
  const paths = [...morph.querySelectorAll('path')].filter((p) => (p.getAttribute('d') || '').length > 4);
  const bs = paths.map((p) => p.getBBox());
  const m = {
    x0: Math.min(...bs.map((b) => b.x)), x1: Math.max(...bs.map((b) => b.x + b.width)),
    y0: Math.min(...bs.map((b) => b.y)), y1: Math.max(...bs.map((b) => b.y + b.height)),
  };
  let k = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 };
  for (const s of window.hz.data.strokes) {
    const b = outlineBox(s);
    k = { x0: Math.min(k.x0, b.x0), x1: Math.max(k.x1, b.x1), y0: Math.min(k.y0, b.y0), y1: Math.max(k.y1, b.y1) };
  }
  const op = Number(morph.getAttribute('opacity'));
  return { op, paths: paths.length, m, k, diff: ['x0', 'x1', 'y0', 'y1'].map((key) => Math.round(m[key] - k[key])) };
});
console.log('kaishu-box', JSON.stringify(box));
judge('楷书与笔画外框对齐(<42)', box.diff.every((d) => Math.abs(d) < 42), `diff=[${box.diff}] paths=${box.paths} op=${box.op}`);

// ---- trace → done：写完四笔，收尾零残留 ----
await page.getByTestId('btn-write').click();
await page.waitForSelector('body[data-scene="trace"]');
const draw = async (i) => {
  await page.waitForFunction((i) => document.body.dataset.strokeIndex === String(i), i, { timeout: 20_000 });
  const pts = await page.evaluate((i) => window.hz.data.medians[i].map(([x, y]) => window.hz.dataToClient(x, y)), i);
  await page.mouse.move(pts[0][0], pts[0][1]);
  await page.mouse.down();
  for (const [x, y] of pts.slice(1)) await page.mouse.move(x, y, { steps: 6 });
  await page.mouse.up();
};
for (let i = 0; i < 4; i++) await draw(i);
await page.waitForSelector('body[data-scene="done"]');
await page.waitForTimeout(6000); // 等 finale（孩子回淡影 + 飘心收干净）
c = await sample(await page.screenshot(), {
  heartDim: [480, 520], // 心透出的淡红（在字内留白处）
  floatPath: [430, 120], // 飘心路径上端：应回到纸色
  floatPath2: [600, 140],
  hook: [560, 710],     // 写好的字还在
  paper: [140, 140],
});
console.log('done', JSON.stringify(c));
judge('收尾心透出淡红', c.heartDim[0] - c.heartDim[2] > 8, `rgb(${c.heartDim}) R-B=${c.heartDim[0] - c.heartDim[2]}`);
judge('飘心路径无残留', lum(c.floatPath) > 185 && lum(c.floatPath2) > 185, `lum=${lum(c.floatPath)}/${lum(c.floatPath2)}`);
judge('写好的字保留', lum(c.hook) < 130, `rgb(${c.hook}) lum=${lum(c.hook)}`);
judge('纸面仍干净', lum(c.paper) > 190, `lum=${lum(c.paper)}`);

// DOM：飘心容器清空、picture 层无游离元素
const dom = await page.evaluate(() => ({
  rootOp: Number(document.querySelector('.xin-kid')?.getAttribute('opacity')),
  floatsN: document.querySelector('.xin-floats')?.children.length,
  stray: [...document.querySelectorAll('#picture-layer > g')].filter(
    (g) => !g.classList.contains('xin-kid') && !g.classList.contains('xin-floats'),
  ).length,
}));
console.log('done-dom', JSON.stringify(dom));
judge('收尾 root 淡影(0.2..0.6)', dom.rootOp >= 0.2 && dom.rootOp <= 0.6, `rootOp=${dom.rootOp}`);
judge('飘心容器清空', dom.floatsN === 0, `floatsN=${dom.floatsN}`);
judge('picture 层无游离元素', dom.stray === 0, `stray=${dom.stray}`);

await browser.close();
console.log('\n===== 汇总 =====');
console.log(results.join('\n'));
const fails = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`\n${fails === 0 ? 'ALL PASS' : fails + ' FAILED'}`);
process.exit(fails === 0 ? 0 : 1);
