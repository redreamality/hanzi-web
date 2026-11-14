// 「月」从月牙到楷书的字形变形。
// 字形拆成四条骨架：背（月牙外弧→撇）、怀抱（内弧→横折钩）、
// 还有里面的短笔（一短竖→两条短横）。只要对骨架逐点插值，月亮就能连续地变成字。
// 楷书的骨架直接取笔画数据的中线，所以变形的最后一步和真正的笔顺严丝合缝。
import { svg, tween, lerp } from '../../util.js';
import { CENTER, crescentEdges } from './moon.js';

const N = 40; // 每条骨架都重采样到同样多的点，插值时一一对应
const INK = { r: 34, g: 29, b: 26 };
const MOONGOLD = { r: 204, g: 172, b: 100 }; // 起笔描月牙时的月光色

// ---- 采样工具（strokes.js 里的同款，这里不能动共享文件） ----
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

// 甲骨文：刀刻的竖长弯月，开口朝右，中间一短笔是月亮的影子
const ORACLE = {
  left: [[574, 225], [455, 265], [355, 360], [322, 480], [330, 600], [380, 705], [472, 772], [560, 785]],
  right: [[574, 225], [478, 300], [438, 420], [440, 540], [468, 650], [520, 725], [560, 785]],
  inner1: [[452, 450], [455, 575]],
  inner2: [[454, 512], [454, 512]],
  width: 24, jitter: 0.05,
};
// 小篆：两缘匀称、上下圆合的弯月，里面两条短横
const SEAL = {
  left: [[523, 218], [400, 270], [335, 400], [325, 540], [345, 670], [415, 755], [508, 792]],
  right: [[523, 218], [462, 285], [442, 410], [445, 540], [468, 665], [500, 745], [508, 792]],
  inner1: [[352, 432], [462, 432]],
  inner2: [[354, 562], [464, 562]],
  width: 25, jitter: 0,
};
// 楷书：撇、横折钩、两横，全部照笔画数据的中线来
function kaishuForm(medians) {
  const flip = (m) => m.map(([x, y]) => [x, 900 - y]);
  return {
    left: flip(medians[0]),
    right: flip(medians[1]),
    inner1: flip(medians[2]),
    inner2: flip(medians[3]),
    width: 44, jitter: 0,
  };
}
// 月牙：和天上那弯月亮重合的起点形（里面的短笔还没长出来）
function crescentForm() {
  const { back, arm } = crescentEdges();
  const dot = [[CENTER[0], CENTER[1]], [CENTER[0], CENTER[1]]];
  return { left: back, right: arm, inner1: dot, inner2: dot, width: 26, jitter: 0 };
}

// 刀刻的颤动：低频正弦叠加，首尾相接
function wobble(u) {
  return (Math.sin(3 * u * Math.PI + 0.7) * 0.6 + Math.sin(5 * u * Math.PI + 2.1) * 0.3) / 0.9;
}
// 沿法线把点列抖出刀刻的痕迹
function carve(pts, jitter) {
  if (!jitter) return pts;
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const off = jitter * 22 * wobble(i / (pts.length - 1));
    return [p[0] - ((b[1] - a[1]) / l) * off, p[1] + ((b[0] - a[0]) / l) * off];
  });
}

const dOf = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');

// 两个形都是重采样好的 N 点列，逐点插值；线的端点会从「合拢」慢慢「张开」
function mixForm(a, b, t) {
  const out = { width: lerp(a.width, b.width, t), jitter: lerp(a.jitter, b.jitter, t), color: {} };
  for (const k of ['r', 'g', 'b']) out.color[k] = lerp(a.color[k], b.color[k], t);
  for (const k of ['left', 'right', 'inner1', 'inner2']) {
    out[k] = a[k].map((p, i) => [lerp(p[0], b[k][i][0], t), lerp(p[1], b[k][i][1], t)]);
  }
  return out;
}

export function createMorph(layer, data) {
  const root = svg('g', { class: 'morph', 'data-testid': 'morph', opacity: 0 }, layer);
  const mk = () =>
    svg('path', { fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round', pathLength: 1 }, root);
  const lines = { left: mk(), right: mk(), inner1: mk(), inner2: mk() };
  const KEYS = ['left', 'right', 'inner1', 'inner2'];

  const prep = (f, color) => ({ ...f, color, ...Object.fromEntries(KEYS.map((k) => [k, resample(f[k], N)])) });
  const dotOracle = { ...ORACLE, inner1: ORACLE.inner2, inner2: ORACLE.inner2 }; // 变形途中影子先不出现
  const FORMS = {
    crescent: prep(crescentForm(), MOONGOLD),
    oracle: prep(ORACLE, INK),
    oracleBare: prep(dotOracle, INK), // 同甲骨文，但影子还没长出来
    seal: prep(SEAL, INK),
    kaishu: prep(kaishuForm(data.medians), INK),
  };

  let current = FORMS.crescent;
  function render(f) {
    current = f;
    const color = `rgb(${f.color.r | 0},${f.color.g | 0},${f.color.b | 0})`;
    for (const k of KEYS) {
      const pts = carve(f[k], f.jitter);
      // 还没长出来的短笔是零长的点，不画
      lines[k].setAttribute('d', pathLen(pts) > 3 ? dOf(pts) : '');
      lines[k].setAttribute('stroke', color);
      lines[k].setAttribute('stroke-width', f.width.toFixed(1));
    }
  }

  // 记下骨架外框，供测试核对楷书和真正的笔画是否对齐
  const noteBox = (name) => {
    if (name !== 'kaishu') return;
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const k of KEYS)
      for (const [x, y] of current[k]) {
        x1 = Math.min(x1, x); y1 = Math.min(y1, y);
        x2 = Math.max(x2, x); y2 = Math.max(y2, y);
      }
    root.dataset.kaishuBox = `${((x1 + x2) / 2).toFixed(1)},${((y1 + y2) / 2).toFixed(1)},${(x2 - x1).toFixed(1)},${(y2 - y1).toFixed(1)}`;
  };

  const setDraw = (p, t) => {
    p.setAttribute('stroke-dasharray', '1 1');
    p.setAttribute('stroke-dashoffset', String(1 - t));
  };

  return {
    root,
    // 先用月光色沿月牙描一圈（背，再怀抱），月牙再慢慢拉长、刻成龟甲上的样子；
    // 最后影子那一小笔从月牙肚里长出来
    async drawOracle(check) {
      root.setAttribute('opacity', 1);
      render(FORMS.crescent);
      setDraw(lines.left, 0);
      setDraw(lines.right, 0);
      await tween(2100, (t) => setDraw(lines.left, t), { check });
      await tween(1400, (t) => setDraw(lines.right, t), { check });
      await tween(2600, (t) => render(mixForm(FORMS.crescent, FORMS.oracleBare, t)), { check });
      await tween(550, (t) => render(mixForm(FORMS.oracleBare, FORMS.oracle, t)), { check });
    },
    async to(name, ms, check) {
      const from = current;
      await tween(ms, (t) => render(mixForm(from, FORMS[name], t)), { check });
      noteBox(name);
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity') ?? 1);
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },
    reset() {
      root.setAttribute('opacity', 0);
      for (const k of KEYS) lines[k].removeAttribute('stroke-dasharray');
      render(FORMS.crescent);
    },
  };
}
