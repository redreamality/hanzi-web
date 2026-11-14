// 「木」从树到楷书的字形变形。
// 每个字形都由同样五条「笔画」组成：左枝、右枝、树干、左根、右根，
// 与楷书的横（左右两半）、竖、撇、捺一一对应。
// 变形就是把每条笔画的控制点插值过去——树就慢慢变成了字，不是两张图切换。
// 楷书的控制点直接取自笔画数据的中线，所以最后一步和笔顺动画严丝合缝。
import { svg, tween, lerp } from '../../util.js';

// 每条笔画统一重采样成 K 个控制点，插值时逐点对应
const K = 6;
// 刀刻的颤动：低频正弦叠加，首尾不动（乘 sin 包络）
const wobble = (t, ph) =>
  Math.sin(3 * t + ph) * 0.6 + Math.sin(5 * t + ph * 2.7) * 0.3 + Math.sin(7 * t + ph * 4.1) * 0.25;

// 笔画数据坐标（y 朝上）→ 屏幕坐标（y 朝下）
const pt = (m) => m.map(([x, y]) => [x, 900 - y]);

function pathLen(pts) {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return s;
}

// 按弧长均匀重采样成 n 个点（和描红判定无关，只为变形时点与点对应）
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

// Catmull-Rom 样条：控制点少的笔画也能画出流畅弧线
function cr(a, b, c, d, t) {
  return b + 0.5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)));
}
function smooth(pts, seg = 10) {
  const n = pts.length;
  const out = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const [p1, p2] = [pts[i], pts[i + 1]];
    const p3 = pts[Math.min(n - 1, i + 2)];
    for (let s = 0; s < seg; s++) {
      const t = s / seg;
      out.push([cr(p0[0], p1[0], p2[0], p3[0], t), cr(p0[1], p1[1], p2[1], p3[1], t)]);
    }
  }
  out.push([...pts[n - 1]]);
  return out;
}

// 沿法向叠加刀刻的颤动
function engrave(pts, amp, ph) {
  if (!amp) return pts;
  const total = pathLen(pts);
  const out = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const [dx, dy] = [pts[i + 1][0] - pts[i - 1][0], pts[i + 1][1] - pts[i - 1][1]];
    const l = Math.hypot(dx, dy) || 1;
    const off = amp * wobble(acc / total, ph) * Math.sin(Math.PI * (acc / total));
    out.push([pts[i][0] + (-dy / l) * off, pts[i][1] + (dx / l) * off]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

const strokeD = (pts) => 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L');

// 五条笔画：横被拆成左右两半，各对应一根树枝
const PARTS = ['branchL', 'branchR', 'trunk', 'rootL', 'rootR'];
const KIND_OF = { branchL: 'branch', branchR: 'branch', trunk: 'trunk', rootL: 'root', rootR: 'root' };

// 甲骨文：刀刻的直线骨架——枝向上分叉，根向下分叉，中间一竖是树干
const ORACLE = {
  branchL: [[505, 318], [471, 281], [438, 244], [404, 207], [370, 168], [336, 132]],
  branchR: [[505, 318], [539, 281], [572, 244], [606, 207], [640, 168], [674, 132]],
  trunk: [[505, 112], [504, 260], [506, 420], [505, 600], [504, 760], [505, 898]],
  rootL: [[505, 742], [470, 772], [436, 800], [402, 826], [368, 856], [336, 888]],
  rootR: [[505, 742], [540, 772], [574, 800], [608, 826], [642, 856], [674, 888]],
};

// 小篆：线条匀称，枝和根都弯成对称的弧线，整棵树修长挺拔
const SEAL = {
  branchL: [[520, 238], [488, 214], [458, 182], [434, 146], [416, 116], [406, 94]],
  branchR: [[520, 238], [552, 214], [582, 182], [606, 146], [624, 116], [634, 94]],
  trunk: [[520, 128], [520, 260], [520, 420], [520, 590], [520, 740], [520, 878]],
  rootL: [[520, 764], [488, 790], [456, 824], [430, 858], [412, 884], [402, 904]],
  rootR: [[520, 764], [552, 790], [584, 824], [610, 858], [628, 884], [638, 904]],
};

// 由笔画数据的中线生成楷书形态（横拆成两半，从中线与竖的交点分开）
function kaishuForm(data) {
  const heng = data.medians[0];
  const shu = data.medians[1];
  // 竖的中线在横的高度（y≈530）附近的 x，就是横左右两半的分界
  const t = Math.min(1, Math.max(0, (shu[2][1] - 530) / (shu[2][1] - shu[3][1])));
  const mid = [lerp(shu[2][0], shu[3][0], t), 530];
  return {
    // 每条笔画都从树干出发向外长（与甲骨文、小篆一致），横的左半要掉个头
    branchL: resample(pt([heng[0], heng[1], mid]), K).reverse(),
    branchR: resample(pt([mid, ...heng.slice(2)]), K),
    trunk: resample(pt(shu), K),
    rootL: resample(pt(data.medians[2]), K),
    rootR: resample(pt(data.medians[3]), K),
  };
}

const FORMS = { oracle: ORACLE, seal: SEAL };
// 三个字形各自的笔宽（楷书接近真实笔画的视觉厚度）
const WIDTHS = {
  oracle: { branch: 30, trunk: 36, root: 28 },
  seal: { branch: 24, trunk: 26, root: 24 },
  kaishu: { branch: 76, trunk: 84, root: 64 },
};
const JITTER = { oracle: 3.4, seal: 0, kaishu: 0 };
const INK = [34, 29, 26];
// 开场刻字用的赭石色：树皮的颜色，最后慢慢沉成墨
const OCHRE = [126, 84, 50];

export function createMorph(layer, data) {
  FORMS.kaishu = kaishuForm(data);

  const root = svg('g', { class: 'morph', 'data-testid': 'morph', opacity: 0 }, layer);
  const paths = {};
  for (const p of PARTS) {
    paths[p] = svg('path', {
      fill: 'none',
      stroke: 'black',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      pathLength: 1,
    }, root);
  }

  const widthOf = (kind, part) => WIDTHS[kind][KIND_OF[part]];

  const drawPart = (p, pts, jitter, ink, w) => {
    const d = engrave(smooth(pts), jitter, p.length * 1.7);
    paths[p].setAttribute('d', strokeD(d));
    paths[p].setAttribute('stroke', `rgb(${ink[0] | 0},${ink[1] | 0},${ink[2] | 0})`);
    paths[p].setAttribute('stroke-width', w.toFixed(1));
  };

  const render = (form, kind, ink) => {
    for (const p of PARTS) drawPart(p, form[p], JITTER[kind], ink, widthOf(kind, p));
  };

  const setDraw = (p, t) => {
    paths[p].setAttribute('stroke-dasharray', '1 1');
    paths[p].setAttribute('stroke-dashoffset', String(1 - t));
  };

  let kind = 'oracle';

  return {
    root,
    // 先用赭石色把骨架一笔一笔刻出来——树干、两根树枝、两条树根——颜色再慢慢沉成墨
    async drawOracle(check) {
      kind = 'oracle';
      root.setAttribute('opacity', 1);
      render(ORACLE, 'oracle', OCHRE);
      PARTS.forEach((p) => setDraw(p, 0));
      await tween(750, (t) => setDraw('trunk', t), { check });
      await Promise.all([
        tween(600, (t) => setDraw('branchL', t), { check }),
        tween(600, (t) => setDraw('branchR', t), { check }),
      ]);
      await Promise.all([
        tween(560, (t) => setDraw('rootL', t), { check }),
        tween(560, (t) => setDraw('rootR', t), { check }),
      ]);
      await tween(
        1100,
        (t) => render(ORACLE, 'oracle', OCHRE.map((v, i) => lerp(v, INK[i], t))),
        { check },
      );
    },
    // 对控制点、笔宽、刀刻颤动一起插值，五条笔画同时连续地变形
    async to(name, ms, check) {
      const from = FORMS[kind];
      const to = FORMS[name];
      const fromKind = kind;
      await tween(
        ms,
        (t) => {
          for (const p of PARTS) {
            const pts = from[p].map((q, i) => [lerp(q[0], to[p][i][0], t), lerp(q[1], to[p][i][1], t)]);
            drawPart(p, pts, lerp(JITTER[fromKind], JITTER[name], t), INK, lerp(widthOf(fromKind, p), widthOf(name, p), t));
          }
        },
        { check },
      );
      kind = name;
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity') ?? 1);
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },
    reset() {
      kind = 'oracle';
      root.setAttribute('opacity', 0);
      PARTS.forEach((p) => {
        paths[p].removeAttribute('stroke-dasharray');
        paths[p].removeAttribute('stroke-dashoffset');
      });
      render(ORACLE, 'oracle', INK);
    },
  };
}
