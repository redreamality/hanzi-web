// 楷书笔画：笔顺动画、描红底稿、田字格、手指描写判定。
// 笔画数据来自 hanzi-writer-data（Make Me a Hanzi），坐标系 1024 见方、y 轴朝上，
// 显示时统一套 translate(0,900) scale(1,-1)。
import { svg, tween, lerp } from './util.js';

const FLIP = 'translate(0 900) scale(1 -1)';
const BRUSH = 210; // 动画笔刷宽度，超出部分被笔画轮廓裁掉
let clipSeq = 0;

const medianD = (m) => m.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('');

export function createKaishu(layer, data) {
  const root = svg('g', { transform: FLIP, 'data-testid': 'kaishu' }, layer);
  const defs = svg('defs', {}, root);
  const strokes = data.strokes.map((outline, i) => {
    const id = `clip-${data.id}-${clipSeq++}`;
    svg('path', { d: outline }, svg('clipPath', { id }, defs));
    const g = svg('g', { 'clip-path': `url(#${id})` }, root);
    const brush = svg('path', {
      d: medianD(data.medians[i]),
      fill: 'none',
      stroke: '#221d1a',
      'stroke-width': BRUSH,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      pathLength: 1,
      'stroke-dasharray': '1 1',
      'stroke-dashoffset': 1,
    }, g);
    return { brush, len: pathLen(data.medians[i]) };
  });

  const set = (i, t) => strokes[i].brush.setAttribute('stroke-dashoffset', String(1 - t));

  return {
    root,
    count: strokes.length,
    // 按笔顺一笔一笔写出来；时长随笔画长短变化，像真的在运笔
    async write(check, { pause = 260, speed = 1 } = {}) {
      for (let i = 0; i < strokes.length; i++) {
        await tween((300 + strokes[i].len * 1.1) / speed, (t) => set(i, t), { check });
        await tween(pause, () => {}, { check });
      }
    },
    async writeStroke(i, ms = 380) {
      await tween(ms, (t) => set(i, t));
    },
    clear() {
      strokes.forEach((_, i) => set(i, 0));
    },
    full() {
      strokes.forEach((_, i) => set(i, 1));
    },
  };
}

// 描红本：朱红色的田字格，加上淡红的字
export function createGhost(gridLayer, ghostLayer, data) {
  const grid = svg('g', { 'data-testid': 'grid', stroke: '#c0392b', fill: 'none', opacity: 0 }, gridLayer);
  svg('rect', { x: 132, y: 130, width: 760, height: 760, 'stroke-width': 5, opacity: 0.7 }, grid);
  for (const d of ['M512 130V890', 'M132 510H892']) {
    svg('path', { d, 'stroke-width': 3, 'stroke-dasharray': '18 14', opacity: 0.45 }, grid);
  }
  const ghost = svg('g', { transform: FLIP, opacity: 0, 'data-testid': 'ghost' }, ghostLayer);
  data.strokes.forEach((d) => svg('path', { d, fill: '#e3a092', opacity: 0.55 }, ghost));

  const fade = (to, ms) =>
    tween(ms, (t) => {
      for (const el of [grid, ghost]) el.setAttribute('opacity', lerp(Number(el.getAttribute('opacity')), to, t));
    });
  return { show: (ms = 800) => fade(1, ms), hide: (ms = 500) => fade(0, ms) };
}

// ---- 描写判定 ----

function pathLen(pts) {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return s;
}

function resample(pts, n) {
  const total = pathLen(pts);
  if (pts.length < 2 || total === 0) return Array(n).fill(pts[0]);
  const out = [];
  let seg = 0;
  let acc = 0;
  for (let k = 0; k < n; k++) {
    const target = (total * k) / (n - 1);
    while (seg < pts.length - 2) {
      const l = Math.hypot(pts[seg + 1][0] - pts[seg][0], pts[seg + 1][1] - pts[seg][1]);
      if (acc + l >= target) break;
      acc += l;
      seg++;
    }
    const [a, b] = [pts[seg], pts[seg + 1]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const t = Math.min(1, Math.max(0, (target - acc) / l));
    out.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t)]);
  }
  return out;
}

function distToPolyline(p, pts) {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const [a, b] = [pts[i - 1], pts[i]];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy));
  }
  return best;
}

const mean = (xs) => xs.reduce((s, x) => s + x, 0) / xs.length;

// 判断孩子写的一笔（数据坐标）是否对得上这一笔的中线。
// 给 3 岁孩子用，标准放得很宽：起点、终点大致对，整体沿着笔画走，方向别反就行。
export function judgeStroke(user, median) {
  if (user.length < 2) return { ok: false, reason: 'tap' };
  const mLen = pathLen(median);
  const uLen = pathLen(user);
  if (uLen < Math.max(60, mLen * 0.4)) return { ok: false, reason: 'short' };
  const u = resample(user, 24);
  const m = resample(median, 24);
  const startD = Math.hypot(u[0][0] - m[0][0], u[0][1] - m[0][1]);
  const endD = Math.hypot(u[23][0] - m[23][0], u[23][1] - m[23][1]);
  if (startD > 210 || endD > 210) return { ok: false, reason: 'direction' };
  // 短笔画（如「氵」的点）起终点挨得近，端点距离分辨不出倒写：
  // 补判路径弦向量的夹角——只在孩子的路径确实有推进（弦长过半）时才判，
  // 来回涂鸦弦长很短，方向无从谈起，保持宽容。
  const cu = [u[23][0] - u[0][0], u[23][1] - u[0][1]];
  const cm = [m[23][0] - m[0][0], m[23][1] - m[0][1]];
  const cuLen = Math.hypot(cu[0], cu[1]);
  const cmLen = Math.hypot(cm[0], cm[1]);
  if (cmLen > 0 && cuLen > cmLen * 0.5 && cu[0] * cm[0] + cu[1] * cm[1] < -0.25 * cuLen * cmLen) {
    return { ok: false, reason: 'direction' };
  }
  if (mean(u.map((p) => distToPolyline(p, median))) > 110) return { ok: false, reason: 'off' };
  if (mean(m.map((p) => distToPolyline(p, user))) > 130) return { ok: false, reason: 'partial' };
  return { ok: true };
}
