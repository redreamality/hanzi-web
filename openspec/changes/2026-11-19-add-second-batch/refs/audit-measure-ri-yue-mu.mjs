// 审计度量：拓片位图（rasters.json）+ 代码 ORACLE 形（此处重画）→ 同一套度量 → JSON 行输出。
// 代码形数据只读摘自 src/chars/{yue,ri,mu}/morph.js 的 ORACLE 常量（骨架点+笔宽），不改任何 src。
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';

const S = 256;
const CODE = {
  yue: [
    { pts: [[574,225],[455,265],[355,360],[322,480],[330,600],[380,705],[472,772],[560,785]], w: 24 },
    { pts: [[574,225],[478,300],[438,420],[440,540],[468,650],[520,725],[560,785]], w: 24 },
    { pts: [[378,455],[384,570]], w: 24 },
  ],
  ri: { ellipse: { cx: 507, cy: 505, a: 214, b: 195, n: 2.1 }, inner: { half: 100 }, w: 24 }, // 2026-11-20 返修后常量（原 a214 b222 half2）
  mu: [
    { pts: [[505,318],[471,281],[438,244],[404,207],[370,168],[336,132]], w: 30 },
    { pts: [[505,318],[539,281],[572,244],[606,207],[640,168],[674,132]], w: 30 },
    { pts: [[505,112],[504,260],[506,420],[505,600],[504,760],[505,898]], w: 36 },
    { pts: [[505,742],[470,772],[436,800],[402,826],[368,856],[336,888]], w: 28 },
    { pts: [[505,742],[540,772],[574,800],[608,826],[642,856],[674,888]], w: 28 },
  ],
};

// ---------- 浏览器：画代码形 ----------
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto('about:blank');
const codeBits = await page.evaluate(({ CODE, S }) => {
  const out = {};
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const draw = (strokes) => {
    let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9;
    for (const st of strokes) for (const [x, y] of st.pts) {
      const r = st.w / 2;
      x1 = Math.min(x1, x - r); y1 = Math.min(y1, y - r); x2 = Math.max(x2, x + r); y2 = Math.max(y2, y + r);
    }
    const k = Math.min((S - 4) / (x2 - x1), (S - 4) / (y2 - y1));
    c.width = S; c.height = S;
    ctx.clearRect(0, 0, S, S);
    ctx.strokeStyle = ctx.fillStyle = '#000';
    ctx.lineCap = ctx.lineJoin = 'round';
    for (const st of strokes) {
      ctx.lineWidth = st.w * k;
      ctx.beginPath();
      st.pts.forEach(([x, y], i) => {
        const px = 2 + (x - x1) * k, py = 2 + (y - y1) * k;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      });
      ctx.stroke();
    }
    const d = ctx.getImageData(0, 0, S, S).data;
    const bits = new Uint8Array(S * S);
    for (let i = 0; i < bits.length; i++) bits[i] = d[i * 4 + 3] >= 128 ? 1 : 0;
    return { w: S, h: S, bits: Array.from(bits) };
  };
  // 月、木：多笔画
  out.yue = draw(CODE.yue);
  out.mu = draw(CODE.mu);
  // 日：超椭圆轮廓 + 中心点
  {
    const f = CODE.ri, e = f.ellipse;
    const pts = [];
    for (let i = 0; i < 160; i++) {
      const t = -Math.PI / 2 + (2 * Math.PI * i) / 160;
      const co = Math.cos(t), si = Math.sin(t);
      const ex = 2 / e.n;
      pts.push([e.cx + e.a * Math.sign(co) * Math.abs(co) ** ex, e.cy + e.b * Math.sign(si) * Math.abs(si) ** ex]);
    }
    out.ri = draw([{ pts, w: f.w }, { pts: [[e.cx - f.inner.half, e.cy], [e.cx + f.inner.half, e.cy]], w: f.w }]);
  }
  return out;
}, { CODE, S });
await browser.close();

// ---------- 读拓片 ----------
const all = JSON.parse(readFileSync(process.env.CLAUDE_JOB_DIR + '/tmp/rasters.json', 'utf8'));

// ---------- 度量 ----------
function bboxOf(bits, w, h) {
  let x1 = 1e9, y1 = 1e9, x2 = -1, y2 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
    if (bits[y * w + x]) { if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y; }
  return [x1, y1, x2, y2];
}
function comps(bits, w, h) {
  const lab = new Int32Array(w * h);
  const out = [];
  let id = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!bits[i] || lab[i]) continue;
    id++; const q = [[x, y]]; lab[i] = id;
    let n = 0, sx = 0, sy = 0, ax1 = 1e9, ay1 = 1e9, ax2 = -1, ay2 = -1;
    while (q.length) {
      const [cx2, cy2] = q.pop(); const ci = cy2 * w + cx2;
      n++; sx += cx2; sy += cy2;
      if (cx2 < ax1) ax1 = cx2; if (cx2 > ax2) ax2 = cx2; if (cy2 < ay1) ay1 = cy2; if (cy2 > ay2) ay2 = cy2;
      for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = cx2 + dx, ny = cy2 + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (bits[ni] && !lab[ni]) { lab[ni] = id; q.push([nx, ny]); }
      }
    }
    out.push({ id, n, bbox: [ax1, ay1, ax2, ay2] });
  }
  return out.sort((a, b) => b.n - a.n);
}
function rowRuns(bits, w, y, x1, x2) {
  const runs = []; let s = -1;
  for (let x = x1; x <= x2; x++) {
    const on = bits[y * w + x] === 1;
    if (on && s < 0) s = x;
    if (!on && s >= 0) { runs.push([s, x - 1]); s = -1; }
  }
  if (s >= 0) runs.push([s, x2]);
  return runs;
}
const fr = (v, a, b) => (v - a) / (b - a);

function measureYue(im) {
  const { w, h, bits } = im;
  const cs = comps(bits, w, h);
  const main = cs[0];
  const [X1, Y1, X2, Y2] = main.bbox;
  const W = X2 - X1 + 1, H = Y2 - Y1 + 1;
  // 腰部行：>=2 runs 且两外 run 间距 >=6
  const waist = [];
  for (let y = Y1; y <= Y2; y++) {
    const rs = rowRuns(bits, w, y, X1, X2).filter((r) => r[1] - r[0] >= 2);
    if (rs.length >= 2 && rs[rs.length - 1][0] - rs[0][1] >= 6 && rs[rs.length - 1][1] - rs[0][0] >= 24) {
      waist.push({ y, rs, back: rs[0], arm: rs[rs.length - 1], mid: rs.slice(1, -1) });
    }
  }
  const yA = waist[0].y, yB = waist[waist.length - 1].y;
  let T = 0, yT = 0, backMin = 1e9, armMax = -1;
  const midAll = [];
  for (const wst of waist) {
    const t = wst.arm[1] - wst.back[0] + 1;
    if (t > T) { T = t; yT = wst.y; }
    backMin = Math.min(backMin, wst.back[0]);
    armMax = Math.max(armMax, wst.arm[1]);
    for (const m of wst.mid) midAll.push([m[0], wst.y, m[1], wst.y]);
  }
  // 内笔：腰部中间 run + 独立小域（在主 bbox 内、非主域）
  let inner = null;
  const innerDomains = cs.slice(1).filter((c) => c.n >= 4 && c.bbox[0] >= X1 && c.bbox[2] <= X2 && c.bbox[1] >= Y1 && c.bbox[3] <= Y2);
  const boxes = [...midAll.map(([a, b2, c, d]) => [a, b2, c, d]), ...innerDomains.map((c) => c.bbox)];
  if (boxes.length) {
    const bx1 = Math.min(...boxes.map((b) => b[0])), by1 = Math.min(...boxes.map((b) => b[1]));
    const bx2 = Math.max(...boxes.map((b) => b[2])), by2 = Math.max(...boxes.map((b) => b[3]));
    const gapL = Math.max(...waist.map((q) => q.back[1])), gapR = Math.min(...waist.map((q) => q.arm[0]));
    inner = {
      box: [bx1, by1, bx2, by2], wpx: bx2 - bx1 + 1, hpx: by2 - by1 + 1,
      xFr: +fr((bx1 + bx2) / 2, X1, X2).toFixed(2), yFr: +fr((by1 + by2) / 2, Y1, Y2).toFixed(2),
      inGapXFrac: +fr((bx1 + bx2) / 2, gapL, gapR).toFixed(2),
      shape: (by2 - by1 + 1) > (bx2 - bx1 + 1) ? 'v' : 'h/p',
    };
  }
  // 端部
  const topCent = [], botCent = [];
  for (let y = Y1; y < yA; y++) { const rs = rowRuns(bits, w, y, X1, X2); if (rs.length) topCent.push((rs[0][0] + rs[rs.length - 1][1]) / 2); }
  for (let y = yB + 1; y <= Y2; y++) { const rs = rowRuns(bits, w, y, X1, X2); if (rs.length) botCent.push((rs[0][0] + rs[rs.length - 1][1]) / 2); }
  const topTip = +fr(topCent.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, topCent.length || 1), X1, X2).toFixed(2);
  const botTip = +fr(botCent.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, botCent.length || 1), X1, X2).toFixed(2);
  const waistLastCent = fr((waist[waist.length - 1].back[0] + waist[waist.length - 1].arm[1]) / 2, X1, X2);
  return {
    W, H, ratioWH: +(W / H).toFixed(2), fullnessTH: +(T / H).toFixed(2), yThickFr: +fr(yT, Y1, Y2).toFixed(2),
    backMostFr: +fr(backMin, X1, X2).toFixed(2), armMostFr: +fr(armMax, X1, X2).toFixed(2),
    gapXFrac: +fr((Math.max(...waist.map((q) => q.back[1])) + Math.min(...waist.map((q) => q.arm[0]))) / 2, X1, X2).toFixed(2),
    waistYRange: [+fr(yA, Y1, Y2).toFixed(2), +fr(yB, Y1, Y2).toFixed(2)],
    topTip, botTip, tailDx: +(botTip - waistLastCent).toFixed(2),
    inner,
  };
}

function measureRi(im) {
  const { w, h, bits } = im;
  const cs = comps(bits, w, h);
  const main = cs[0];
  const [X1, Y1, X2, Y2] = main.bbox;
  const W = X2 - X1 + 1, H = Y2 - Y1 + 1;
  // 中部行 run 分析（内横可能粘连在主域，也可能独立）
  const midBoxes = [];
  let rows3 = 0;
  for (let y = Math.round(Y1 + 0.35 * H); y <= Math.round(Y1 + 0.65 * H); y++) {
    const rs = rowRuns(bits, w, y, X1, X2).filter((r) => r[1] - r[0] >= 2);
    if (rs.length >= 3) { rows3++; const mids = rs.slice(1, -1); for (const m of mids) midBoxes.push([m[0], y, m[1], y]); }
  }
  const innerDomains = cs.slice(1).filter((c) => c.n >= 4 && c.bbox[0] > X1 && c.bbox[2] < X2 && c.bbox[1] > Y1 && c.bbox[3] < Y2);
  const boxes = [...midBoxes, ...innerDomains.map((c) => c.bbox)];
  let inner = null;
  if (boxes.length) {
    const bx1 = Math.min(...boxes.map((b) => b[0])), by1 = Math.min(...boxes.map((b) => b[1]));
    const bx2 = Math.max(...boxes.map((b) => b[2])), by2 = Math.max(...boxes.map((b) => b[3]));
    inner = { spanPx: bx2 - bx1 + 1, spanRatio: +((bx2 - bx1 + 1) / W).toFixed(2), yFr: +fr((by1 + by2) / 2, Y1, Y2).toFixed(2), xFr: +fr((bx1 + bx2) / 2, X1, X2).toFixed(2), hpx: by2 - by1 + 1 };
  }
  // 形状剖面：顶部 25% 行 span / 中部 30% 行 span（圆→0.6 上下，方→接近 1）
  const spans = [];
  for (let y = Y1; y <= Y2; y++) { const rs = rowRuns(bits, w, y, X1, X2); if (rs.length) spans.push([y, rs[rs.length - 1][1] - rs[0][0] + 1]); }
  const spanAt = (q) => { const ys = spans.filter(([y]) => Math.abs(fr(y, Y1, Y2) - q) <= 0.06); return ys.length ? ys.reduce((a, b) => a + b[1], 0) / ys.length : 0; };
  return { W, H, ratioWH: +(W / H).toFixed(2), profileTopMid: +(spanAt(0.12) / (spanAt(0.5) || 1)).toFixed(2), inner, extraDomains: cs.slice(1, 3).map((c) => c.n) };
}

function measureMu(im) {
  const { w, h, bits } = im;
  const [X1, Y1, X2, Y2] = bboxOf(bits, w, h);
  const W = X2 - X1 + 1, H = Y2 - Y1 + 1;
  const colSum = new Array(w).fill(0);
  for (let x = X1; x <= X2; x++) for (let y = Y1; y <= Y2; y++) if (bits[y * w + x]) colSum[x]++;
  let cx = X1; for (let x = X1; x <= X2; x++) if (colSum[x] > colSum[cx]) cx = x;
  // 主干顶底（|x-cx|<=5）
  let tTop = 1e9, tBot = -1;
  for (let y = Y1; y <= Y2; y++) for (let x = cx - 5; x <= cx + 5; x++) if (bits[y * w + x]) { tTop = Math.min(tTop, y); tBot = Math.max(tBot, y); }
  // 枝/根分界：侧墨空档
  const sideInk = [];
  for (let y = Y1; y <= Y2; y++) { let n = 0; for (let x = X1; x <= X2; x++) if (bits[y * w + x] && Math.abs(x - cx) > 9) n++; sideInk.push(n); }
  let bestGap = [Math.round(Y1 + 0.45 * H), 0];
  for (let a = Math.round(Y1 + 0.15 * H); a < Y1 + 0.8 * H; a++) {
    let b = a; while (b <= Y2 && sideInk[b - Y1] <= 2) b++;
    if (b - a > bestGap[1]) bestGap = [Math.round((a + b) / 2), b - a];
  }
  const ySplit = bestGap[0];
  const quads = { TL: [], TR: [], BL: [], BR: [] };
  for (let y = Y1; y <= Y2; y++) for (let x = X1; x <= X2; x++) {
    if (!bits[y * w + x] || Math.abs(x - cx) <= 9) continue;
    const up = y < ySplit, left = x < cx;
    quads[up ? (left ? 'TL' : 'TR') : left ? 'BL' : 'BR'].push([x, y]);
  }
  const fit = (pts) => {
    if (pts.length < 20) return { angle: null, n: pts.length };
    const n = pts.length;
    const mx = pts.reduce((a, p) => a + p[0], 0) / n, my = pts.reduce((a, p) => a + p[1], 0) / n;
    let sxx = 0, sxy = 0;
    for (const [x, y] of pts) { sxx += (x - mx) ** 2; sxy += (x - mx) * (y - my); }
    const k = sxy / (sxx || 1);
    // 最远端点（离叉点）
    const fork = [cx, ySplit];
    let far = pts[0], fd = 0;
    for (const p of pts) { const d = (p[0] - fork[0]) ** 2 + (p[1] - fork[1]) ** 2; if (d > fd) { fd = d; far = p; } }
    const endAngle = (Math.atan2(Math.abs(far[1] - ySplit), Math.abs(far[0] - cx)) * 180) / Math.PI;
    return { angle: +((Math.atan(Math.abs(k)) * 180) / Math.PI).toFixed(1), endAngle: +endAngle.toFixed(1), endFr: [+fr(far[0], X1, X2).toFixed(2), +fr(far[1], Y1, Y2).toFixed(2)], n };
  };
  const bY = (q) => { const ys = quads[q].map((p) => p[1]); return ys.length ? +fr(Math.min(...(q[0] === 'T' ? [Math.max(...ys)] : [Math.min(...ys)])), Y1, Y2).toFixed(2) : null; };
  return {
    W, H, ratioWH: +(W / H).toFixed(2), trunkXFrac: +fr(cx, X1, X2).toFixed(2),
    trunkTopOver: tTop - Y1, trunkBotOver: Y2 - tBot,
    forkYUp: bY('TL') != null ? Math.max(bY('TL'), bY('TR') ?? 0) : null, // 上侧墨最低点（枝叉）
    forkYDn: bY('BL') != null ? Math.min(bY('BL'), bY('BR') ?? 1) : null, // 下侧墨最高点（根叉）
    ySplitFr: +fr(ySplit, Y1, Y2).toFixed(2),
    TL: fit(quads.TL), TR: fit(quads.TR), BL: fit(quads.BL), BR: fit(quads.BR),
  };
}

const M = { yue: measureYue, ri: measureRi, mu: measureMu };
const out = {};
for (const g of ['yue', 'ri', 'mu']) {
  out[g] = {};
  for (const [f, im] of Object.entries(all[g])) out[g][f] = M[g](im);
  out[g]['CODE_ORACLE'] = M[g](codeBits[g]);
}
console.log(JSON.stringify(out, null, 1));
