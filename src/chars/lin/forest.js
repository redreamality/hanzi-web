// 「林」：两棵水墨树挨在一起的小树林 → 甲骨文（两棵刻出来的树）→ 小篆（两棵弯弧线的树）。
// 画法和 src/chars/mu/tree.js 同一路数：锥形枝干 + 水彩叶团 + 远处淡树影。
// 远处的淡树影放在背景层（layers.scenery，1600×1000 坐标）。
import { svg, tween, wait, lerp, ease } from '../../util.js';

// 一棵「单位树」（中心 512、树脚 812）按 base/s 缩放平移后的坐标
const at = (base, s) => (p) => [base[0] + (p[0] - 512) * s, base[1] + (p[1] - 812) * s];

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

// 沿点列的锥形闭合路径：根粗梢细，两头积一点墨
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

const INK_WOOD = '#3a332c';

// 一棵树：树干、三根主枝、叶团。unit 坐标（中心 512、树脚 812）经 T 映射到屏幕。
function makeTree(parent, base, s, cssClass) {
  const T = at(base, s);
  const g = svg('g', { class: `lin-tree ${cssClass}` }, parent);
  const trunkG = svg('g', {}, g);

  const trunkPts = [[512, 812], [511, 700], [510, 566], [511, 470], [512, 392]].map(T);
  inkBranch(trunkG, trunkPts, 60 * s, 25 * s, INK_WOOD);
  // 树干上两道一深一浅的纹理
  const tTf = `translate(${(base[0] - 512 * s).toFixed(1)} ${(base[1] - 812 * s).toFixed(1)}) scale(${s})`;
  svg('path', {
    d: 'M503 780 C 500 690 499 600 500 470', fill: 'none', stroke: '#5e5347',
    'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.5,
    transform: tTf,
  }, trunkG);
  svg('path', {
    d: 'M522 760 C 521 680 520 590 521 480', fill: 'none', stroke: '#241f1a',
    'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.5,
    transform: tTf,
  }, trunkG);

  const makeBranch = (origin, pts, w0, w1, twigs, blobs) => {
    const bg = svg('g', {}, trunkG);
    inkBranch(bg, pts.map(T), w0 * s, w1 * s, INK_WOOD);
    for (const tw of twigs) inkBranch(bg, tw.map(T), 8 * s, 4 * s, INK_WOOD);
    const leaves = blobs.map(([p, r]) => leafBlob(bg, T(p), r * s));
    return { g: bg, origin: T(origin), leaves, set: (k) => scaleAt(bg, T(origin), k) };
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
    [[[511, 302], [486, 262], [456, 214]], [[511, 302], [536, 264], [580, 218]]],
    [[[511, 170], 62], [[452, 208], 58], [[586, 212], 58]],
  );
  const branches = [branchL, branchR, topBranch];
  return { g, trunkG, base, branches };
}

// 远处一棵淡淡的树影（背景坐标）
function distantTree(parent, x, baseY, h, op) {
  const g = svg('g', { fill: '#3f4b50', opacity: op }, parent);
  svg('rect', { x: x - h * 0.03, y: baseY - h * 0.42, width: h * 0.06, height: h * 0.44, rx: h * 0.02 }, g);
  svg('ellipse', { cx: x, cy: baseY - h * 0.58, rx: h * 0.26, ry: h * 0.26 }, g);
  svg('ellipse', { cx: x - h * 0.14, cy: baseY - h * 0.4, rx: h * 0.17, ry: h * 0.15 }, g);
  svg('ellipse', { cx: x + h * 0.15, cy: baseY - h * 0.42, rx: h * 0.15, ry: h * 0.14 }, g);
}

// 收尾时长出的新叶位置（单位树坐标 → 屏幕）
const NEW_LEAF_SPOTS = [
  [[352, 262], -18], [[392, 300], 24], [[676, 292], 160], [[508, 176], -8],
  [[548, 210], 150], [[448, 380], -30], [[600, 372], 20], [[452, 214], -90],
];
const LEAF_D = 'M-14 0 C -6 -7 6 -7 14 0 C 6 7 -6 7 -14 0 Z';

export function createForest(pictureLayer, sceneryLayer) {
  const root = svg('g', { class: 'lin-forest-root', opacity: 0 }, pictureLayer);

  // 摸哪儿都算摸到树：罩住整片树林的透明形状
  const body = svg('g', {}, root);
  // 含两树之间的空隙：点 bbox 中心（空隙处）也要能摸到，事件必须落进 body
  svg('rect', { x: 38, y: 207, width: 889, height: 683, fill: '#000', 'fill-opacity': 0 }, body);
  for (const [cx, cy, rx, ry] of [[250, 377, 212, 153], [688, 379, 239, 172]]) {
    svg('ellipse', { cx, cy, rx, ry, fill: '#000', 'fill-opacity': 0 }, body);
  }
  for (const [x, y, w, h] of [[211, 369, 78, 485], [644, 343, 88, 547]]) {
    svg('rect', { x, y, width: w, height: h, rx: 30, fill: '#000', 'fill-opacity': 0 }, body);
  }

  // 地面：一道淡墨，几笔小草
  const ground = svg('g', { opacity: 0 }, root);
  const groundLine = svg('path', {
    d: 'M140 820 C 260 812 380 818 512 815 C 660 811 780 819 892 813',
    fill: 'none', stroke: '#5a5347', 'stroke-width': 7, 'stroke-linecap': 'round',
    opacity: 0.55, filter: 'url(#wash2)', pathLength: 1,
  }, ground);
  for (const [gx, gy, f] of [[168, 818, 1], [512, 820, 1], [866, 815, -1], [352, 816, 1]]) {
    svg('path', {
      d: `M${gx} ${gy} q ${6 * f} -14 ${13 * f} -16 M${gx + 5} ${gy} q ${2 * f} -10 ${8 * f} -12`,
      fill: 'none', stroke: '#6b6353', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.5,
    }, ground);
  }

  // 左边矮一点、右边高一点的两棵树
  const trees = [
    makeTree(root, [250, 808], 0.78, 'lin-tree-l'),
    makeTree(root, [688, 812], 0.88, 'lin-tree-r'),
  ];
  for (const t of trees) {
    const s = t.base === trees[0].base ? 0.78 : 0.88;
    t.rootPaths = [
      [[512, 806], [488, 838], [448, 866], [420, 874]],
      [[512, 806], [516, 846], [514, 880], [508, 898]],
      [[512, 806], [540, 836], [576, 858], [606, 868]],
    ].map((pts) => {
      const g = svg('g', { opacity: 0 }, t.trunkG);
      inkBranch(g, pts.map(at(t.base, s)), 17 * s, 7 * s, INK_WOOD);
      return g;
    });
  }

  // 收尾时长出的新叶：独立于树影之外
  const newLeaves = svg('g', { opacity: 0 }, pictureLayer);

  // 远处淡淡的树影
  let scenery = null;
  const buildScenery = () => {
    sceneryLayer.replaceChildren();
    scenery = svg('g', { opacity: 0 }, sceneryLayer);
    const wash = svg('g', { filter: 'url(#mist-wash)', fill: '#3f4b50' }, scenery);
    distantTree(wash, 92, 796, 140, 0.13);
    distantTree(wash, 178, 802, 100, 0.1);
    distantTree(wash, 986, 798, 122, 0.11);
    distantTree(wash, 1078, 792, 152, 0.14);
    distantTree(wash, 1170, 804, 96, 0.09);
  };

  // 各部分收着，等 appear 一样样长出来
  const fold = () => {
    for (const t of trees) {
      scaleAt(t.trunkG, t.base, 0);
      for (const b of t.branches) b.set(0);
      t.rootPaths.forEach((g) => g.setAttribute('opacity', 0));
    }
  };
  fold();
  let pulseToken = 0;
  let fallingLeaf = null;

  return {
    root,
    body,
    // 小树林慢慢长出来：地面洇开 → 根钻出来 → 两棵干一前一后长高 → 枝伸展 → 叶绽开
    async appear(check, { fast = false } = {}) {
      const f = fast ? 0.4 : 1;
      root.setAttribute('opacity', 1);
      buildScenery();
      tween(2200 * f, (t) => scenery.setAttribute('opacity', t), { check }).catch(() => {});
      groundLine.setAttribute('stroke-dasharray', '1 1');
      groundLine.setAttribute('stroke-dashoffset', 1);
      ground.setAttribute('opacity', 1);
      await tween(500 * f, (t) => groundLine.setAttribute('stroke-dashoffset', String(1 - t)), { check });
      const grow = (t, i) =>
        wait(i * 350 * f, check).then(async () => {
          const s = t === trees[0] ? 0.78 : 0.88;
          const rootsGrow = Promise.all(
            t.rootPaths.map((g, ri) =>
              wait(ri * 100 * f, check).then(() =>
                tween(340 * f, (k) => {
                  g.setAttribute('opacity', 1);
                  scaleAt(g, at(t.base, s)([512, 806]), k);
                }, { easing: ease.out, check }),
              ),
            ),
          );
          await Promise.all([
            rootsGrow,
            tween(760 * f, (k) => scaleAt(t.trunkG, t.base, k), { easing: ease.bloom, check }),
          ]);
          await Promise.all(
            t.branches.map((b, bi) =>
              wait(bi * 110 * f, check).then(() => tween(420 * f, (k) => b.set(k), { easing: ease.bloom, check })),
            ),
          );
        });
      await Promise.all(trees.map((t, i) => grow(t, i)));
      const allLeaves = trees.flatMap((t) => t.branches.flatMap((b) => b.leaves));
      await Promise.all(
        allLeaves.map((leaf, i) => wait((i % 9) * 60 * f, check).then(() => leaf.bloom(440 * f, check))),
      );
    },
    // 摸一下：风穿过树梢，两棵树错开摇一摇，一片小叶子打着转飘下来
    async pulse() {
      const token = ++pulseToken;
      const alive = () => token === pulseToken;
      if (fallingLeaf) fallingLeaf.remove();
      const src = trees[1];
      fallingLeaf = svg('path', {
        d: LEAF_D, fill: '#7a9159', opacity: 0,
        transform: `translate(${src.base[0] - 150} ${src.base[1] - 430}) rotate(20)`,
      }, root);
      await tween(
        1100,
        (t) => {
          if (!alive()) return;
          trees.forEach((tr, i) => {
            const swing = Math.sin(t * Math.PI * 3 + i * 0.7) * (1 - t);
            for (const b of tr.branches) rotateAt(b.g, b.origin, (i ? -4 : 4) * 0.7 * swing * (b === tr.branches[0] ? 1 : 0.8));
            for (const leaf of tr.branches.flatMap((x) => x.leaves)) leaf.set(1 + 0.07 * Math.sin(t * Math.PI * 4 + i) * (1 - t));
          });
        },
        { easing: ease.out },
      );
      if (!alive()) return;
      for (const tr of trees) {
        for (const b of tr.branches) {
          rotateAt(b.g, b.origin, 0);
          for (const leaf of b.leaves) leaf.set(1);
        }
      }
      const leaf = fallingLeaf;
      const x0 = src.base[0] - 150;
      const y0 = src.base[1] - 430;
      await tween(2000, (t) => {
        if (!alive()) return;
        const x = x0 + 46 * Math.sin(t * Math.PI * 2.6) - 20 * t;
        const y = y0 + 470 * t;
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
    // 写完字：树影在字后面重新长出来，两棵树的枝头再冒出几片嫩绿的新叶
    async sprout(check) {
      newLeaves.setAttribute('opacity', 1);
      const spots = trees.flatMap((t, i) =>
        NEW_LEAF_SPOTS.map(([p, rot]) => {
          const T = at(t.base, i ? 0.88 : 0.78);
          const [x, y] = T(p);
          const g = svg('g', {}, newLeaves);
          const atf = `translate(${x} ${y}) rotate(${rot}) scale(${i ? 0.9 : 0.8})`;
          svg('path', { d: LEAF_D, fill: '#8aab5c', opacity: 0.95, transform: atf }, g);
          svg('path', { d: 'M14 0 C 6 -7 -6 -7 -14 0 C -6 2 6 2 14 0 Z', fill: '#5f7d4d', opacity: 0.8, transform: atf }, g);
          return { g, p: [x, y] };
        }),
      );
      await Promise.all(
        spots.map(({ g, p }, i) =>
          wait(180 + i * 90, check).then(() =>
            tween(640, (t) => {
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
      for (const t of trees) {
        for (const b of t.branches) {
          rotateAt(b.g, b.origin, 0);
          b.set(0);
          for (const leaf of b.leaves) {
            leaf.set(0);
            leaf.g.setAttribute('opacity', 0);
          }
        }
        scaleAt(t.trunkG, t.base, 0);
        t.rootPaths.forEach((g) => {
          g.setAttribute('opacity', 0);
          scaleAt(g, at(t.base, t === trees[0] ? 0.78 : 0.88)([512, 806]), 0);
        });
      }
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
