// 两棵姿态不同的水墨大树：左边一棵高直挺拔，右边一棵矮些、向右微倾、树冠圆圆的。
// 长在草坡上，树脚正对着后来字形里两「木」站立的位置。
// 摸一下，两棵树一起摇，各有一片小叶子飘下来。
// 远处淡淡的树影放在背景层（layers.scenery，1600×1000 坐标），reset 时清理干净。
import { svg, tween, wait, lerp, ease } from '../../util.js';

// ---- 采样与笔触工具（同「木」的技法，共享文件不能动）----
function pathLen(pts) {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return s;
}
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
const INK_WOOD = '#3a332c';

// 远处一棵淡淡的树影（背景坐标）
function distantTree(parent, x, baseY, h, op) {
  const g = svg('g', { fill: '#3f4b50', opacity: op }, parent);
  svg('rect', { x: x - h * 0.03, y: baseY - h * 0.42, width: h * 0.06, height: h * 0.44, rx: h * 0.02 }, g);
  svg('ellipse', { cx: x, cy: baseY - h * 0.58, rx: h * 0.26, ry: h * 0.26 }, g);
  svg('ellipse', { cx: x - h * 0.14, cy: baseY - h * 0.4, rx: h * 0.17, ry: h * 0.15 }, g);
  svg('ellipse', { cx: x + h * 0.15, cy: baseY - h * 0.42, rx: h * 0.15, ry: h * 0.14 }, g);
}

// ---- 参数化建一棵树：spec 给出树脚、树干、根、枝（含小枝和叶团）----
// gradId 单独传：不能从 class 名拼（class 是空格分隔的列表，拼出来的 id 带空格会让 url(#…) 失效）
function buildTree(parent, cls, spec, gradId) {
  const g = svg('g', { class: cls }, parent);
  const roots = svg('g', {}, g);
  const rootPaths = spec.roots.map((pts) => inkBranch(roots, pts, 15, 7, INK_WOOD));
  const trunkG = svg('g', {}, g);
  const defs = svg('defs', {}, trunkG);
  const grad = svg('linearGradient', { id: gradId, x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
  svg('stop', { offset: 0, 'stop-color': '#5a4c3e' }, grad);
  svg('stop', { offset: 0.55, 'stop-color': '#3a332c' }, grad);
  svg('stop', { offset: 1, 'stop-color': '#292420' }, grad);
  inkBranch(trunkG, spec.trunk, spec.trunkW, spec.trunkTop, `url(#${gradId})`);
  // 受光侧一道淡赭的皴笔，和深墨轮廓一浓一淡，树干就不像剪影了
  if (spec.shade) {
    svg('path', {
      d: spec.shade, fill: 'none', stroke: '#6e5c49', 'stroke-width': 12,
      'stroke-linecap': 'round', opacity: 0.3,
    }, trunkG);
  }
  for (const grain of spec.grains) {
    svg('path', { d: grain.d, fill: 'none', stroke: grain.c, 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.5 }, trunkG);
  }
  const makeBranch = (b) => {
    const bg = svg('g', {}, trunkG);
    inkBranch(bg, b.pts, b.w0, b.w1, INK_WOOD);
    for (const tw of b.twigs ?? []) inkBranch(bg, tw, 8, 4, INK_WOOD);
    const leaves = b.blobs.map(([p, r]) => leafBlob(bg, p, r));
    return { g: bg, origin: b.origin, leaves, set: (s) => scaleAt(bg, b.origin, s) };
  };
  const branches = spec.branches.map(makeBranch);
  return { g, base: spec.base, rootPaths, trunkG, branches };
}

// 左边这棵：高直挺拔，树冠向四面铺开
const TREE_A = {
  base: [282, 818],
  roots: [
    [[282, 812], [256, 842], [218, 868], [186, 878]],
    [[282, 812], [286, 850], [284, 882], [278, 898]],
    [[282, 812], [310, 840], [344, 862], [374, 870]],
  ],
  trunk: [[282, 818], [280, 700], [278, 562], [279, 462], [280, 382]],
  trunkW: 58,
  trunkTop: 24,
  shade: 'M262 792 C 259 690 257 560 259 470 C 260 432 262 412 265 398',
  grains: [
    { d: 'M272 780 C 269 690 268 600 269 470', c: '#5e5347' },
    { d: 'M291 750 C 290 670 289 580 290 470', c: '#241f1a' },
  ],
  branches: [
    {
      origin: [279, 470],
      pts: [[279, 470], [244, 436], [200, 386], [158, 330], [126, 276]],
      w0: 26, w1: 9,
      twigs: [[[200, 386], [176, 350], [154, 318]]],
      blobs: [[[128, 282], 80], [[186, 332], 48], [[226, 386], 40]],
    },
    {
      origin: [281, 448],
      pts: [[281, 448], [316, 418], [356, 366], [392, 312], [414,266]],
      w0: 26, w1: 9,
      twigs: [[[356, 366], [380, 330], [396, 298]]],
      blobs: [[[408, 258], 62], [[362, 318], 44]],
    },
    {
      origin: [280, 382],
      pts: [[280, 382], [280, 322], [279, 258], [279, 204], [279, 172]],
      w0: 22, w1: 8,
      twigs: [[[279, 300], [252, 262], [224, 216]], [[279, 300], [306, 264], [348, 220]]],
      blobs: [[[279, 174], 60], [[220, 212], 56], [[348, 218], 56]],
    },
  ],
};

// 右边这棵：矮一些、向右微倾，树冠圆圆的
const TREE_B = {
  base: [628, 820],
  roots: [
    [[628, 814], [602, 844], [566, 868], [538, 876]],
    [[628, 814], [634, 852], [634, 884], [630, 898]],
    [[628, 814], [656, 842], [688, 862], [716, 870]],
  ],
  trunk: [[628, 820], [636, 710], [646, 594], [654, 508], [658, 458]],
  trunkW: 50,
  trunkTop: 21,
  shade: 'M613 788 C 621 690 629 590 637 505 C 640 482 642 468 644 458',
  grains: [
    { d: 'M630 770 C 638 680 646 590 652 500', c: '#5e5347' },
    { d: 'M648 740 C 654 660 658 580 660 500', c: '#241f1a' },
  ],
  branches: [
    {
      origin: [648, 528],
      pts: [[648, 528], [612, 496], [574, 456], [540, 410], [514, 366]],
      w0: 24, w1: 8,
      twigs: [[[574, 456], [550, 422], [528, 392]]],
      // 最低的叶团收在 y 350 以上：别压到后面字形里右木的躯干
      blobs: [[[516, 344], 56], [[566, 416], 42]],
    },
    {
      origin: [654, 494],
      pts: [[654, 494], [688, 462], [718, 420], [742, 372], [758, 326]],
      w0: 24, w1: 8,
      blobs: [[[762, 332], 66], [[716, 398], 44]],
    },
    {
      origin: [658, 458],
      pts: [[658, 458], [662, 404], [666, 354], [668, 310]],
      w0: 22, w1: 8,
      twigs: [[[666, 352], [640, 318], [610, 286]], [[666, 352], [692, 320], [724, 290]]],
      blobs: [[[668, 312], 58], [[610, 300], 50], [[724, 296], 50]],
    },
  ],
};

const foldTree = (tree) => {
  scaleAt(tree.trunkG, tree.base, 0);
  for (const b of tree.branches) b.set(0);
  tree.rootPaths.forEach((g) => g.setAttribute('opacity', 0));
};
const straightenTree = (tree) => {
  for (const b of tree.branches) rotateAt(b.g, b.origin, 0);
};
// 一棵树从地里长出来：根钻出来、干长高，枝伸展开，叶一团团绽开
async function growTree(tree, check, f) {
  const rootsGrow = Promise.all(
    tree.rootPaths.map((g, i) =>
      wait(i * 90 * f, check).then(() =>
        tween(340 * f, (t) => {
          g.setAttribute('opacity', 1);
          scaleAt(g, tree.base, t);
        }, { easing: ease.out, check }),
      ),
    ),
  );
  const trunkGrow = tween(720 * f, (t) => scaleAt(tree.trunkG, tree.base, t), { easing: ease.bloom, check });
  await Promise.all([rootsGrow, trunkGrow]);
  await Promise.all(
    tree.branches.map((b, i) =>
      wait(i * 100 * f, check).then(() => tween(420 * f, (t) => b.set(t), { easing: ease.bloom, check })),
    ),
  );
  await Promise.all(
    tree.branches.flatMap((b) => b.leaves).map((leaf, i) =>
      wait(i * 45 * f, check).then(() => leaf.bloom(400 * f, check)),
    ),
  );
}

// 收尾时长出的小树苗：两棵大树中间，再冒出几棵小的——木多了，就长成一片林
const SAPLINGS = [
  { foot: [478, 816], top: [473, 748], lean: -6 },
  { foot: [548, 818], top: [552, 757], lean: 3 },
  { foot: [606, 816], top: [610, 761], lean: -2 },
];
function buildSapling(parent, s) {
  const g = svg('g', {}, parent);
  const mid = [lerp(s.foot[0], s.top[0], 0.5) + s.lean, lerp(s.foot[1], s.top[1], 0.5)];
  inkBranch(g, [s.foot, mid, s.top], 12, 5, '#4a4238');
  // 顶上的嫩叶用干净的颜色，不套水彩滤镜：要在淡淡的树影上看得清清楚楚
  for (const [dx, dy, rot] of [[-15, -7, -42], [1, -17, 2], [15, -5, 44]]) {
    svg('path', { d: LEAF_D, fill: '#8aab5c', opacity: 0.95, transform: `translate(${s.top[0] + dx} ${s.top[1] + dy}) rotate(${rot}) scale(0.78)` }, g);
  }
  return { g, foot: s.foot };
}

export function createTrees(pictureLayer, sceneryLayer) {
  const root = svg('g', { class: 'lin-trees-root', opacity: 0 }, pictureLayer);

  // 摸哪儿都算摸到树：罩住两棵树树冠和树干的透明形状
  const body = svg('g', {}, root);
  svg('ellipse', { cx: 280, cy: 292, rx: 200, ry: 168, fill: '#000', 'fill-opacity': 0 }, body);
  svg('rect', { x: 232, y: 284, width: 96, height: 546, rx: 46, fill: '#000', 'fill-opacity': 0 }, body);
  svg('ellipse', { cx: 648, cy: 344, rx: 182, ry: 158, fill: '#000', 'fill-opacity': 0 }, body);
  svg('rect', { x: 606, y: 336, width: 84, height: 492, rx: 40, fill: '#000', 'fill-opacity': 0 }, body);

  // 地面：只在两棵树的脚下各洇一小段坡，两树之间只留石头和几笔小草，
  // 再垫一道极淡的短影——不画贯穿的线，两树中间要透气
  const ground = svg('g', { opacity: 0 }, root);
  const GROUND_DS = [
    // 左树脚下
    { d: 'M236 818 C 262 812 296 818 332 814', op: 0.55 },
    // 右树脚下
    { d: 'M558 816 C 596 811 640 816 692 812', op: 0.55 },
    // 石头下面一道极淡的短影
    { d: 'M414 815 C 436 818 468 817 492 815', op: 0.22 },
  ];
  const groundLines = GROUND_DS.map(({ d, op }) =>
    svg('path', {
      d, fill: 'none', stroke: '#5a5347', 'stroke-width': 7, 'stroke-linecap': 'round',
      opacity: op, filter: 'url(#wash2)', pathLength: 1,
    }, ground)
  );
  const rock = svg('g', { opacity: 0 }, ground);
  svg('ellipse', { cx: 452, cy: 812, rx: 30, ry: 13, fill: '#6b635a', filter: 'url(#ink)' }, rock);
  svg('ellipse', { cx: 446, cy: 806, rx: 17, ry: 9, fill: '#7d756a', filter: 'url(#ink)' }, rock);
  for (const [gx, gy, f] of [[256, 816, 1], [326, 814, -1], [500, 814, 1], [576, 814, -1], [688, 812, 1], [812, 812, -1]]) {
    svg('path', {
      d: `M${gx} ${gy} q ${6 * f} -13 ${13 * f} -15 M${gx + 5} ${gy} q ${2 * f} -9 ${8 * f} -11`,
      fill: 'none', stroke: '#6b6353', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.5,
    }, ground);
  }

  const treeA = buildTree(root, 'lin-tree lin-tree-a', TREE_A, 'lin-trunk-a');
  const treeB = buildTree(root, 'lin-tree lin-tree-b', TREE_B, 'lin-trunk-b');
  foldTree(treeA);
  foldTree(treeB);

  // 收尾时长出的小树苗（独立于树影之外，保持鲜亮）
  const saplings = svg('g', { opacity: 0 }, pictureLayer);

  // 远处淡淡的树影：这片林子一直往两边长过去
  let scenery = null;
  const buildScenery = () => {
    sceneryLayer.replaceChildren();
    scenery = svg('g', { opacity: 0 }, sceneryLayer);
    const wash = svg('g', { filter: 'url(#mist-wash)', fill: '#3f4b50' }, scenery);
    distantTree(wash, 128, 794, 152, 0.13);
    distantTree(wash, 214, 802, 104, 0.1);
    distantTree(wash, 1188, 796, 126, 0.11);
    distantTree(wash, 1306, 790, 158, 0.14);
    distantTree(wash, 1428, 802, 96, 0.09);
    distantTree(wash, 1526, 794, 122, 0.12);
  };

  let pulseToken = 0;
  let fallingLeaves = null;

  // 一片小叶子从树冠里打着转飘下来
  const dropLeaf = (from) => {
    const leaf = svg('path', {
      d: LEAF_D, fill: '#7a9159', opacity: 0,
      transform: `translate(${from[0]} ${from[1]}) rotate(20)`,
    }, root);
    const token = pulseToken;
    tween(2100, (t) => {
      if (token !== pulseToken) return;
      const x = from[0] + 44 * Math.sin(t * Math.PI * 2.6 + from[0]) - 18 * t;
      const y = from[1] + (816 - from[1]) * t;
      leaf.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(t * 300 + 20).toFixed(0)}) scale(${1 - 0.3 * t})`);
      leaf.setAttribute('opacity', String(Math.min(1, t * 6) * (1 - Math.max(0, t - 0.82) * 5)));
    }).then(() => leaf.remove()).catch(() => leaf.remove());
    return leaf;
  };

  return {
    root,
    body,
    // 草坡洇开，左边的树先醒半拍，右边的树跟着一起长——一片林子是一起长的
    async appear(check, { fast = false } = {}) {
      const f = fast ? 0.4 : 1;
      root.setAttribute('opacity', 1);
      buildScenery();
      tween(2200 * f, (t) => scenery.setAttribute('opacity', t), { check }).catch(() => {});
      groundLines.forEach((line) => {
        line.setAttribute('stroke-dasharray', '1 1');
        line.setAttribute('stroke-dashoffset', 1);
      });
      ground.setAttribute('opacity', 1);
      rock.setAttribute('opacity', 0);
      await tween(420 * f, (t) => {
        for (const line of groundLines) line.setAttribute('stroke-dashoffset', String(1 - t));
      }, { check });
      const aGrow = growTree(treeA, check, f);
      await wait(400 * f, check);
      const bGrow = growTree(treeB, check, f);
      const rockShow = tween(700 * f, (t) => rock.setAttribute('opacity', t), { check });
      await Promise.all([aGrow, bGrow, rockShow]);
    },
    // 摸一下：风穿过林子，两棵树一先一后地摇，一边飘下一片小叶子
    async pulse() {
      const token = ++pulseToken;
      const alive = () => token === pulseToken;
      fallingLeaves?.forEach((l) => l.remove());
      fallingLeaves = [dropLeaf([226, 386]), dropLeaf([716, 398])];
      await tween(
        1100,
        (t) => {
          if (!alive()) return;
          const swing = Math.sin(t * Math.PI * 3) * (1 - t);
          for (const tree of [treeA, treeB]) {
            const dir = tree === treeA ? 1 : -1;
            const [bL, bR, bT] = tree.branches;
            rotateAt(bL.g, bL.origin, 4 * swing * dir);
            rotateAt(bR.g, bR.origin, -4 * swing * dir);
            rotateAt(bT.g, bT.origin, 2.5 * swing * dir);
            for (const b of tree.branches) {
              for (const leaf of b.leaves) leaf.set(1 + 0.07 * Math.sin(t * Math.PI * 4) * (1 - t));
            }
          }
        },
        { easing: ease.out },
      );
      if (!alive()) return;
      for (const tree of [treeA, treeB]) {
        straightenTree(tree);
        for (const b of tree.branches) for (const leaf of b.leaves) leaf.set(1);
      }
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity'));
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },
    // 写完字：树影在字后面重新长出来，两棵大树中间再冒出几棵小树苗
    async sprout(check) {
      saplings.setAttribute('opacity', 1);
      const grown = SAPLINGS.map((s) => {
        const { g, foot } = buildSapling(saplings, s);
        scaleAt(g, foot, 0);
        return { g, foot };
      });
      await Promise.all(
        grown.map(({ g, foot }, i) =>
          wait(200 + i * 240, check).then(() =>
            tween(720, (t) => scaleAt(g, foot, t), { easing: ease.bloom, check }),
          ),
        ),
      );
    },
    reset() {
      pulseToken++;
      fallingLeaves?.forEach((l) => l.remove());
      fallingLeaves = null;
      for (const tree of [treeA, treeB]) {
        straightenTree(tree);
        foldTree(tree);
        for (const b of tree.branches) {
          for (const leaf of b.leaves) {
            leaf.set(0);
            leaf.g.setAttribute('opacity', 0);
          }
        }
        tree.rootPaths.forEach((g) => {
          g.setAttribute('opacity', 0);
          scaleAt(g, tree.base, 0);
        });
      }
      ground.setAttribute('opacity', 0);
      groundLines.forEach((line) => {
        line.removeAttribute('stroke-dasharray');
        line.removeAttribute('stroke-dashoffset');
      });
      saplings.setAttribute('opacity', 0);
      saplings.replaceChildren();
      root.setAttribute('opacity', 0);
      sceneryLayer.replaceChildren();
      scenery = null;
    },
  };
}
