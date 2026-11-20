// 「大」画面像素自检：页面内把 #stage/#backdrop 序列化画进 canvas 采样。
// 关键色值、字形墨段行扫描、done 后底部残留扫描，都给数字。
// 用法：先 node scripts/serve.mjs 4212，再 node check-da.mjs 4212
import { chromium } from '@playwright/test';

const port = process.argv[2] || '4212';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

// 把某个 svg 元素栅格化后取采样点颜色
async function sample(sel, size, points) {
  return page.evaluate(async ([sel, size, points]) => {
    const src = document.querySelector(sel);
    const clone = src.cloneNode(true);
    clone.setAttribute('width', size[0]);
    clone.setAttribute('height', size[1]);
    const xml = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    img.src = url;
    await img.decode();
    const cv = document.createElement('canvas');
    cv.width = size[0];
    cv.height = size[1];
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#f2e8d5';
    ctx.fillRect(0, 0, size[0], size[1]);
    ctx.drawImage(img, 0, 0, size[0], size[1]);
    URL.revokeObjectURL(url);
    const px = (x, y) => Array.from(ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data);
    return Object.fromEntries(Object.entries(points).map(([k, [x, y]]) => [k, px(x, y)]));
  }, [sel, size, points]);
}

// 某一行暗于阈值的连续段 [[起,止],...]
async function segScan(sel, size, y, th) {
  return page.evaluate(async ([sel, size, y, th]) => {
    const src = document.querySelector(sel);
    const clone = src.cloneNode(true);
    clone.setAttribute('width', size[0]);
    clone.setAttribute('height', size[1]);
    const xml = new XMLSerializer().serializeToString(clone);
    const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    img.src = url;
    await img.decode();
    const cv = document.createElement('canvas');
    cv.width = size[0];
    cv.height = size[1];
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#f2e8d5';
    ctx.fillRect(0, 0, size[0], size[1]);
    ctx.drawImage(img, 0, 0, size[0], size[1]);
    URL.revokeObjectURL(url);
    const d = ctx.getImageData(0, Math.round(y), size[0], 1).data;
    const out = [];
    let s = null;
    for (let x = 0; x < size[0]; x++) {
      const l = 0.299 * d[x * 4] + 0.587 * d[x * 4 + 1] + 0.114 * d[x * 4 + 2];
      if (l < th) {
        if (s === null) s = x;
      } else if (s !== null) {
        out.push([s, x - 1]);
        s = null;
      }
    }
    if (s !== null) out.push([s, size[0] - 1]);
    return out;
  }, [sel, size, y, th]);
}

const lum = (v) => Math.round(0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2]);
const show = (title, pts) => {
  console.log(title);
  for (const [k, v] of Object.entries(pts)) console.log(`  ${k}: ${v.slice(0, 3).join(',')} 亮度=${lum(v)}`);
};
const segText = (segs) => JSON.stringify(segs.map(([a, b]) => `${a}-${b}`));

await page.goto(`http://localhost:${port}/?c=da`);
await page.waitForSelector('body[data-scene="start"]');
await page.getByTestId('start').click();
await page.waitForSelector('body[data-scene="picture"]');
await page.waitForTimeout(6000);

// --- picture：西瓜与小人的关键色 ---
show('--- picture 关键色（rgb/亮度） ---', await sample('#stage', [1024, 1024], {
  瓜心: [430, 608],
  瓜上空白: [430, 180],
  瓜左空白: [120, 608],
  小人头: [737, 442],
  小人躯干: [733, 560],
}));
const melonSegs = await segScan('#stage', [1024, 1024], 608, 178);
console.log(`  瓜横带 y=608 暗段(<178): ${melonSegs.length} 段 ${segText(melonSegs)}`);

await page.getByTestId('picture').click({ force: true });
await page.waitForSelector('body[data-scene="oracle"]');
await page.waitForTimeout(2600); // 侧立「人」定格
show('--- oracle·侧立「人」定格 ---', await sample('#stage', [1024, 1024], {
  侧立躯干: [483, 500],
  侧立左空白: [360, 500],
  侧立右空白: [620, 500],
}));
const sideSegs = await segScan('#stage', [1024, 1024], 500, 170);
const sideW = sideSegs.reduce((s, [a, b]) => s + b - a + 1, 0);
console.log(`  侧立横带 y=500 暗段: ${segText(sideSegs)} 墨宽合计=${sideW}`);

await page.waitForTimeout(4300); // oracle 场景内：drawOracle 总时长约六点二秒，张臂＋沉墨已完成
show('--- oracle·张臂定格（沉墨后） ---', await sample('#stage', [1024, 1024], {
  甲骨躯干: [505, 300],
  甲骨左臂: [425, 396],
  甲骨右臂: [599, 396],
  臂间空白: [560, 430],
  甲骨左脚: [406, 850],
  甲骨右脚: [608, 850],
  画面左空白: [110, 500],
}));
const armSegs = await segScan('#stage', [1024, 1024], 414, 170);
console.log(`  张臂横带 y=414 暗段: ${segText(armSegs)}`);

await page.waitForSelector('body[data-scene="seal"]', { timeout: 30_000 });
await page.waitForTimeout(3200); // seal 变形完成（小篆形态）
show('--- seal·小篆（臂下垂的长弧） ---', await sample('#stage', [1024, 1024], {
  篆躯干: [512, 300],
  篆左臂弧: [392, 322],
  篆右臂弧: [632, 322],
  篆左臂端: [282, 380],
  篆左脚: [390, 870],
  篆右脚: [642, 870],
  字上空白: [512, 60],
}));

await page.waitForSelector('body[data-scene="kaishu"]', { timeout: 30_000 });
await page.waitForTimeout(3400);
show('--- kaishu ---', await sample('#stage', [1024, 1024], {
  楷书横中: [514, 399],
  楷书捺: [700, 770],
  字右下空白: [960, 600],
}));
for (const [y, name] of [[390, '横带'], [600, '撇带'], [770, '捺带']]) {
  console.log(`  y=${y} ${name} 暗段: ${segText(await segScan('#stage', [1024, 1024], y, 170))}`);
}

await page.waitForSelector('body[data-scene="trace"]', { timeout: 60_000 });
await page.waitForTimeout(1000);
const n = await page.evaluate(() => window.hz.data.medians.length);
for (let i = 0; i < n; i++) {
  const pts = await page.evaluate((i) => window.hz.data.medians[i].map(([x, y]) => window.hz.dataToClient(x, y)), i);
  await page.mouse.move(pts[0][0], pts[0][1]);
  await page.mouse.down();
  for (const [x, y] of pts.slice(1)) await page.mouse.move(x, y, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(250);
}
await page.waitForSelector('body[data-scene="done"]', { timeout: 30_000 });
await page.waitForTimeout(5500);

show('--- done ---', await sample('#stage', [1024, 1024], {
  瓜影空白处: [300, 650],
  小人淡影: [733, 560],
  字撇下段: [430, 608],
  底部空白: [512, 950],
}));
const domDone = await page.evaluate(() => ({
  picture: document.querySelector('.da-melon-root')?.getAttribute('opacity'),
  morph: document.querySelector('#morph-layer .morph')?.getAttribute('opacity'),
  grid: document.querySelector('[data-testid="grid"]')?.getAttribute('opacity'),
  ghost: document.querySelector('[data-testid="ghost"]')?.getAttribute('opacity'),
}));
console.log(`  DOM opacity: picture=${domDone.picture} morph=${domDone.morph} grid=${domDone.grid} ghost=${domDone.ghost}`);
const back = await sample('#backdrop', [1600, 1000], { 大山主体: [1150, 700], 山下空白: [1150, 940] });
console.log(`  大山: ${back.大山主体.slice(0, 3).join(',')} 亮度=${lum(back.大山主体)}；山下 ${back.山下空白.slice(0, 3).join(',')} 亮度=${lum(back.山下空白)}`);

// 残留扫描：画面下部每 20 行的暗像素数（y≥880 应为 0：无地面线/辅助线/格子残留）
const scan = [];
for (let y = 500; y < 1024; y += 20) {
  const segs = await segScan('#stage', [1024, 1024], y, 170);
  scan.push(`${y}:${segs.reduce((s, [a, b]) => s + b - a + 1, 0)}`);
}
console.log('--- done 残留扫描（y:暗像素数） ---');
console.log('  ' + scan.join(' '));

console.log(errors.length ? `页面错误：${errors.join(' | ')}` : '全程无页面错误');
await browser.close();
