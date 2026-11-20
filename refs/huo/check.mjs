// 火课像素自检：给数字不给形容词。
// 画面真速走一遍采「夜幕/焰心/外焰/木柴/刻痕/纸面」，fast 走到 done 做「字迹/残留扫描/复燃焰心」。
import { chromium } from '@playwright/test';

const PORT = 4219;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1180, height: 820 } });

// stage 坐标（y 朝下）→ client 坐标
const toClient = async (x, y) => page.evaluate(([x, y]) => window.hz.dataToClient(x, 900 - y), [x, y]);

// 截图 → 页面内 canvas 解码 → 取样/扫描
const shot = async () => {
  const buf = await page.screenshot();
  return buf.toString('base64');
};
const sample = async (b64, points) =>
  page.evaluate(async ([b64, points]) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const px = (x, y) => {
      const d = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
      return [d[0], d[1], d[2]];
    };
    const out = {};
    for (const [name, x, y] of points) out[name] = px(x, y);
    out.__w = img.width; out.__h = img.height;
    return out;
  }, [b64, points]);

const scan = async (b64, rect, maxLum) =>
  page.evaluate(async ([b64, rect, maxLum]) => {
    const img = new Image();
    img.src = 'data:image/png;base64,' + b64;
    await img.decode();
    const cv = document.createElement('canvas');
    cv.width = img.width; cv.height = img.height;
    const ctx = cv.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const [x0, y0, x1, y1] = rect;
    const d = ctx.getImageData(x0, y0, x1 - x0, y1 - y0).data;
    let dark = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2] < maxLum) dark++;
    }
    return { dark, total: d.length / 4 };
  }, [b64, rect, maxLum]);

const nums = (o) => JSON.stringify(Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : v])));

await page.goto(`http://localhost:${PORT}/?c=huo`);
await page.waitForSelector('body[data-scene="start"]');
await page.getByTestId('start').click();
await page.waitForSelector('body[data-scene="picture"]');
await page.waitForTimeout(4500); // 夜幕、柴、点火都走完，火苗呼吸中

// —— 画面（真速）——
{
  const pt = {
    heart: await toClient(505, 600), // 焰心暖黄
    leftTongue: await toClient(404, 560), // 左侧小火苗舌（焰橙带，舌中线上）
    crimsonEdge: await toClient(467, 600), // 主焰外缘绛红带
    log: await toClient(420, 783), // 木柴
    nightSky: [30, 30], // 夜幕角落
    paper: await toClient(120, 700), // 画面下方的纸（夜幕罩着）
  };
  const r = await sample(await shot(), Object.entries(pt).map(([k, v]) => [k, v[0], v[1]]));
  console.log('[picture]', nums(r));
}

// —— 甲骨文终形（真速，刻完沉墨后）——
await page.getByTestId('picture').click({ force: true });
await page.waitForSelector('body[data-scene="oracle"]');
await page.waitForTimeout(9000); // 刻痕 + 沉墨走完（真速约 3.2s，再等旁白间隙）
{
  const pt = {
    mainCut: await toClient(498, 300), // 主焰刻痕（墨）
    sparkCut: await toClient(313, 435), // 左火星刻痕
    paper: await toClient(150, 600), // 字旁纸面（夜幕应已退净）
    cleanZone: await toClient(100, 270), // 左侧干净带
  };
  const s = await sample(await shot(), Object.entries(pt).map(([k, v]) => [k, v[0], v[1]]));
  console.log('[oracle-end]', nums(s));
}
await page.waitForSelector('body[data-scene="trace"]', { timeout: 40_000 });

// —— done（fast 通道重开，描完全部笔画；拖动用 CDP 级 mouse，lesson.js 同款）——
await page.goto(`http://localhost:${PORT}/?c=huo&fast`);
await page.waitForSelector('body[data-scene="start"]');
await page.getByTestId('start').click();
await page.waitForSelector('body[data-scene="picture"]');
await page.getByTestId('picture').click({ force: true });
await page.waitForSelector('body[data-scene="trace"]');
const nStrokes = await page.evaluate(() => window.hz.data.medians.length);
for (let i = 0; i < nStrokes; i++) {
  const pts = await page.evaluate((i) => {
    const m = window.hz.data.medians[i];
    return m.map(([x, y]) => window.hz.dataToClient(x, y));
  }, i);
  await page.mouse.move(pts[0][0], pts[0][1]);
  await page.mouse.down();
  for (const [x, y] of pts.slice(1)) await page.mouse.move(x, y, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(300);
}
await page.waitForSelector('body[data-scene="done"]', { timeout: 30_000 });
await page.waitForTimeout(2500); // 收尾：火重新点起来
{
  const a = await toClient(70, 420);
  const b = await toClient(150, 120);
  const strip = [Math.round(Math.min(a[0], b[0])), Math.round(Math.min(a[1], b[1])), Math.round(Math.max(a[0], b[0])), Math.round(Math.max(a[1], b[1]))];
  const pt = {
    relitHeart: await toClient(505, 600), // 复燃焰心
    charStroke: await toClient(498, 300), // 写好的主撇（墨）
    paperNearChar: await toClient(250, 640), // 字旁纸面（薄暮下应仍亮）
  };
  const s = await sample(await shot(), Object.entries(pt).map(([k, v]) => [k, v[0], v[1]]));
  // 共享背景里有飞鸟掠过：连扫三次分开报，逐次读数（鸟影是过路的，不是残留）
  const scans = [];
  for (let i = 0; i < 3; i++) {
    scans.push(await scan(await shot(), strip, 90));
    await page.waitForTimeout(2000);
  }
  console.log('[done]', nums(s));
  console.log('[done-residue] 左侧干净带(stage x70~150,y120~420) 亮度<90 的像素（连扫三次，鸟影过路会偶现）:',
    scans.map((sc) => `${sc.dark}/${sc.total}`).join('  '));
}

await browser.close();
