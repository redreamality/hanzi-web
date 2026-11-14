// 水墨大树：地面、露出的树根、树干、大小树枝、一簇簇淡彩的叶。
// 摸一下，枝叶轻轻摇，还有一片小叶子飘下来。
// 远处的淡树影放在背景层（layers.scenery，1600×1000 坐标）。
import { svg, tween, wait, lerp, ease } from '../../util.js';

const BASE = [512, 812]; // 树站立的地方

function pathLen(pts) {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return s;
}

// Catmull-Rom 展开成密集点列
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

// 沿点列的锥形闭合路径：像一笔写出的枝干，根粗梢细，两头积一点墨
function taper(pts, w0, w1) {
  const dense = smooth(pts);
  const total = pathLen(dense);
  const left = [];
  const right = [];
  let acc = 0;
  for (let i = 0; i < dense.length; i++) {
    if (i) acc += Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]);
    const j = Math.min(dense.length - 1, i + 1);
    const [dx, dy] = [dense[j][0] - dense[i][0], dense[j][1] - dense[i][1]];
    const l = Math.hypot(dx, dy) || 1;
    const w = lerp(w0, w1, acc / total) / 2;
    left.push([dense[i][0] + (-dy / l) * w, dense[i][1] + (dx / l) * w]);
    right.push([dense[i][0] - (-dy / l) * w, dense[i][1] - (dx / l) * w]);
  }
  const d = 'M' + left.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')
    + 'L' + right.reverse().map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z';
  return { d, tip: dense[dense.length - 1], tipR: w1 / 2, baseR: w0 / 2 };
}

function inkBranch(parent, pts, w0, w1, fill) {
  const { d, tip, tipR, baseR } = taper(pts, w0, w1);
  const g = svg('g', {}, parent);
  svg('path', { d, fill, filter: 'url(#ink)' }, g);
  svg('circle', { cx: pts[0][0], cy: pts[0][1], r: baseR * 0.96, fill, filter: 'url(#ink)' }, g);
  svg('circle', { cx: tip[0], cy: tip[1], r: tipR * 0.9, fill, filter: 'url(#ink)' }, g);
  return g;
}

const LEAF_GREENS = [
  { fill: '#8fa468', op: 0.34, filter: 'url(#wash2)', dx: -14, dy: -10, k: 1.15 },
  { fill: '#7a9159', op: 0.42, filter: 'url(#wash1)', dx: 10, dy: 8, k: 0.88 },
  { fill: '#5f7d4d', op: 0.4, filter: 'url(#wash2)', dx: 2, dy: -4, k: 0.7 },
];

// 一簇叶：三层大小、深浅不同的圆叠出水彩的叶团
function leafBlob(parent, [cx, cy], r) {
  const g = svg('g', { opacity: 0 }, parent);
  for (const { fill, op, filter, dx, dy, k } of LEAF_GREENS) {
    svg('circle', { cx: cx + dx, cy: cy + dy, r: r * k, fill, opacity: op, filter }, g);
  }
  const set = (s) => g.setAttribute('transform', `translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`);
  set(0);
  return { g, set, async bloom(ms, check) {
    await tween(ms, (t) => {
      set(t);
      g.setAttribute('opacity', Math.min(1, t * 2));
    }, { easing: ease.bloom, check });
  } };
}

const scaleAt = (g, [ox, oy], s) => g.setAttribute('transform', `translate(${ox} ${oy}) scale(${s}) translate(${-ox} ${-oy})`);
const rotateAt = (g, [ox, oy], deg) => g.setAttribute('transform', `rotate(${deg} ${ox} ${oy})`);

// 一片小叶子的形状（以中心为原点的小舟形）
const LEAF_D = 'M-14 0 C -6 -7 6 -7 14 0 C 6 7 -6 7 -14 0 Z';

// 远处一棵淡淡的树影（背景坐标）
function distantTree(parent, x, baseY, h, op) {
  const g = svg('g', { fill: '#3f4b50', opacity: op }, parent);
  svg('rect', { x: x - h * 0.03, y: baseY - h * 0.42, width: h * 0.06, height: h * 0.44, rx: h * 0.02 }, g);
  svg('ellipse', { cx: x, cy: baseY - h * 0.58, rx: h * 0.26, ry: h * 0.26 }, g);
  svg('ellipse', { cx: x - h * 0.14, cy: baseY - h * 0.4, rx: h * 0.17, ry: h * 0.15 }, g);
  svg('ellipse', { cx: x + h * 0.15, cy: baseY - h * 0.42, rx: h * 0.15, ry: h * 0.14 }, g);
}

export function createTree(pictureLayer, sceneryLayer) {
  const root = svg('g', { class: 'mu-tree-root', opacity: 0 }, pictureLayer);

  // 摸哪儿都算摸到树：罩住树冠和树干的透明形状
  const body = svg('g', {}, root);
  svg('ellipse', { cx: 515, cy: 258, rx: 272, ry: 196, fill: '#000', 'fill-opacity': 0 }, body);
  svg('rect', { x: 462, y: 250, width: 100, height: 622, rx: 48, fill: '#000', 'fill-opacity': 0 }, body);

  // 地面：一道淡墨，几笔小草
  const ground = svg('g', { opacity: 0 }, root);
  const groundLine = svg('path', {
    d: 'M330 818 C 420 810 470 816 512 814 C 600 810 660 818 716 812',
    fill: 'none', stroke: '#5a5347', 'stroke-width': 7, 'stroke-linecap': 'round',
    opacity: 0.55, filter: 'url(#wash2)', pathLength: 1,
  }, ground);
  for (const [gx, gy, f] of [[352, 816, 1], [668, 812, -1], [580, 818, 1]]) {
    svg('path', {
      d: `M${gx} ${gy} q ${6 * f} -14 ${13 * f} -16 M${gx + 5} ${gy} q ${2 * f} -10 ${8 * f} -12`,
      fill: 'none', stroke: '#6b6353', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.5,
    }, ground);
  }

  const tree = svg('g', { class: 'mu-tree' }, root);

  // 树根：露出地面的三条
  const roots = svg('g', {}, tree);
  const rootPaths = [
    [[512, 806], [488, 838], [448, 866], [420, 874]],
    [[512, 806], [516, 846], [514, 880], [508, 898]],
    [[512, 806], [540, 836], [576, 858], [606, 868]],
  ].map((pts) => inkBranch(roots, pts, 17, 7, '#3a332c'));

  // 树干和大小树枝（先整体从地面长高，再一根根伸展开）
  const trunkG = svg('g', {}, tree);
  const defs = svg('defs', {}, trunkG);
  const grad = svg('linearGradient', { id: 'mu-trunk', x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
  svg('stop', { offset: 0, 'stop-color': '#52463a' }, grad);
  svg('stop', { offset: 0.55, 'stop-color': '#3a332c' }, grad);
  svg('stop', { offset: 1, 'stop-color': '#2b2620' }, grad);
  inkBranch(trunkG, [[512, 812], [511, 700], [510, 566], [511, 470], [512, 392]], 60, 25, 'url(#mu-trunk)');
  svg('path', {
    d: 'M503 780 C 500 690 499 600 500 470', fill: 'none', stroke: '#5e5347',
    'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.5,
  }, trunkG);
  svg('path', {
    d: 'M522 760 C 521 680 520 590 521 480', fill: 'none', stroke: '#241f1a',
    'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.5,
  }, trunkG);

  const INK_WOOD = '#3a332c';
  const makeBranch = (origin, pts, w0, w1, twigs, blobs) => {
    const g = svg('g', {}, trunkG);
    inkBranch(g, pts, w0, w1, INK_WOOD);
    for (const tw of twigs) inkBranch(g, tw, 8, 4, INK_WOOD);
    const leaves = blobs.map(([p, r]) => leafBlob(g, p, r));
    return { g, origin, leaves, set: (s) => scaleAt(g, origin, s) };
  };
  const branchL = makeBranch(
    [511, 470],
    [[511, 470], [470, 432], [420, 372], [372, 308], [330, 244]],
    27, 9,
    [[[420, 372], [398, 330], [384, 296]]],
    [[[332, 252], 78], [[388, 292], 48], [[430, 352], 40]],
  );
  const branchR = makeBranch(
    [513, 452],
    [[513, 452], [560, 420], [614, 360], [664, 300], [702, 240]],
    27, 9,
    [[[614, 360], [636, 322], [650, 290]]],
    [[[700, 250], 78], [[648, 288], 48], [[610, 344], 40]],
  );
  const topBranch = makeBranch(
    [512, 392],
    [[512, 392], [512, 330], [511, 262], [511, 200], [511, 168]],
    24, 8,
    // 顶上的两根小枝伸向左右两侧的叶团，把整个树冠连成一片
    [[[511, 302], [486, 262], [456, 214]], [[511, 302], [536, 264], [580, 218]]],
    [[[511, 170], 62], [[452, 208], 58], [[586, 212], 58]],
  );
  const branches = [branchL, branchR, topBranch];

  // 收尾时长出的新叶：独立于树影之外（树影整体压到 0.32，新叶要保持鲜亮）
  const newLeaves = svg('g', { opacity: 0 }, pictureLayer);
  const NEW_LEAF_SPOTS = [
    [[340, 268], -18], [[368, 300], 24], [[686, 262], 160], [[664, 296], -150],
    [[500, 168], -8], [[544, 200], 150], [[430, 386], -30], [[596, 378], 20],
  ];

  // 远处淡淡的树影
  let scenery = null;
  const buildScenery = () => {
    sceneryLayer.replaceChildren();
    scenery = svg('g', { opacity: 0 }, sceneryLayer);
    const wash = svg('g', { filter: 'url(#mist-wash)', fill: '#3f4b50' }, scenery);
    distantTree(wash, 235, 792, 150, 0.13);
    distantTree(wash, 318, 800, 105, 0.1);
    distantTree(wash, 1176, 796, 128, 0.11);
    distantTree(wash, 1298, 790, 158, 0.14);
    distantTree(wash, 1398, 802, 96, 0.09);
  };

  // 各部分的初始状态：都收着，等 appear 一样样长出来
  const fold = () => {
    scaleAt(trunkG, BASE, 0);
    for (const b of branches) b.set(0);
    rootPaths.forEach((g) => g.setAttribute('opacity', 0));
  };
  fold();
  let pulseToken = 0;
  let fallingLeaf = null;

  return {
    root,
    body,
    // 树慢慢长出来：地面洇开 → 根钻出来 → 干长高 → 枝伸展开 → 叶一团团绽开
    async appear(check, { fast = false } = {}) {
      const f = fast ? 0.4 : 1;
      root.setAttribute('opacity', 1);
      buildScenery();
      tween(2200 * f, (t) => scenery.setAttribute('opacity', t), { check }).catch(() => {});
      groundLine.setAttribute('stroke-dasharray', '1 1');
    groundLine.setAttribute('stroke-dashoffset', 1);
      ground.setAttribute('opacity', 1);
      await tween(500 * f, (t) => groundLine.setAttribute('stroke-dashoffset', String(1 - t)), { check });
      // 根一条条钻出来，同时树干从地面往上长
      const rootsGrow = Promise.all(
        rootPaths.map((g, i) =>
          wait(i * 120 * f, check).then(() =>
            tween(360 * f, (t) => {
              g.setAttribute('opacity', 1);
              scaleAt(g, [512, 806], t);
            }, { easing: ease.out, check }),
          ),
        ),
      );
      const trunkGrow = tween(800 * f, (t) => scaleAt(trunkG, BASE, t), { easing: ease.bloom, check });
      await Promise.all([rootsGrow, trunkGrow]);
      // 三根主枝依次伸展开
      await Promise.all(
        branches.map((b, i) =>
          wait(i * 120 * f, check).then(() => tween(450 * f, (t) => b.set(t), { easing: ease.bloom, check })),
        ),
      );
      // 叶子一团团绽开
      const allLeaves = branches.flatMap((b) => b.leaves);
      await Promise.all(
        allLeaves.map((leaf, i) =>
          wait(i * 75 * f, check).then(() => leaf.bloom(480 * f, check)),
        ),
      );
    },
    // 摸一下：风穿过树梢，枝叶摇一摇，一片小叶子打着转飘下来
    async pulse() {
      const token = ++pulseToken;
      const alive = () => token === pulseToken;
      if (fallingLeaf) fallingLeaf.remove();
      fallingLeaf = svg('path', {
        d: LEAF_D, fill: '#7a9159', opacity: 0,
        transform: 'translate(420 300) rotate(20)',
      }, root);
      await tween(
        1100,
        (t) => {
          if (!alive()) return;
          const swing = Math.sin(t * Math.PI * 3) * (1 - t);
          rotateAt(branchL.g, branchL.origin, 4 * swing);
          rotateAt(branchR.g, branchR.origin, -4 * swing);
          rotateAt(topBranch.g, topBranch.origin, 2.5 * swing);
          for (const b of branches) {
            for (const leaf of b.leaves) leaf.set(1 + 0.07 * Math.sin(t * Math.PI * 4) * (1 - t));
          }
        },
        { easing: ease.out },
      );
      if (!alive()) return;
      for (const b of branches) {
        rotateAt(b.g, b.origin, 0);
        for (const leaf of b.leaves) leaf.set(1);
      }
      // 一片小叶子飘下来
      const leaf = fallingLeaf;
      await tween(2000, (t) => {
        if (!alive()) return;
        const x = 420 + 46 * Math.sin(t * Math.PI * 2.6) - 20 * t;
        const y = 300 + 470 * t;
        leaf.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(t * 300 + 20).toFixed(0)}) scale(${1 - 0.3 * t})`);
        leaf.setAttribute('opacity', String(Math.min(1, t * 6) * (1 - Math.max(0, t - 0.82) * 5)));
      });
      leaf.remove();
      if (fallingLeaf === leaf) fallingLeaf = null;
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity'));
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },
    // 写完字：树影在字后面重新长出来，枝头再冒出几片嫩绿的新叶
    async sprout(check) {
      newLeaves.setAttribute('opacity', 1);
      const leaves = NEW_LEAF_SPOTS.map(([p, rot]) => {
        const g = svg('g', {}, newLeaves);
        // 嫩叶用干净的颜色，不套水彩滤镜：要在淡淡的树影上看得清清楚楚
        const at = `translate(${p[0]} ${p[1]}) rotate(${rot})`;
        svg('path', { d: LEAF_D, fill: '#8aab5c', opacity: 0.95, transform: at }, g);
        svg('path', { d: 'M14 0 C 6 -7 -6 -7 -14 0 C -6 2 6 2 14 0 Z', fill: '#5f7d4d', opacity: 0.8, transform: at }, g);
        return { g, p };
      });
      await Promise.all(
        leaves.map(({ g, p }, i) =>
          wait(200 + i * 170, check).then(() =>
            tween(700, (t) => {
              scaleAt(g, p, t);
              g.setAttribute('opacity', Math.min(1, t * 2));
            }, { easing: ease.bloom, check }),
          ),
        ),
      );
    },
    reset() {
      pulseToken++;
      fallingLeaf?.remove();
      fallingLeaf = null;
      for (const b of branches) {
        rotateAt(b.g, b.origin, 0);
        b.set(0);
        for (const leaf of b.leaves) {
          leaf.set(0);
          leaf.g.setAttribute('opacity', 0);
        }
      }
      scaleAt(trunkG, BASE, 0);
      rootPaths.forEach((g) => {
        g.setAttribute('opacity', 0);
        scaleAt(g, [512, 806], 0);
      });
      ground.setAttribute('opacity', 0);
      groundLine.removeAttribute('stroke-dasharray');
      groundLine.removeAttribute('stroke-dashoffset');
      newLeaves.setAttribute('opacity', 0);
      newLeaves.replaceChildren();
      root.setAttribute('opacity', 0);
      sceneryLayer.replaceChildren();
      scenery = null;
    },
  };
}
