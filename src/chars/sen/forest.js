// 三棵水墨大树：中间一棵高树站在小坡上、站得稍远（叶色略淡），两边两棵大树一高一矮。
// 树脚正对着后来字形里三个「木」站立的位置：左木、右木在坡下，上木在中间高树的枝头里。
// 摸一下，三棵树一先一后地摇，各有一片小叶子飘下来，林间的雾也轻轻涌动。
// 远处层层密林的树影和雾放在背景层（layers.scenery，1600×1000 坐标），reset 时清理干净。
import { svg, tween, wait, lerp, ease } from '../../util.js';

// ---- 采样与笔触工具（同「木」「林」的技法，共享文件不能动）----
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
// 一簇叶：三层大小、深浅不同的圆叠出水彩的叶团；dim 把整团压淡（远处的树用它退到后面）
function leafBlob(parent, [cx, cy], r, dim = 1) {
  const g = svg('g', { opacity: 0 }, parent);
  for (const { fill, op, filter, dx, dy, k } of LEAF_GREENS) {
    svg('circle', { cx: cx + dx, cy: cy + dy, r: r * k, fill, opacity: op * dim, filter }, g);
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
      d: spec.shade, fill: 'none', stroke: '#6e5c49', 'stroke-width': 11,
      'stroke-linecap': 'round', opacity: 0.3,
    }, trunkG);
  }
  for (const grain of spec.grains) {
    svg('path', { d: grain.d, fill: 'none', stroke: grain.c, 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.5 }, trunkG);
  }
  const dim = spec.leafDim ?? 1;
  const makeBranch = (b) => {
    const bg = svg('g', {}, trunkG);
    inkBranch(bg, b.pts, b.w0, b.w1, INK_WOOD);
    for (const tw of b.twigs ?? []) inkBranch(bg, tw, 8, 4, INK_WOOD);
    const leaves = b.blobs.map(([p, r]) => leafBlob(bg, p, r, dim));
    return { g: bg, origin: b.origin, leaves, set: (s) => scaleAt(bg, b.origin, s) };
  };
  const branches = spec.branches.map(makeBranch);
  return { g, base: spec.base, rootPaths, trunkG, branches };
}

// 左边这棵：高直挺拔，树冠向四面铺开
const TREE_L = {
  base: [305, 818],
  roots: [
    [[305, 812], [278, 842], [240, 866], [206, 876]],
    [[305, 812], [309, 850], [307, 882], [301, 898]],
    [[305, 812], [332, 840], [366, 860], [396, 868]],
  ],
  trunk: [[305, 818], [303, 700], [301, 566], [302, 464], [303, 386]],
  trunkW: 54,
  trunkTop: 22,
  shade: 'M284 792 C 281 690 279 560 281 470 C 282 434 285 414 289 400',
  grains: [
    { d: 'M295 780 C 292 690 291 600 292 470', c: '#5e5347' },
    { d: 'M314 750 C 313 670 312 580 313 470', c: '#241f1a' },
  ],
  branches: [
    {
      origin: [302, 466],
      pts: [[302, 466], [268, 432], [226, 382], [188, 328], [160, 278]],
      w0: 25, w1: 9,
      twigs: [[[226, 382], [202, 346], [180, 316]]],
      blobs: [[[164, 282], 76], [[218, 330], 46], [[258, 384], 38]],
    },
    {
      origin: [302, 446],
      pts: [[302, 446], [338, 416], [374, 368], [400, 320], [418, 278]],
      w0: 25, w1: 9,
      twigs: [[[374, 368], [398, 332], [414, 302]]],
      blobs: [[[420, 272], 60], [[378, 328], 42]],
    },
    {
      origin: [303, 386],
      pts: [[303, 386], [303, 326], [302, 262], [302, 208], [302, 174]],
      w0: 21, w1: 8,
      twigs: [[[302, 302], [276, 264], [248, 220]], [[302, 302], [328, 266], [368, 222]]],
      blobs: [[[302, 176], 58], [[246, 214], 54], [[366, 220], 54]],
    },
  ],
};

// 右边这棵：矮一些、向右微倾，树冠圆圆的
const TREE_R = {
  base: [630, 820],
  roots: [
    [[630, 814], [604, 844], [568, 866], [538, 874]],
    [[630, 814], [636, 852], [636, 884], [632, 898]],
    [[630, 814], [658, 842], [690, 862], [718, 870]],
  ],
  trunk: [[630, 820], [638, 710], [648, 594], [656, 508], [660, 458]],
  trunkW: 48,
  trunkTop: 20,
  shade: 'M615 788 C 623 690 631 590 639 505 C 642 482 644 468 646 458',
  grains: [
    { d: 'M632 770 C 640 680 648 590 654 500', c: '#5e5347' },
    { d: 'M650 740 C 656 660 660 580 662 500', c: '#241f1a' },
  ],
  branches: [
    {
      origin: [650, 528],
      pts: [[650, 528], [614, 496], [578, 456], [546, 412], [522, 368]],
      w0: 23, w1: 8,
      twigs: [[[578, 456], [554, 422], [532, 392]]],
      // 最低的叶团收在 y 350 以上：别压到后面字形里上木的枝
      blobs: [[[524, 344], 56], [[572, 416], 42]],
    },
    {
      origin: [656, 494],
      pts: [[656, 494], [690, 462], [720, 420], [744, 372], [760, 326]],
      w0: 23, w1: 8,
      blobs: [[[764, 332], 64], [[718, 398], 44]],
    },
    {
      origin: [660, 458],
      pts: [[660, 458], [664, 406], [668, 356], [670, 312]],
      w0: 21, w1: 8,
      twigs: [[[668, 354], [642, 320], [612, 288]], [[668, 354], [694, 322], [726, 292]]],
      blobs: [[[670, 308], 56], [[612, 296], 48], [[726, 292], 48]],
    },
  ],
};

// 中间这棵：站得稍远、站在小坡上，细细高高，树冠伸到两棵大树的枝头上方——
// 正是字形里上木待着的地方
const TREE_T = {
  base: [480, 808],
  leafDim: 0.78,
  roots: [
    [[480, 802], [458, 824], [432, 842], [410, 850]],
    [[480, 802], [484, 832], [486, 858], [482, 874]],
    [[480, 802], [504, 824], [530, 840], [552, 848]],
  ],
  trunk: [[480, 808], [476, 700], [472, 578], [472, 482], [474, 420]],
  trunkW: 38,
  trunkTop: 16,
  shade: 'M468 786 C 465 690 462 572 463 484 C 464 452 467 436 471 426',
  grains: [
    { d: 'M472 776 C 470 690 468 600 469 490', c: '#5e5347' },
    { d: 'M484 744 C 484 664 485 580 486 492', c: '#241f1a' },
  ],
  branches: [
    {
      origin: [472, 498],
      pts: [[472, 498], [440, 468], [402, 428], [368, 386], [344, 346]],
      w0: 18, w1: 7,
      twigs: [[[402, 428], [378, 396], [356, 366]]],
      blobs: [[[340, 336], 52], [[392, 394], 36]],
    },
    {
      origin: [473, 466],
      pts: [[473, 466], [508, 438], [542, 400], [570, 360], [588, 320]],
      w0: 18, w1: 7,
      twigs: [[[542, 400], [566, 368], [584, 338]]],
      blobs: [[[592, 312], 52], [[544, 382], 36]],
    },
    {
      origin: [474, 420],
      pts: [[474, 420], [472, 360], [470, 300], [470, 248], [470, 210]],
      w0: 16, w1: 6,
      // 顶上的两根小枝伸向左右两侧的叶团，把高高的树冠连成一片
      twigs: [[[470, 292], [446, 258], [420, 226]], [[470, 292], [494, 258], [522, 226]]],
      blobs: [[[470, 200], 52], [[420, 226], 42], [[522, 226], 42]],
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

// 收尾时长出的小树苗：大树之间、坡下，再冒出一棵棵小的——木越添越多，长成森林
const SAPLINGS = [
  { foot: [185, 814], top: [180, 748], lean: -5 },
  { foot: [255, 816], top: [259, 758], lean: 4 },
  { foot: [438, 820], top: [434, 762], lean: -3 },
  { foot: [600, 818], top: [604, 757], lean: 3 },
  { foot: [725, 816], top: [720, 750], lean: -4 },
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

export function createForest(pictureLayer, sceneryLayer) {
  const root = svg('g', { class: 'sen-forest-root', opacity: 0 }, pictureLayer);

  // 摸哪儿都算摸到树：罩住三棵树树冠和树干的透明形状
  const body = svg('g', {}, root);
  svg('ellipse', { cx: 290, cy: 298, rx: 180, ry: 170, fill: '#000', 'fill-opacity': 0 }, body);
  svg('rect', { x: 272, y: 290, width: 62, height: 530, rx: 30, fill: '#000', 'fill-opacity': 0 }, body);
  svg('ellipse', { cx: 660, cy: 356, rx: 170, ry: 156, fill: '#000', 'fill-opacity': 0 }, body);
  svg('rect', { x: 634, y: 348, width: 54, height: 474, rx: 26, fill: '#000', 'fill-opacity': 0 }, body);
  svg('ellipse', { cx: 470, cy: 272, rx: 168, ry: 158, fill: '#000', 'fill-opacity': 0 }, body);
  svg('rect', { x: 452, y: 264, width: 38, height: 546, rx: 19, fill: '#000', 'fill-opacity': 0 }, body);

  // 地面：只在三棵树的脚下各洇一小段坡，中间高树的坡略高（站得远些）；
  // 两颗小石头、几笔小草——不画贯穿的线，林子中间要透气
  const ground = svg('g', { opacity: 0 }, root);
  const GROUND_DS = [
    // 左树脚下
    { d: 'M240 818 C 268 812 306 818 356 814', op: 0.55 },
    // 高树的坡
    { d: 'M420 812 C 448 805 512 805 546 812', op: 0.5 },
    // 右树脚下
    { d: 'M562 818 C 598 813 642 818 700 814', op: 0.55 },
  ];
  const groundLines = GROUND_DS.map(({ d, op }) =>
    svg('path', {
      d, fill: 'none', stroke: '#5a5347', 'stroke-width': 7, 'stroke-linecap': 'round',
      opacity: op, filter: 'url(#wash2)', pathLength: 1,
    }, ground)
  );
  const rocks = svg('g', { opacity: 0 }, ground);
  // 石头贴着树根放：深浅两瓣错位叠出体积，再点一道受光的淡赭，别像墨斑
  const rock = (x, y, s) => {
    svg('ellipse', { cx: x, cy: y, rx: 24 * s, ry: 10 * s, fill: '#5d554c', filter: 'url(#ink)' }, rocks);
    svg('ellipse', { cx: x - 8 * s, cy: y - 6 * s, rx: 14 * s, ry: 7 * s, fill: '#7d756a', filter: 'url(#ink)' }, rocks);
    svg('path', {
      d: `M${x - 16 * s} ${y - 8 * s} q ${10 * s} ${-5 * s} ${22 * s} ${-2 * s}`, fill: 'none',
      stroke: '#93887a', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.55,
    }, rocks);
  };
  rock(352, 814, 1);
  rock(568, 815, 0.8);
  for (const [gx, gy, f] of [[262, 816, 1], [352, 814, -1], [432, 810, 1], [536, 810, -1], [704, 814, 1]]) {
    svg('path', {
      d: `M${gx} ${gy} q ${6 * f} -13 ${13 * f} -15 M${gx + 5} ${gy} q ${2 * f} -9 ${8 * f} -11`,
      fill: 'none', stroke: '#6b6353', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.5,
    }, ground);
  }

  // 三棵树：中间高树先落笔（站得远、被两棵大树掩着），左右两棵大树压在前面
  const treeT = buildTree(root, 'sen-tree sen-tree-t', TREE_T, 'sen-trunk-t');
  const treeL = buildTree(root, 'sen-tree sen-tree-l', TREE_L, 'sen-trunk-l');
  const treeR = buildTree(root, 'sen-tree sen-tree-r', TREE_R, 'sen-trunk-r');
  for (const t of [treeT, treeL, treeR]) foldTree(t);

  // 收尾时长出的小树苗（独立于树影之外，保持鲜亮）
  const saplings = svg('g', { opacity: 0 }, pictureLayer);

  // 远处层层密林和林间的雾：这片林子一直往两边长过去、望不到边
  let scenery = null;
  let fogG = null;
  const buildScenery = () => {
    sceneryLayer.replaceChildren();
    scenery = svg('g', { opacity: 0 }, sceneryLayer);
    // 远远一层更淡的树影
    const far = svg('g', { filter: 'url(#mist-wash)', fill: '#46545a' }, scenery);
    distantTree(far, 92, 776, 128, 0.07);
    distantTree(far, 200, 770, 98, 0.05);
    distantTree(far, 296, 778, 118, 0.06);
    distantTree(far, 396, 772, 92, 0.05);
    distantTree(far, 470, 780, 108, 0.06);
    distantTree(far, 556, 774, 88, 0.05);
    distantTree(far, 648, 778, 112, 0.06);
    distantTree(far, 742, 772, 94, 0.05);
    distantTree(far, 838, 778, 116, 0.06);
    distantTree(far, 948, 774, 100, 0.05);
    distantTree(far, 1042, 778, 126, 0.06);
    distantTree(far, 1152, 772, 96, 0.05);
    distantTree(far, 1248, 778, 118, 0.06);
    distantTree(far, 1358, 774, 94, 0.05);
    distantTree(far, 1458, 780, 122, 0.06);
    distantTree(far, 1548, 774, 100, 0.05);
    // 近一些的树影
    const near = svg('g', { filter: 'url(#mist-wash)', fill: '#3f4b50' }, scenery);
    distantTree(near, 150, 800, 148, 0.13);
    distantTree(near, 316, 804, 108, 0.1);
    distantTree(near, 520, 798, 130, 0.11);
    distantTree(near, 702, 802, 118, 0.1);
    distantTree(near, 888, 796, 154, 0.13);
    distantTree(near, 1078, 802, 112, 0.1);
    distantTree(near, 1262, 798, 158, 0.14);
    distantTree(near, 1450, 804, 118, 0.1);
    // 林间的雾：落在近处树影脚下的洼地里，几团淡淡的暖白高高低低、断断续续——
    // 千万不能连成一条横贯的带子（波 1 评审打回过场景中部突兀的灰色横线）
    fogG = svg('g', { filter: 'url(#wash2)', fill: '#f2ead9' }, scenery);
    svg('ellipse', { cx: 260, cy: 790, rx: 170, ry: 30, opacity: 0.13 }, fogG);
    svg('ellipse', { cx: 660, cy: 812, rx: 150, ry: 26, opacity: 0.1 }, fogG);
    svg('ellipse', { cx: 1060, cy: 786, rx: 160, ry: 28, opacity: 0.12 }, fogG);
    svg('ellipse', { cx: 1400, cy: 806, rx: 150, ry: 26, opacity: 0.1 }, fogG);
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
    // 坡洇开，左右两棵大树一先一后长起来，最后中间的高树从林子里冒出头来
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
      rocks.setAttribute('opacity', 0);
      await tween(420 * f, (t) => {
        for (const line of groundLines) line.setAttribute('stroke-dashoffset', String(1 - t));
      }, { check });
      const lGrow = growTree(treeL, check, f);
      await wait(380 * f, check);
      const rGrow = growTree(treeR, check, f);
      await wait(420 * f, check);
      const tGrow = growTree(treeT, check, f);
      const rockShow = tween(700 * f, (t) => rocks.setAttribute('opacity', t), { check });
      await Promise.all([lGrow, rGrow, tGrow, rockShow]);
    },
    // 摸一下：风穿过林子，三棵树一先一后地摇，一边飘下小叶子，林间的雾轻轻涌动
    async pulse() {
      const token = ++pulseToken;
      const alive = () => token === pulseToken;
      fallingLeaves?.forEach((l) => l.remove());
      fallingLeaves = [dropLeaf([222, 322]), dropLeaf([718, 330]), dropLeaf([470, 200])];
      // 三棵树相位错开半拍，像风从左往右穿过林子
      const phaseOf = (tree) => (tree === treeL ? 0 : tree === treeR ? 0.55 : 1.1);
      await tween(
        1200,
        (t, p) => {
          if (!alive()) return;
          for (const tree of [treeL, treeR, treeT]) {
            const ph = phaseOf(tree);
            const lag = Math.min(1, Math.max(0, (p - ph * 0.16) / (1 - ph * 0.16)));
            const swing = Math.sin(lag * Math.PI * 3) * (1 - lag);
            const dir = tree === treeR ? -1 : 1;
            const [bL, bR, bT] = tree.branches;
            rotateAt(bL.g, bL.origin, 4 * swing * dir);
            rotateAt(bR.g, bR.origin, -4 * swing * dir);
            rotateAt(bT.g, bT.origin, 2.5 * swing * dir);
            for (const b of tree.branches) {
              for (const leaf of b.leaves) leaf.set(1 + 0.07 * Math.sin(lag * Math.PI * 4) * (1 - lag));
            }
          }
          fogG?.setAttribute('transform', `translate(${(9 * Math.sin(p * Math.PI * 2) * (1 - p)).toFixed(1)} 0)`);
        },
        { easing: ease.out },
      );
      if (!alive()) return;
      for (const tree of [treeL, treeR, treeT]) {
        straightenTree(tree);
        for (const b of tree.branches) for (const leaf of b.leaves) leaf.set(1);
      }
      fogG?.setAttribute('transform', '');
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity'));
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },
    // 写完字：树影在字后面重新长出来，大树之间再冒出一棵棵小树苗——木越添越多，就是森林
    async sprout(check) {
      saplings.setAttribute('opacity', 1);
      const grown = SAPLINGS.map((s) => {
        const { g, foot } = buildSapling(saplings, s);
        scaleAt(g, foot, 0);
        return { g, foot };
      });
      await Promise.all(
        grown.map(({ g, foot }, i) =>
          wait(200 + i * 220, check).then(() =>
            tween(720, (t) => scaleAt(g, foot, t), { easing: ease.bloom, check }),
          ),
        ),
      );
    },
    reset() {
      pulseToken++;
      fallingLeaves?.forEach((l) => l.remove());
      fallingLeaves = null;
      for (const tree of [treeT, treeL, treeR]) {
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
      fogG = null;
    },
  };
}
