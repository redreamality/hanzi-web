// 「一」从独木桥到楷书一横的字形变形。
// 只有一条笔画：先沿桥板的拱中线把桥「拓」进纸里（赭色沉成墨），
// 再把拱线逐点插值成楷书横——躺平、浮起，桥就变成了字。
// 楷书终点直接取自笔画数据的中线（y 换成 900-y），终形和笔顺动画严丝合缝。
import { svg, tween, lerp } from '../../util.js';

// 每个形态统一重采样成 K 个控制点，变形时逐点对应
const K = 24;
// 拓桥用的赭木色（与木桥一个颜色），最后沉成墨
const OCHRE = [150, 103, 60];
const INK = [34, 29, 26];

// 二次贝塞尔采样：桥的拱中线，与 scene.js 的桥板同一条线（拱顶 598，两端 650）
const quad = (p0, c, p1, n) =>
  Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const u = 1 - t;
    return [u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1]];
  });

export const BRIDGE = quad([150, 650], [512, 546], [890, 650], K);

// 笔画数据坐标（y 朝上）→ 屏幕坐标（y 朝下）
const pt = (m) => m.map(([x, y]) => [x, 900 - y]);

function pathLen(pts) {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return s;
}

// 按弧长均匀重采样成 n 个点（只为变形时点与点对应，与描红判定无关）
function resample(pts, n) {
  const total = pathLen(pts);
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

export function createMorph(layer, data) {
  // 楷书形态：一笔「横」的中线
  const KAISHU = resample(pt(data.medians[0]), K);

  const root = svg('g', { class: 'morph', 'data-testid': 'morph', opacity: 0 }, layer);
  const path = svg('path', {
    fill: 'none',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    pathLength: 1,
  }, root);

  const dOf = (pts) => 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L');
  const render = (pts, ink, w) => {
    path.setAttribute('d', dOf(pts));
    path.setAttribute('stroke', `rgb(${ink[0] | 0},${ink[1] | 0},${ink[2] | 0})`);
    path.setAttribute('stroke-width', w.toFixed(1));
  };

  let form = BRIDGE;

  return {
    root,
    // 木桥退场：赭色沿拱线从左拓到右，颜色慢慢沉成墨——像把桥拓进纸里
    async printFromBridge(check) {
      root.setAttribute('opacity', 1);
      render(BRIDGE, OCHRE, 58);
      path.setAttribute('stroke-dasharray', '1 1');
      path.setAttribute('stroke-dashoffset', '1');
      await tween(900, (t) => path.setAttribute('stroke-dashoffset', String(1 - t)), { check });
      await tween(600, (t) => render(BRIDGE, OCHRE.map((v, i) => lerp(v, INK[i], t)), 58), { check });
      path.removeAttribute('stroke-dasharray');
      path.removeAttribute('stroke-dashoffset');
    },
    // 桥躺平、浮上来，变成楷书的一横：点与点插值，笔宽 58 → 84
    async toKaishu(ms, check) {
      const from = form;
      await tween(
        ms,
        (t) => {
          const pts = from.map((q, i) => [lerp(q[0], KAISHU[i][0], t), lerp(q[1], KAISHU[i][1], t)]);
          render(pts, INK, lerp(58, 84, t));
        },
        { check },
      );
      form = KAISHU;
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity') ?? 1);
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },
    reset() {
      form = BRIDGE;
      root.setAttribute('opacity', 0);
      path.removeAttribute('stroke-dasharray');
      path.removeAttribute('stroke-dashoffset');
      render(BRIDGE, INK, 58);
    },
  };
}
