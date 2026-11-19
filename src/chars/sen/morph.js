// 「森」从三棵树到楷书的字形变形：三个木品字叠立——上面一个木、下面两个木，
// 每棵由同样的五条骨架组成（左枝、右枝、树干、左根、右根），
// 与楷书每木的横（左右两半）、竖、撇、点/捺一一对应。
// 变形就是把每条骨架的控制点插值过去——三棵树慢慢长成三个字，不是两张图切换。
// 楷书的骨架直接取自笔画数据的中线，所以最后一步和笔顺动画严丝合缝。
// 开场的刻法照着「森」的来历走：先刻左木、再刻右木（两个木，是刚学的林），
// 停一拍，再往林上添一个木——三个木，就是森。
import { svg, tween, wait, lerp } from '../../util.js';

const K = 6; // 每条骨架统一重采样成 K 个控制点，插值时一一对应
const INK = [34, 29, 26];
// 开场刻字用的赭石色：树皮的颜色，最后慢慢沉成墨（同「木」「林」）
const OCHRE = [126, 84, 50];

// ---- 采样工具（strokes.js 里的同款，共享文件不能动） ----
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
function distToPoly(p, pts) {
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

// Catmull-Rom 样条：控制点少的骨架也能画出流畅弧线
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

// 刀刻的颤动：低频正弦叠加，首尾不动（乘 sin 包络）
const wobble = (t, ph) =>
  Math.sin(3 * t + ph) * 0.6 + Math.sin(5 * t + ph * 2.7) * 0.3 + Math.sin(7 * t + ph * 4.1) * 0.25;
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

// 笔画数据坐标（y 朝上）→ 屏幕坐标（y 朝下）
const pt = (m) => m.map(([x, y]) => [x, 900 - y]);
const strokeD = (pts) => 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L');

// ---- 单棵木的基础形状（中轴 x=0，干底 y=890，屏幕坐标）----
// 甲骨文：刀刻的直线骨架——枝向上分叉，根向下分叉，中间一竖是树干（同「木」「林」）
const ORACLE_TREE = {
  branchL: [[0, 510], [-40, 472], [-78, 434], [-116, 396], [-152, 356], [-186, 318]],
  branchR: [[0, 510], [40, 472], [78, 434], [116, 396], [152, 356], [186, 318]],
  trunk: [[0, 110], [-1, 250], [1, 420], [-1, 600], [0, 760], [0, 890]],
  rootL: [[0, 742], [-36, 770], [-72, 798], [-108, 826], [-146, 854], [-182, 884]],
  rootR: [[0, 742], [36, 770], [72, 798], [108, 826], [146, 854], [182, 884]],
};
// 小篆：线条匀称，枝和根弯成对称的弧线，整棵树修长挺拔
const SEAL_TREE = {
  branchL: [[0, 470], [-38, 448], [-74, 420], [-106, 386], [-132, 350], [-152, 314]],
  branchR: [[0, 470], [38, 448], [74, 420], [106, 386], [132, 350], [152, 314]],
  trunk: [[1, 130], [0, 300], [-1, 470], [1, 640], [0, 800], [0, 890]],
  rootL: [[0, 756], [-34, 778], [-64, 804], [-90, 834], [-112, 864], [-128, 892]],
  rootR: [[0, 756], [34, 778], [64, 804], [90, 834], [112, 864], [128, 892]],
};

// 把基础形状缩放着地：树脚留在 footY（上木的脚叠在两木的枝上方），中轴挪到 cx
const place = (tree, cx, footY, s) =>
  Object.fromEntries(
    Object.entries(tree).map(([k, v]) => [k, v.map(([x, y]) => [cx + x * s, footY + (y - 890) * s])]),
  );

// 楷书单木（medians 四笔：横竖撇点/捺）：横从中线与竖的交点拆成左右两半，各对应一根树枝
function kaishuTree(med) {
  const heng = pt(med[0]);
  const shu = pt(med[1]);
  // 横的中线上离竖最近的那一点，就是左右两半的分界
  let mid = heng[0];
  let bd = Infinity;
  const dense = resample(heng, 72);
  for (const p of dense) {
    const d = distToPoly(p, shu);
    if (d < bd) {
      bd = d;
      mid = p;
    }
  }
  let cut = 0;
  let cd = Infinity;
  dense.forEach((p, k) => {
    const d = Math.hypot(p[0] - mid[0], p[1] - mid[1]);
    if (d < cd) {
      cd = d;
      cut = k;
    }
  });
  return {
    // 每条骨架都从树干出发向外长（与甲骨文、小篆一致），横的左半要掉个头
    branchL: resample(dense.slice(0, cut + 1), K).reverse(),
    branchR: resample(dense.slice(cut), K),
    trunk: resample(shu, K),
    rootL: resample(pt(med[2]), K),
    rootR: resample(pt(med[3]), K),
  };
}

const PARTS = ['branchL', 'branchR', 'trunk', 'rootL', 'rootR'];
const KIND_OF = { branchL: 'branch', branchR: 'branch', trunk: 'trunk', rootL: 'root', rootR: 'root' };
// 三个木：下面左、右两个（先刻，是林），上面再叠一个（添木成森）
const SIDES = ['L', 'R', 'T'];
const KEYS = SIDES.flatMap((s) => PARTS.map((p) => `${s}:${p}`));

// 三个字形各自的笔宽（楷书接近真实笔画的视觉厚度；上木小一号，笔画也细一号）
const WIDTHS = {
  oracle: { branch: 22, trunk: 26, root: 20 },
  seal: { branch: 17, trunk: 20, root: 17 },
  kaishu: { branch: 52, trunk: 50, root: 42 },
};
const T_WIDTH = 0.78;
const JITTER = { oracle: 3.2, seal: 0, kaishu: 0 };

export function createMorph(layer, data) {
  const FORMS = {
    // 三个甲骨文的木品字叠立：下面两木的脚踩在 y=890；上木的脚要抬高些，
    // 和两木的枝尖留出空隙——三个木各自独立，不能粘成一团。
    // 对照汉典拓片（zy/jiaguwen/42_EB6C）：刻辞里的三木高低参差——右木最长、
    // 上木最小且悬得最高；下两木不做成一样高的「印章对称」
    oracle: { L: place(ORACLE_TREE, 305, 890, 0.66), R: place(ORACLE_TREE, 630, 890, 0.72), T: place(ORACLE_TREE, 480, 456, 0.5) },
    // 小篆的三木：更高更瘦，枝根都弯成对称的弧线，密密地挨在一起
    seal: { L: place(SEAL_TREE, 305, 890, 0.78), R: place(SEAL_TREE, 628, 890, 0.78), T: place(SEAL_TREE, 481, 460, 0.57) },
    // 楷书：笔画零到三是上木，四到七是左木，八到十一是右木
    kaishu: { T: kaishuTree(data.medians.slice(0, 4)), L: kaishuTree(data.medians.slice(4, 8)), R: kaishuTree(data.medians.slice(8, 12)) },
  };

  const root = svg('g', { class: 'morph', 'data-testid': 'morph', opacity: 0 }, layer);
  const paths = {};
  for (const key of KEYS) {
    paths[key] = svg('path', {
      fill: 'none',
      stroke: 'black',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      pathLength: 1,
    }, root);
  }

  const widthOf = (kind, key) => WIDTHS[kind][KIND_OF[key.slice(2)]] * (key[0] === 'T' ? T_WIDTH : 1);
  // 上木骨架细，刀刻的颤动也收着点，免得颤出小墨点
  const jitterOf = (kind, key) => JITTER[kind] * (key[0] === 'T' ? 0.7 : 1);

  const drawPart = (key, pts, jitter, ink, w) => {
    const d = engrave(smooth(pts), jitter, key.length * 1.3);
    paths[key].setAttribute('d', strokeD(d));
    paths[key].setAttribute('stroke', `rgb(${ink[0] | 0},${ink[1] | 0},${ink[2] | 0})`);
    paths[key].setAttribute('stroke-width', w.toFixed(1));
  };

  const render = (form, kind, ink) => {
    for (const side of SIDES)
      for (const p of PARTS) {
        const key = `${side}:${p}`;
        drawPart(key, form[side][p], jitterOf(kind, key), ink, widthOf(kind, key));
      }
  };

  const setDraw = (key, t) => {
    paths[key].setAttribute('stroke-dasharray', '1 1');
    paths[key].setAttribute('stroke-dashoffset', String(1 - t));
  };

  // 记下骨架外框，供测试核对楷书和真正的笔画是否对齐
  const noteBox = (name) => {
    if (name !== 'kaishu') return;
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const side of SIDES)
      for (const p of PARTS)
        for (const [x, y] of FORMS.kaishu[side][p]) {
          x1 = Math.min(x1, x); y1 = Math.min(y1, y);
          x2 = Math.max(x2, x); y2 = Math.max(y2, y);
        }
    root.dataset.kaishuBox = `${((x1 + x2) / 2).toFixed(1)},${((y1 + y2) / 2).toFixed(1)},${(x2 - x1).toFixed(1)},${(y2 - y1).toFixed(1)}`;
  };

  // 一棵树按 干→枝→根 的顺序刻出来；上木小一号，刻得也轻快些。
  // 节奏要收着：三棵刻完还得给「森」的定格留出时间（旁白约十秒）
  const engraveTree = async (side, check) => {
    const f = side === 'T' ? 0.85 : 1;
    await tween(580 * f, (t) => setDraw(`${side}:trunk`, t), { check });
    await Promise.all([
      tween(510 * f, (t) => setDraw(`${side}:branchL`, t), { check }),
      tween(510 * f, (t) => setDraw(`${side}:branchR`, t), { check }),
    ]);
    await Promise.all([
      tween(460 * f, (t) => setDraw(`${side}:rootL`, t), { check }),
      tween(460 * f, (t) => setDraw(`${side}:rootR`, t), { check }),
    ]);
  };

  let kind = 'oracle';

  return {
    root,
    // 先用赭石色刻出左边的木，再刻右边的木——两个木排排站，是刚学的林；
    // 停一拍，再往林上添一个木——三个木，就是森。颜色再慢慢沉成墨
    async drawOracle(check) {
      kind = 'oracle';
      root.setAttribute('opacity', 1);
      render(FORMS.oracle, 'oracle', OCHRE);
      KEYS.forEach((key) => setDraw(key, 0));
      await engraveTree('L', check);
      await wait(180, check);
      await engraveTree('R', check);
      // 「林」定格一拍：两个木，是林
      await wait(500, check);
      await engraveTree('T', check);
      await tween(
        900,
        (t) => render(FORMS.oracle, 'oracle', OCHRE.map((v, i) => lerp(v, INK[i], t))),
        { check },
      );
    },
    // 对控制点、笔宽、刀刻颤动一起插值，十五条骨架同时连续地变形
    async to(name, ms, check) {
      const fromKind = kind;
      const to = FORMS[name];
      await tween(
        ms,
        (t) => {
          for (const key of KEYS) {
            const [side, part] = key.split(':');
            const a = FORMS[fromKind][side][part];
            const b = to[side][part];
            const pts = a.map((q, i) => [lerp(q[0], b[i][0], t), lerp(q[1], b[i][1], t)]);
            drawPart(
              key,
              pts,
              lerp(jitterOf(fromKind, key), jitterOf(name, key), t),
              INK,
              lerp(widthOf(fromKind, key), widthOf(name, key), t),
            );
          }
        },
        { check },
      );
      kind = name;
      noteBox(name);
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity') ?? 1);
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
      // 完全淡出后整个藏起来：十五笔骨架套着墨迹滤镜，留着会拖慢后面笔顺动画的渲染
      if (opacity === 0) root.setAttribute('display', 'none');
    },
    reset() {
      kind = 'oracle';
      root.setAttribute('opacity', 0);
      root.removeAttribute('display');
      KEYS.forEach((key) => {
        paths[key].removeAttribute('stroke-dasharray');
        paths[key].removeAttribute('stroke-dashoffset');
      });
      render(FORMS.oracle, 'oracle', INK);
    },
  };
}
