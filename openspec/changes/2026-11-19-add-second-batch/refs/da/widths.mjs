// 量 da.strokes.json 每笔沿中线的近似宽度（沿中线采样，找轮廓点到中线段的最近距离×2）。
import { readFileSync } from 'node:fs';

const { strokes, medians } = JSON.parse(readFileSync(process.argv[2] || 'data/chars/da.strokes.json', 'utf8'));

// 把 path d 里的所有数字配成坐标点（Q/C 控制点也被当轮廓点，近似）
const outlinePts = (d) => {
  const v = [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
  const pts = [];
  for (let i = 0; i + 1 < v.length; i += 2) pts.push([v[i], v[i + 1]]);
  return pts;
};

const closest = (p, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return [a[0] + t * dx, a[1] + t * dy];
};

strokes.forEach((d, i) => {
  const outline = outlinePts(d);
  const m = medians[i];
  // 对中线的每个采样点，取轮廓所有点到「该段中线」的最近距离的最大值×2 ≈ 宽度
  const res = m.map((p, k) => {
    const a = m[Math.max(0, k - 1)];
    const b = m[Math.min(m.length - 1, k + 1)];
    let far = 0;
    for (const q of outline) {
      const c = closest(q, a, b);
      far = Math.max(far, Math.hypot(q[0] - c[0], q[1] - c[1]));
    }
    return [+(k / (m.length - 1)).toFixed(2), Math.round(far * 2)];
  });
  console.log(`笔画${i}:`, JSON.stringify(res));
});
