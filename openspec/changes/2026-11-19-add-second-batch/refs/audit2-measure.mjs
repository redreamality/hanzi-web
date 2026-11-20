// 第二阶段度量：11 字拓片 + CODE，输出紧凑判定数字。
// 通用：bbox、连通域布局。族派生：双构件相对位置/高差、三构件品字/横排、心廓内点、火域分解、单人朝向。
import { readFileSync } from 'node:fs';

const all = JSON.parse(readFileSync(process.env.CLAUDE_JOB_DIR + '/tmp/rasters2.json', 'utf8'));
const ids = process.argv.slice(2);

function bboxOf(bits, w, h) {
  let x1 = 1e9, y1 = 1e9, x2 = -1, y2 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++)
    if (bits[y * w + x]) { if (x < x1) x1 = x; if (x > x2) x2 = x; if (y < y1) y1 = y; if (y > y2) y2 = y; }
  return [x1, y1, x2, y2];
}
function comps(bits, w, h) {
  const lab = new Int32Array(w * h);
  const out = []; let id = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x;
    if (!bits[i] || lab[i]) continue;
    id++; const q = [[x, y]]; lab[i] = id;
    let n = 0, sx = 0, sy = 0, ax1 = 1e9, ay1 = 1e9, ax2 = -1, ay2 = -1;
    while (q.length) {
      const [cx, cy] = q.pop(); const ci = cy * w + cx;
      n++; sx += cx; sy += cy;
      if (cx < ax1) ax1 = cx; if (cx > ax2) ax2 = cx; if (cy < ay1) ay1 = cy; if (cy > ay2) ay2 = cy;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const ni = ny * w + nx;
        if (bits[ni] && !lab[ni]) { lab[ni] = id; q.push([nx, ny]); }
      }
    }
    out.push({ id, n, cx: sx / n, cy: sy / n, bbox: [ax1, ay1, ax2, ay2] });
  }
  return out.sort((a, b) => b.n - a.n);
}
// 区域内顶部墨中心 x（判头位置/朝向）
function headX(bits, w, bb, frac = 0.18) {
  const [x1, y1, x2, y2] = bb;
  const yEnd = y1 + Math.round((y2 - y1) * frac);
  let sx = 0, n = 0;
  for (let y = y1; y <= yEnd; y++) for (let x = x1; x <= x2; x++) if (bits[y * w + x]) { sx += x; n++; }
  return n ? ((sx / n - x1) / (x2 - x1)) : null;
}
function measure(im, kind) {
  const { w, h, bits } = im;
  const [X1, Y1, X2, Y2] = bboxOf(bits, w, h);
  if (X2 < 0) return { empty: true };
  const W = X2 - X1 + 1, H = Y2 - Y1 + 1;
  const cs = comps(bits, w, h).filter((c) => c.n >= 8);
  const r = { WH: +(W / H).toFixed(2), domains: cs.length };
  const f = (c) => ({
    n: c.n, bb: c.bbox.map((v, i) => (i % 2 ? +(v - Y1).toFixed(0) : +(v - X1).toFixed(0))),
    cx: +((c.cx - X1) / W).toFixed(2), cy: +((c.cy - Y1) / H).toFixed(2),
    wh: +((c.bbox[2] - c.bbox[0] + 1) / (c.bbox[3] - c.bbox[1] + 1)).toFixed(2),
    headX: headX(bits, w, c.bbox),
  });
  r.top = cs.slice(0, 4).map(f);
  if (kind === 'ren' || kind === 'da') r.headAll = headX(bits, w, [X1, Y1, X2, Y2]);
  if (cs.length >= 2) {
    const a = cs[0], b = cs[1];
    r.pair = {
      dCx: +((b.cx - a.cx) / W).toFixed(2),
      dTop: +((b.bbox[1] - a.bbox[1]) / H).toFixed(2),
      hRatio: +((a.bbox[3] - a.bbox[1]) / (b.bbox[3] - b.bbox[1])).toFixed(2),
      gap: +((b.bbox[0] - a.bbox[2]) / W).toFixed(2),
    };
  }
  if (cs.length >= 3) {
    const byTop = [...cs.slice(0, 3)].sort((p, q) => p.bbox[1] - q.bbox[1]);
    const [t1, t2, t3] = byTop;
    r.trio = {
      tops: byTop.map((c) => +((c.bbox[1] - Y1) / H).toFixed(2)),
      cxSorted: byTop.map((c) => +((c.cx - X1) / W).toFixed(2)),
      raised: +(Math.min(t2.bbox[1] - t1.bbox[1], t3.bbox[1] - t1.bbox[1]) / H).toFixed(2), // 最上木比其余两木高多少
    };
  }
  return r;
}

for (const g of ids) {
  const isCode = g === 'CODE';
  console.log('======== ' + g + ' ========');
  if (isCode) {
    for (const [id, im] of Object.entries(all.CODE)) {
      if (id === '__XML') continue;
      console.log(id + ' ' + JSON.stringify(measure(im, id)));
    }
  } else {
    for (const [f, im] of Object.entries(all[g])) console.log(f.replace(/\.(svg|jiaguwen_42_|swxz_|xiaozhuan_27_)/g, '') + ' ' + JSON.stringify(measure(im, g)));
  }
}
