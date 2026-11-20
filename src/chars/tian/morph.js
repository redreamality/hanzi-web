// 「天」从仰头看天到楷书的组字变形。
// 重头戏是大加一横：整个字拆成四条骨架——顶横（落下的那一横）、大（横、撇、捺三笔）。
// 「大」的三笔先用赭石一笔一笔写出来（人形族的起笔色），一横再带着天青色从高天落下、
// 停在头顶，颜色一起沉成墨。楷书的骨架直接取笔画数据的中线，组字形与楷书形几何一致，
// 所以最后一步只是笔宽变粗、颜色纯墨——切到笔顺动画严丝合缝。
import { svg, tween, lerp } from '../../util.js';

const N = 36; // 每条骨架重采样到同样多的点
const PARTS = ['bar', 'heng', 'pie', 'na']; // bar 是头顶那一横，其余三笔是「大」

const INK = { bar: [34, 29, 26], heng: [34, 29, 26], pie: [34, 29, 26], na: [34, 29, 26] };
// 组字起笔的颜料：「大」用人形族的赭石（与「人」「休」同系），落下的横用天青
const PIGMENT = { bar: [95, 127, 150], heng: [126, 84, 50], pie: [126, 84, 50], na: [126, 84, 50] };

const WIDTHS = {
  zu: { bar: 32, heng: 34, pie: 32, na: 32 },
  kaishu: { bar: 44, heng: 44, pie: 42, na: 42 },
};

// ---- 采样工具（与 ming/morph.js 同款；共享文件不能动，这里留一份） ----
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
const dOf = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');

// 笔画数据坐标（y 朝上）→ 屏幕坐标（y 朝下）：medians[0] 顶横，[1..3] 是「大」
const kaishuForm = (medians) => ({
  bar: resample(medians[0].map(([x, y]) => [x, 900 - y]), N),
  heng: resample(medians[1].map(([x, y]) => [x, 900 - y]), N),
  pie: resample(medians[2].map(([x, y]) => [x, 900 - y]), N),
  na: resample(medians[3].map(([x, y]) => [x, 900 - y]), N),
});

// 组字形与楷书形几何一致，颜色数组逐点插值、笔宽数值各自插值
function mixColor(a, b, t) {
  const out = {};
  for (const k of PARTS) out[k] = a[k].map((v, i) => lerp(v, b[k][i], t));
  return out;
}
function mixWidth(a, b, t) {
  const out = {};
  for (const k of PARTS) out[k] = lerp(a[k], b[k], t);
  return out;
}

export function createMorph(layer, data) {
  const GEO = kaishuForm(data.medians);
  const root = svg('g', { class: 'morph', 'data-testid': 'morph', opacity: 0 }, layer);

  const lines = {};
  const dropG = svg('g', {}, root); // 落下的那一横单独成组，好做下落
  for (const k of PARTS) {
    lines[k] = svg('path', {
      fill: 'none',
      stroke: 'black',
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round',
      pathLength: 1,
    }, k === 'bar' ? dropG : root);
  }

  const styleOf = (kind, colors) => ({
    width: WIDTHS[kind],
    color: Object.fromEntries(PARTS.map((k) => [k, colors[k]])),
  });

  const render = (geo, style) => {
    for (const k of PARTS) {
      lines[k].setAttribute('d', dOf(geo[k]));
      const c = style.color[k];
      lines[k].setAttribute('stroke', `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`);
      lines[k].setAttribute('stroke-width', style.width[k].toFixed(1));
    }
  };

  // 记下骨架外框（空 path 不进联合外框），供测试核对楷书和真正的笔画对齐
  const noteBox = () => {
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const k of PARTS) {
      if (pathLen(GEO[k]) <= 3) continue;
      for (const [x, y] of GEO[k]) {
        x1 = Math.min(x1, x); y1 = Math.min(y1, y);
        x2 = Math.max(x2, x); y2 = Math.max(y2, y);
      }
    }
    root.dataset.kaishuBox = `${((x1 + x2) / 2).toFixed(1)},${((y1 + y2) / 2).toFixed(1)},${(x2 - x1).toFixed(1)},${(y2 - y1).toFixed(1)}`;
  };

  const setDraw = (p, t) => {
    p.setAttribute('stroke-dasharray', '1 1');
    p.setAttribute('stroke-dashoffset', String(1 - t));
  };
  const unDraw = (p) => {
    p.removeAttribute('stroke-dasharray');
    p.removeAttribute('stroke-dashoffset');
  };

  let kind = 'zu';

  return {
    root,
    // 「大」先来：赭石色把横、撇、捺一笔一笔写出来——就是一个张开手臂的人
    async drawDa(check) {
      kind = 'zu';
      root.setAttribute('opacity', 1);
      dropG.setAttribute('transform', 'translate(0 0)');
      render(GEO, styleOf('zu', PIGMENT));
      lines.bar.setAttribute('d', ''); // 那一横还没落下来，先不画
      ['heng', 'pie', 'na'].forEach((k) => setDraw(lines[k], 0));
      await tween(700, (t) => setDraw(lines.heng, t), { check });
      await tween(900, (t) => setDraw(lines.pie, t), { check });
      await tween(900, (t) => setDraw(lines.na, t), { check });
      ['heng', 'pie', 'na'].forEach((k) => unDraw(lines[k]));
    },
    // 一横从高天落下：带着天青色徐徐降下，墩在大头顶上，荡开一圈淡淡的青云
    async dropBar(check) {
      const cy = GEO.bar[Math.floor(N / 2)][1];
      const halo = svg('ellipse', {
        cx: (GEO.bar[0][0] + GEO.bar[N - 1][0]) / 2, cy, rx: 40, ry: 18,
        fill: 'none', stroke: '#7d97a8', 'stroke-width': 14, opacity: 0,
        'stroke-linecap': 'round',
      }, root);
      dropG.setAttribute('transform', 'translate(0 -300)');
      lines.bar.setAttribute('opacity', '0');
      lines.bar.setAttribute('d', dOf(GEO.bar));
      await tween(
        1500,
        (t) => {
          dropG.setAttribute('transform', `translate(0 ${(-300 * (1 - t)).toFixed(1)})`);
          lines.bar.setAttribute('opacity', String(Math.min(1, t * 2.5)));
        },
        { easing: (t) => 1 - (1 - t) ** 2.6, check },
      );
      dropG.setAttribute('transform', 'translate(0 0)');
      lines.bar.setAttribute('opacity', 1);
      await tween(
        900,
        (t) => {
          halo.setAttribute('rx', lerp(40, 330, t).toFixed(1));
          halo.setAttribute('ry', lerp(18, 80, t).toFixed(1));
          halo.setAttribute('opacity', (0.5 * (1 - t)).toFixed(3));
        },
        { check },
      );
      halo.remove();
    },
    // 天青和赭石一起慢慢沉成墨
    async settle(check) {
      const cFrom = styleOf('zu', PIGMENT).color;
      const cTo = styleOf('zu', INK).color;
      await tween(1300, (t) => render(GEO, { width: WIDTHS.zu, color: mixColor(cFrom, cTo, t) }), { check });
    },
    // 楷书：几何不动，笔宽加粗、颜色纯墨——要看清笔画了
    async to(name, ms, check) {
      const wFrom = WIDTHS[kind];
      const wTo = WIDTHS[name];
      await tween(ms, (t) => render(GEO, { width: mixWidth(wFrom, wTo, t), color: INK }), { check });
      if (name === 'kaishu') noteBox();
      kind = name;
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity') ?? 1);
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },
    reset() {
      kind = 'zu';
      root.setAttribute('opacity', 0);
      for (const k of PARTS) {
        unDraw(lines[k]);
        lines[k].setAttribute('opacity', 1);
      }
      dropG.setAttribute('transform', 'translate(0 0)');
      render(GEO, styleOf('zu', INK));
    },
  };
}
