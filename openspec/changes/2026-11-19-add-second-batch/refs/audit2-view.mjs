// 读 rasters2.json，输出指定字（拓片件 + CODE）的 ASCII 剪影与连通域概览。
import { readFileSync } from 'node:fs';

const J = process.env.CLAUDE_JOB_DIR + '/tmp/rasters2.json';
const all = JSON.parse(readFileSync(J, 'utf8'));
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
const W = 44;
for (const g of ids) {
  const group = g === 'CODE' ? null : g;
  const entries = group ? Object.entries(all[group]) : Object.entries(all.CODE);
  console.log('======== ' + g + ' ========');
  for (const [f, im] of entries) {
    const { w, h, bits } = im;
    const [x1, y1, x2, y2] = bboxOf(bits, w, h);
    if (x2 < 0) { console.log(`\n--- ${f}: EMPTY`); continue; }
    console.log(`\n--- ${f}  bbox W=${x2 - x1 + 1} H=${y2 - y1 + 1} W/H=${((x2 - x1 + 1) / (y2 - y1 + 1)).toFixed(2)}`);
    const cs = comps(bits, w, h);
    console.log('comps: ' + cs.slice(0, 7).map((c) => `#${c.id} n=${c.n} c=(${c.cx.toFixed(0)},${c.cy.toFixed(0)}) bb=[${c.bbox}]`).join(' | ') + (cs.length > 7 ? ` (+${cs.length - 7})` : ''));
    const bw = x2 - x1 + 1, bh = y2 - y1 + 1;
    const cols = W, rows = Math.max(1, Math.round((cols * bh) / bw * 0.5));
    let art = '';
    for (let r = 0; r < rows; r++) {
      let line = '';
      for (let c = 0; c < cols; c++) {
        const xa = x1 + Math.floor((c * bw) / cols), xb = x1 + Math.floor(((c + 1) * bw) / cols) - 1;
        const ya = y1 + Math.floor((r * bh) / rows), yb = y1 + Math.floor(((r + 1) * bh) / rows) - 1;
        let m = 0;
        for (let y = ya; y <= Math.max(ya, yb); y++) for (let x = xa; x <= Math.max(xa, xb); x++) if (bits[y * w + x]) m = 1;
        line += m ? '#' : '.';
      }
      art += line + '\n';
    }
    console.log(art);
  }
}
