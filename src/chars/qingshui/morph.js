// 「清」的组字与定形：左边三点水，右边一个青。
// 「青」一课的青黛色先把右边的青一笔笔写出来（远山的颜色），三颗小水滴再从溪里
// 飞上来落成三点水：水加青，就是清（《说文》：「清，朖也。澂水之皃。从水青声」，青表音）。
// 组字时三点水稍稍收短、偏左；定形成楷书时滑正、拉长，水色和青黛一起沉成墨。
// 楷书骨架直接取笔画数据的中线（y 换成 900 - y），最后一步和真正的笔顺严丝合缝。
import { svg, tween, wait, lerp } from '../../util.js';

const N = 24; // 每条骨架重采样成同样的点数，插值时一一对应

// ---- 采样工具（各字各留一份，共享文件不能动） ----
function pathLen(pts) {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return s;
}
function resample(pts, n) {
  const total = pathLen(pts);
  if (pts.length < 2 || total === 0) return Array.from({ length: n }, () => [...pts[0]]);
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
const dOf = (pts) => pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');

// 笔画数据 y 朝上，屏幕 y 朝下
const flip = (m) => m.map(([x, y]) => [x, 900 - y]);
// 组字时三点水收短、整体偏左一点，定形时再滑正
const shrink = (pts, s, dx, dy) => {
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length;
  const cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
  return pts.map(([x, y]) => [cx + (x - cx) * s + dx, cy + (y - cy) * s + dy]);
};

const INK = [34, 29, 26];
const AZURE = [47, 110, 94]; // 青黛——和「青」一课同一支颜料
const WATERC = [58, 110, 138]; // 溪水的蓝

export function createMorph(layer, data) {
  const K = data.medians.map(flip);
  const ZU = [shrink(K[0], 0.62, -16, 4), shrink(K[1], 0.62, -16, 4), shrink(K[2], 0.88, -16, 0), ...K.slice(3)];

  const FORMS = {
    zu: {
      pts: ZU.map((p) => resample(p, N)),
      widths: [80, 76, 42, 78, 74, 76, 80, 55, 70, 44, 44],
      colors: { shui: WATERC, qing: AZURE },
    },
    kaishu: {
      pts: K.map((p) => resample(p, N)),
      widths: [64, 60, 50, 78, 74, 76, 80, 55, 70, 44, 44],
      colors: { shui: INK, qing: INK },
    },
  };

  const root = svg('g', { class: 'morph', 'data-testid': 'morph', opacity: 0 }, layer);
  const paths = data.medians.map(() =>
    svg('path', { fill: 'none', stroke: 'black', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', pathLength: 1 }, root),
  );
  const comp = (i) => (i < 3 ? 'shui' : 'qing');
  const rgb = (c) => `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`;

  function render(f) {
    f.pts.forEach((pts, i) => {
      paths[i].setAttribute('d', dOf(pts));
      paths[i].setAttribute('stroke', rgb(f.colors[comp(i)]));
      paths[i].setAttribute('stroke-width', f.widths[i].toFixed(1));
    });
  }

  const setDraw = (i, t) => {
    paths[i].setAttribute('stroke-dasharray', '1 1');
    paths[i].setAttribute('stroke-dashoffset', String(1 - t));
  };

  function mixForm(a, b, t) {
    const mixc = (x, y) => x.map((v, j) => lerp(v, y[j], t));
    return {
      pts: a.pts.map((p, i) => p.map((q, j) => [lerp(q[0], b.pts[i][j][0], t), lerp(q[1], b.pts[i][j][1], t)])),
      widths: a.widths.map((w, i) => lerp(w, b.widths[i], t)),
      colors: { shui: mixc(a.colors.shui, b.colors.shui), qing: mixc(a.colors.qing, b.colors.qing) },
    };
  }

  let current = FORMS.zu;

  // 记下骨架外框，供测试核对楷书和真正的笔画对齐
  const noteBox = () => {
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const pts of current.pts)
      for (const [x, y] of pts) {
        x1 = Math.min(x1, x); y1 = Math.min(y1, y);
        x2 = Math.max(x2, x); y2 = Math.max(y2, y);
      }
    root.dataset.kaishuBox = `${((x1 + x2) / 2).toFixed(1)},${((y1 + y2) / 2).toFixed(1)},${(x2 - x1).toFixed(1)},${(y2 - y1).toFixed(1)}`;
  };

  return {
    root,
    // 组字时水滴的落点（第 i 点的中心）和第三笔要向上滑过的路线
    markMid: (i) => {
      const p = FORMS.zu.pts[i];
      return [(p[0][0] + p[p.length - 1][0]) / 2, (p[0][1] + p[p.length - 1][1]) / 2];
    },
    streakPath: () => FORMS.zu.pts[2].map((p) => [...p]),
    // 青黛色把右边的青一笔一笔写出来（第四笔起，到最后一笔）
    async drawQingPart(check) {
      root.setAttribute('opacity', 1);
      render(FORMS.zu);
      for (let i = 0; i < paths.length; i++) setDraw(i, 0);
      for (let i = 3; i < paths.length; i++) {
        await tween(300, (t) => setDraw(i, t), { check });
        await wait(70, check);
      }
    },
    async drawShuiStroke(i, ms, check) {
      await tween(ms, (t) => setDraw(i, t), { check });
    },
    // 定形：三点水滑正拉长，水色青黛一起沉成墨
    async to(name, ms, check) {
      const from = current;
      await tween(ms, (t) => render(mixForm(from, FORMS[name], t)), { check });
      current = FORMS[name];
      if (name === 'kaishu') noteBox();
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity') ?? 1);
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },
    reset() {
      root.setAttribute('opacity', 0);
      for (const p of paths) {
        p.removeAttribute('stroke-dasharray');
        p.removeAttribute('stroke-dashoffset');
      }
      current = FORMS.zu;
      render(FORMS.zu);
    },
  };
}
