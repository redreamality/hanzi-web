// 「林」的字形演化：左木、右木 两棵「树」各五条笔画（横左半、横右半、竖、撇、捺），共 10 条。
// 变形就是把每条笔画的控制点插值过去——两棵树就慢慢变成了字，不是两张图切换。
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

// 十条笔画：每棵木的横拆成左右两半，各对应一根树枝
const PARTS = ['lBranchL', 'lBranchR', 'lTrunk', 'lRootL', 'lRootR', 'rBranchL', 'rBranchR', 'rTrunk', 'rRootL', 'rRootR'];
const KIND_OF = {
  lBranchL: 'branch', lBranchR: 'branch', lTrunk: 'trunk', lRootL: 'root', lRootR: 'root',
  rBranchL: 'branch', rBranchR: 'branch', rTrunk: 'trunk', rRootL: 'root', rRootR: 'root',
};

// 甲骨文：两棵刀刻的直线骨架——先左树、后右树（屏幕坐标，和 data 的 x 对齐）
const ORACLE = {
  lTrunk: [[287, 100], [286, 258], [288, 425], [287, 595], [286, 765], [287, 898]],
  lBranchL: [[287, 318], [257, 283], [228, 247], [198, 210], [170, 172], [142, 134]],
  lBranchR: [[287, 318], [317, 283], [346, 247], [376, 210], [404, 172], [432, 134]],
  lRootL: [[287, 742], [256, 772], [226, 800], [196, 826], [168, 856], [142, 886]],
  lRootR: [[287, 742], [318, 772], [348, 800], [378, 826], [406, 856], [432, 886]],
  rTrunk: [[615, 84], [614, 248], [616, 420], [615, 598], [614, 770], [615, 898]],
  rBranchL: [[615, 300], [585, 266], [556, 230], [524, 194], [498, 158], [470, 122]],
  rBranchR: [[615, 300], [645, 266], [674, 230], [704, 194], [730, 158], [758, 122]],
  rRootL: [[615, 748], [584, 778], [554, 806], [524, 832], [496, 860], [470, 888]],
  rRootR: [[615, 748], [646, 778], [676, 806], [706, 832], [734, 860], [758, 888]],
};

// 小篆：线条匀称，枝和根都弯成对称的弧线，两棵靠得更近（右边略高）
const SEAL = {
  lTrunk: [[287, 110], [287, 252], [287, 420], [287, 592], [287, 748], [287, 880]],
  lBranchL: [[287, 238], [258, 214], [232, 182], [211, 146], [196, 116], [188, 94]],
  lBranchR: [[287, 238], [316, 214], [342, 182], [363, 146], [378, 116], [386, 94]],
  lRootL: [[287, 764], [259, 790], [232, 824], [209, 858], [194, 884], [186, 904]],
  lRootR: [[287, 764], [315, 790], [342, 824], [365, 858], [380, 884], [388, 904]],
  rTrunk: [[615, 92], [615, 248], [615, 420], [615, 596], [615, 755], [615, 890]],
  rBranchL: [[615, 220], [586, 196], [560, 164], [539, 128], [524, 98], [516, 76]],
  rBranchR: [[615, 220], [644, 196], [670, 164], [691, 128], [706, 98], [714, 76]],
  rRootL: [[615, 766], [586, 792], [560, 826], [537, 860], [522, 886], [514, 906]],
  rRootR: [[615, 766], [644, 792], [670, 826], [693, 860], [708, 886], [716, 906]],
};

// 由笔画数据的中线生成楷书形态。每棵木：横拆成两半（从中线与竖的交点分开），竖、撇、捺各一条
function kaishuForm(data) {
  const out = {};
  for (const [k, pre] of [[0, 'l'], [4, 'r']]) {
    const heng = data.medians[k];
    const shu = data.medians[k + 1];
    const hy = (heng[0][1] + heng[heng.length - 1][1]) / 2;
    // 竖的中线在横的高度附近的 x，就是横左右两半的分界
    let mid;
    for (let i = 0; i < shu.length - 1; i++) {
      const a = shu[i];
      const b = shu[i + 1];
      if ((a[1] - hy) * (b[1] - hy) <= 0) {
        const t = b[1] === a[1] ? 0 : (hy - a[1]) / (b[1] - a[1]);
        mid = [lerp(a[0], b[0], t), hy];
        break;
      }
    }
    // 每条笔画都从树干出发向外长（与甲骨文、小篆一致），横的左半要掉个头
    out[`${pre}BranchL`] = resample(pt([heng[0], heng[1], mid]), K).reverse();
    out[`${pre}BranchR`] = resample(pt([mid, ...heng.slice(2)]), K);
    out[`${pre}Trunk`] = resample(pt(shu), K);
    out[`${pre}RootL`] = resample(pt(data.medians[k + 2]), K);
    out[`${pre}RootR`] = resample(pt(data.medians[k + 3]), K);
  }
  return out;
}

const FORMS = { oracle: ORACLE, seal: SEAL };
// 三个字形各自的笔宽（两棵木并排，比「木」单棵略细一点）
const WIDTHS = {
  oracle: { branch: 24, trunk: 28, root: 20 },
  seal: { branch: 20, trunk: 22, root: 19 },
  kaishu: { branch: 62, trunk: 68, root: 52 },
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
    // 先用赭石色把两棵树的骨架一笔一笔刻出来——先左树、后右树——颜色再慢慢沉成墨
    async drawOracle(check) {
      kind = 'oracle';
      root.setAttribute('opacity', 1);
      render(ORACLE, 'oracle', OCHRE);
      PARTS.forEach((p) => setDraw(p, 0));
      await tween(650, (t) => setDraw('lTrunk', t), { check });
      await Promise.all([
        tween(520, (t) => setDraw('lBranchL', t), { check }),
        tween(520, (t) => setDraw('lBranchR', t), { check }),
      ]);
      await Promise.all([
        tween(480, (t) => setDraw('lRootL', t), { check }),
        tween(480, (t) => setDraw('lRootR', t), { check }),
      ]);
      await tween(550, (t) => setDraw('rTrunk', t), { check });
      await Promise.all([
        tween(460, (t) => setDraw('rBranchL', t), { check }),
        tween(460, (t) => setDraw('rBranchR', t), { check }),
      ]);
      await Promise.all([
        tween(420, (t) => setDraw('rRootL', t), { check }),
        tween(420, (t) => setDraw('rRootR', t), { check }),
      ]);
      await tween(
        900,
        (t) => render(ORACLE, 'oracle', OCHRE.map((v, i) => lerp(v, INK[i], t))),
        { check },
      );
    },
    // 对控制点、笔宽、刀刻颤动一起插值，十条笔画同时连续地变形
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
