// 变宽度笔触：把「中心线锚点 + 宽度锚点」渲染成一条毛笔笔画。
// 技法与 ren/xiu 的 ribbon.js 同源，独立精简一份避免跨字耦合（本课人形不变形，无需插值）。
import { lerp } from '../../util.js';

const N = 40; // 中心线采样点数
const SEG = 12; // Catmull-Rom 每段细采样数

function crPoint(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return [
    0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
    0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
  ];
}

// 锚点 → 平滑中心线 → 等弧长重采样成 N 点
export function sampleCenterline(anchors) {
  const a = [anchors[0], ...anchors, anchors[anchors.length - 1]];
  const dense = [];
  for (let i = 1; i < a.length - 2; i++) {
    for (let k = 0; k < SEG; k++) dense.push(crPoint(a[i - 1], a[i], a[i + 1], a[i + 2], k / SEG));
  }
  dense.push([...anchors[anchors.length - 1]]);
  const acc = [0];
  for (let i = 1; i < dense.length; i++) {
    acc.push(acc[i - 1] + Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]));
  }
  const total = acc[acc.length - 1];
  const out = [];
  let j = 0;
  for (let n = 0; n < N; n++) {
    const target = (total * n) / (N - 1);
    while (j < acc.length - 2 && acc[j + 1] < target) j++;
    const t = (target - acc[j]) / (acc[j + 1] - acc[j] || 1);
    out.push([lerp(dense[j][0], dense[j + 1][0], t), lerp(dense[j][1], dense[j + 1][1], t)]);
  }
  return out;
}

// 宽度锚点 [[弧长0..1, 宽], ...] → 每个采样点的宽度，轻平滑去掉折角
export function sampleWidths(wAnchors) {
  const raw = [];
  for (let n = 0; n < N; n++) {
    const s = n / (N - 1);
    let i = 0;
    while (i < wAnchors.length - 2 && wAnchors[i + 1][0] < s) i++;
    const [s0, w0] = wAnchors[i];
    const [s1, w1] = wAnchors[i + 1];
    raw.push(lerp(w0, w1, (s - s0) / (s1 - s0 || 1)));
  }
  return raw.map((w, i) => {
    const a = raw[Math.max(0, i - 1)];
    const b = raw[Math.min(N - 1, i + 1)];
    return w * 0.5 + (a + b) * 0.25;
  });
}

export function makeStroke(def) {
  return { pts: sampleCenterline(def.a), ws: sampleWidths(def.w) };
}

// 笔画 → 多边形 path。reveal 是已画出的比例（0..1），用于一笔一笔「写」出来
export function strokePath(stroke, reveal = 1) {
  const count = Math.max(2, Math.ceil(N * reveal));
  const pts = stroke.pts.slice(0, count);
  const ws = stroke.ws.slice(0, count);
  ws[ws.length - 1] *= Math.max(0, N * reveal - (count - 1)); // 笔锋走到哪儿，宽度就长到哪儿
  const left = [];
  const right = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / l;
    const ny = (b[0] - a[0]) / l;
    const h = ws[i] / 2;
    left.push([pts[i][0] + nx * h, pts[i][1] + ny * h]);
    right.push([pts[i][0] - nx * h, pts[i][1] - ny * h]);
  }
  // 起笔收笔加圆头：以端点为圆心、笔画半宽为半径的半圆，让笔锋钝钝地起和收
  const cap = (c, from, dir) => {
    const h = Math.hypot(from[0] - c[0], from[1] - c[1]) || 1;
    const n = [(from[0] - c[0]) / h, (from[1] - c[1]) / h];
    const out = [];
    for (let k = 1; k < 6; k++) {
      const ang = (Math.PI * k) / 6;
      out.push([
        c[0] + h * (Math.cos(ang) * n[0] + Math.sin(ang) * dir[0]),
        c[1] + h * (Math.cos(ang) * n[1] + Math.sin(ang) * dir[1]),
      ]);
    }
    return out;
  };
  const unit = (a, b) => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    return [(b[0] - a[0]) / l, (b[1] - a[1]) / l];
  };
  const endCap = cap(pts[pts.length - 1], left[left.length - 1], unit(pts[pts.length - 2], pts[pts.length - 1]));
  const startCap = cap(pts[0], right[0], unit(pts[1], pts[0]));
  return [
    `M${left[0][0].toFixed(1)} ${left[0][1].toFixed(1)}`,
    ...left.slice(1).map((p) => `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`),
    ...endCap.map((p) => `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`),
    ...[...right].reverse().map((p) => `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`),
    ...startCap.map((p) => `L${p[0].toFixed(1)} ${p[1].toFixed(1)}`),
    'Z',
  ].join('');
}
