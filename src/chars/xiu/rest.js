// 「休」的实物画面：一棵水墨大树，一个走路走累了的小人从左边走进来，
// 走到树旁坐下，靠着树干歇脚；一片小叶子飘下来，落在他的头上。
// 摸一下：树枝轻轻摇，小人舒舒服服地晃一晃。
// 小人和字形的「人」是同样两条笔画（身、腿），交给字形变形起笔用。
// 远处淡淡的树影和一轮暖日放在背景层（layers.scenery，1600×1000 坐标）。
import { svg, tween, wait, lerp, ease } from '../../util.js';
import { makeStroke, strokePath } from './ribbon.js';

const BASE = [580, 812]; // 树站立的地方（和字形里树的树干对齐，刻出骨架时不错位）
const SIT_AT = [560, 806]; // 小人坐下时脚下的原点

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

// ---- 小人：圆头、躯干、手臂、两条腿，深墨勾勒加淡墨晕染 ----
// 走路用「髋部原点」的局部坐标加平移；坐姿直接用屏幕绝对坐标（在树的左侧，背轻靠树干）。
const WALK_Y = 660; // 走路时髋部的高度
const SIT_AXLE = [503, 738]; // 坐定后臀部（摸一下时以这里为轴晃）

// 站姿/走路姿势（面向右）：头、躯干、垂着的手臂、迈前和蹬后的两条腿
const WALK = {
  head: [6, -268],
  torso: { a: [[6, -240], [1, -160], [3, -85], [10, -22]], w: [[0, 52], [1, 58]] },
  arm: { a: [[8, -195], [30, -120], [20, -52]], w: [[0, 24], [1, 17]] },
  legF: { a: [[8, -45], [58, 18], [64, 92], [58, 146]], w: [[0, 30], [0.5, 24], [1, 20]] },
  legB: { a: [[8, -45], [-44, 14], [-60, 84], [-66, 140]], w: [[0, 30], [0.5, 24], [1, 20]] },
};
// 坐姿（屏幕坐标）：头微仰，背朝树干方向微倾但留出干净的一窄条纸面，手臂搭在膝上，两条屈腿落地
const SIT = {
  head: [498, 468],
  torso: { a: [[502, 502], [494, 592], [498, 682], [508, 738]], w: [[0, 56], [0.5, 62], [1, 50]] },
  arm: { a: [[502, 556], [477, 622], [458, 670]], w: [[0, 26], [1, 18]] },
  legA: { a: [[504, 730], [460, 690], [416, 672], [406, 796]], w: [[0, 34], [0.5, 26], [1, 22]] },
  legB: { a: [[504, 736], [476, 706], [452, 692], [446, 802]], w: [[0, 30], [0.5, 24], [1, 20]] },
};
const HEAD_AT = [498, 436]; // 坐定后头顶上方（叶子落这里）

// 姿势之间插值：头取中点，每个部件的锚点和宽度逐点插值
function mixPose(a, b, t) {
  const mixPart = (pa, pb) => ({
    a: pa.a.map((p, i) => [lerp(p[0], pb.a[i][0], t), lerp(p[1], pb.a[i][1], t)]),
    w: pa.w.map(([s, v], i) => [lerp(s, pb.w[i][0], t), lerp(v, pb.w[i][1], t)]),
  });
  return {
    head: [lerp(a.head[0], b.head[0], t), lerp(a.head[1], b.head[1], t)],
    torso: mixPart(a.torso, b.torso),
    arm: mixPart(a.arm, b.arm),
    legA: mixPart(a.legA, b.legA),
    legB: mixPart(a.legB, b.legB),
  };
}
// 把局部坐标的姿势平移成屏幕坐标（用于坐下过渡的起点）
function poseAt(p, [dx, dy]) {
  return {
    head: [p.head[0] + dx, p.head[1] + dy],
    torso: { a: p.torso.a.map(([x, y]) => [x + dx, y + dy]), w: p.torso.w },
    arm: { a: p.arm.a.map(([x, y]) => [x + dx, y + dy]), w: p.arm.w },
    legA: { a: p.legA.a.map(([x, y]) => [x + dx, y + dy]), w: p.legA.w },
    legB: { a: p.legB.a.map(([x, y]) => [x + dx, y + dy]), w: p.legB.w },
  };
}
// 走路的某一帧（swing 在 -1..1：腿一前一后来回摆，手臂和身子跟着晃）
function stride(swing) {
  const k = (swing + 1) / 2;
  const swap = (f, b) => ({ a: f.a.map((p, i) => [lerp(b.a[i][0], f.a[i][0], k), lerp(b.a[i][1], f.a[i][1], k)]), w: f.w });
  return {
    head: [WALK.head[0] + swing * 4, WALK.head[1]],
    torso: { ...WALK.torso, a: WALK.torso.a.map(([x, y]) => [x + swing * 4, y]) },
    arm: { ...WALK.arm, a: WALK.arm.a.map(([x, y], i) => [x - swing * (i === 2 ? 16 : 8), y]) },
    legA: swap(WALK.legF, WALK.legB),
    legB: swap(WALK.legB, WALK.legF),
  };
}
const STANDPOSE = stride(0);

export function createRest(pictureLayer, sceneryLayer) {
  const root = svg('g', { class: 'xiu-rest', opacity: 0 }, pictureLayer);

  // 摸哪儿都算摸到：罩住树冠、树干和坐着的小人的透明形状
  const body = svg('g', {}, root);
  svg('ellipse', { cx: 578, cy: 300, rx: 280, ry: 195, fill: '#000', 'fill-opacity': 0 }, body);
  svg('rect', { x: 536, y: 300, width: 92, height: 520, rx: 44, fill: '#000', 'fill-opacity': 0 }, body);
  svg('ellipse', { cx: 415, cy: 640, rx: 300, ry: 250, fill: '#000', 'fill-opacity': 0 }, body);

  // 地面：一道淡墨，几笔小草
  const ground = svg('g', { opacity: 0 }, root);
  const groundLine = svg('path', {
    d: 'M320 815 C 430 808 540 812 640 808 C 740 812 830 806 890 810',
    fill: 'none', stroke: '#5a5347', 'stroke-width': 6, 'stroke-linecap': 'round',
    opacity: 0.45, filter: 'url(#wash2)', pathLength: 1,
  }, ground);
  for (const [gx, gy, f] of [[360, 812, 1], [704, 808, -1], [838, 810, 1]]) {
    svg('path', {
      d: `M${gx} ${gy} q ${6 * f} -14 ${13 * f} -16 M${gx + 5} ${gy} q ${2 * f} -10 ${8 * f} -12`,
      fill: 'none', stroke: '#6b6353', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.5,
    }, ground);
  }

  const tree = svg('g', { class: 'xiu-tree' }, root);

  // 树根：露出地面的三条
  const roots = svg('g', {}, tree);
  const rootPaths = [
    [[580, 812], [548, 842], [508, 860], [474, 868]],
    [[580, 812], [608, 840], [640, 856], [670, 864]],
    [[580, 812], [584, 848], [582, 880]],
  ].map((pts) => inkBranch(roots, pts, 17, 7, '#3a332c'));

  // 树干和大小树枝（先整体从地面长高，再一根根伸展开）
  const trunkG = svg('g', {}, tree);
  inkBranch(trunkG, [[580, 815], [573, 700], [576, 565], [580, 470], [582, 400]], 62, 26, '#3a332c');
  svg('path', {
    d: 'M571 782 C 566 700 565 620 566 480', fill: 'none', stroke: '#5e5347',
    'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.5,
  }, trunkG);
  svg('path', {
    d: 'M590 760 C 587 680 586 590 587 470', fill: 'none', stroke: '#241f1a',
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
    [576, 565],
    [[576, 565], [530, 520], [470, 462], [418, 400], [378, 344]],
    26, 9,
    [[[470, 462], [440, 420], [418, 388]]],
    [[[380, 352], 76], [[432, 398], 46], [[472, 452], 38]],
  );
  const branchR = makeBranch(
    [578, 540],
    [[578, 540], [632, 505], [688, 450], [736, 392], [772, 340]],
    26, 9,
    [[[688, 450], [716, 412], [736, 380]]],
    [[[774, 348], 74], [[722, 394], 46], [[682, 448], 38]],
  );
  const topBranch = makeBranch(
    [581, 400],
    [[581, 400], [582, 330], [580, 262], [578, 205]],
    23, 8,
    [[[580, 300], [554, 262], [526, 222]], [[580, 300], [606, 264], [648, 222]]],
    [[[580, 205], 60], [[522, 225], 54], [[652, 225], 54]],
  );
  const branches = [branchL, branchR, topBranch];

  // 收尾时长出的新叶：独立于树影之外（树影整体压到 0.36，新叶要保持鲜亮）
  const newLeaves = svg('g', { opacity: 0 }, pictureLayer);
  const NEW_LEAF_SPOTS = [
    [[388, 372], -18], [[442, 416], 24], [[768, 366], 160], [[712, 406], -150],
    [[552, 212], -8], [[608, 224], 150],
  ];

  // 落在头上的那片小叶子
  const headLeaf = svg('path', { d: LEAF_D, fill: '#7a9159', opacity: 0, transform: `translate(${HEAD_AT[0]} ${HEAD_AT[1]}) rotate(24)` }, root);

  // ---- 小人：圆头、躯干、手臂、两条屈腿，深墨勾勒；腿和头带一点淡墨皴染 ----
  // 皴染用位移小的 #ink 滤镜（wash2 位移 ±45 会糊到旁边的树干上）；躯干保持干净边界。
  const walker = svg('g', { class: 'xiu-walker' }, root);
  const shadow = svg('ellipse', { cx: 460, cy: 806, rx: 78, ry: 15, fill: '#4a423a', opacity: 0, filter: 'url(#wash2)' }, walker);
  const halo = svg('g', { opacity: 0, filter: 'url(#ink)' }, walker);
  const haloHead = svg('circle', { r: 34, fill: '#4a423a', opacity: 0.5 }, halo);
  const haloLegA = svg('path', { fill: '#4a423a', opacity: 0.4 }, halo);
  const haloLegB = svg('path', { fill: '#4a423a', opacity: 0.4 }, halo);
  const personG = svg('g', { class: 'xiu-person' }, walker);
  const legBP = svg('path', { fill: '#2a241e', 'fill-opacity': 0.78 }, personG); // 远侧的腿淡一点
  const legAP = svg('path', { fill: '#2a241e' }, personG);
  const torsoP = svg('path', { fill: '#2a241e' }, personG);
  const armP = svg('path', { fill: '#2a241e' }, personG);
  const headC = svg('circle', { r: 31, fill: '#2a241e' }, personG);

  // 把一个姿势画出来：reveal 控制每个部件写出了多少（finale 一笔一笔重写用）
  const drawPose = (p, reveal = 1, at = [0, 0]) => {
    const rv = (k) => (typeof reveal === 'number' ? reveal : reveal[k] ?? 1);
    const part = (def) => makeStroke({ anchors: def.a.map(([x, y]) => [x + at[0], y + at[1]]), w: def.w });
    const wide = (def, bias = 0, k = 1.3) => {
      const s = part({ a: def.a.map(([x, y]) => [x + bias, y]), w: def.w });
      return { ...s, ws: s.ws.map((v) => v * k) };
    };
    torsoP.setAttribute('d', strokePath(part(p.torso), rv('torso')));
    armP.setAttribute('d', strokePath(part(p.arm), rv('arm')));
    legAP.setAttribute('d', strokePath(part(p.legA), rv('legA')));
    legBP.setAttribute('d', strokePath(part(p.legB), rv('legB')));
    haloLegA.setAttribute('d', strokePath(wide(p.legA, -5), rv('legA')));
    haloLegB.setAttribute('d', strokePath(wide(p.legB, -5), rv('legB')));
    const hx = p.head[0] + at[0];
    const hy = p.head[1] + at[1];
    headC.setAttribute('cx', hx);
    headC.setAttribute('cy', hy);
    haloHead.setAttribute('cx', hx - 4);
    haloHead.setAttribute('cy', hy);
    const hr = rv('head');
    headC.setAttribute('opacity', String(Math.min(1, hr * 2)));
    headC.setAttribute('r', (31 * Math.max(0.3, hr)).toFixed(1));
  };

  // 远处淡淡的树影和一轮暖日
  let scenery = null;
  const buildScenery = () => {
    sceneryLayer.replaceChildren();
    scenery = svg('g', { opacity: 0 }, sceneryLayer);
    const wash = svg('g', { filter: 'url(#mist-wash)', fill: '#3f4b50' }, scenery);
    distantTree(wash, 180, 792, 150, 0.12);
    distantTree(wash, 272, 800, 100, 0.09);
    distantTree(wash, 1280, 796, 130, 0.12);
    distantTree(wash, 1400, 802, 96, 0.09);
    const sun = svg('g', {}, scenery);
    svg('circle', { cx: 1108, cy: 168, r: 66, fill: '#e6c07e', opacity: 0.5, filter: 'url(#glow)' }, sun);
    svg('circle', { cx: 1108, cy: 168, r: 32, fill: '#eed9a8', opacity: 0.4 }, sun);
  };

  // 各部分的初始状态：都收着，等 appear 一样样长出来
  const fold = () => {
    scaleAt(trunkG, BASE, 0);
    for (const b of branches) b.set(0);
    rootPaths.forEach((g) => g.setAttribute('opacity', 0));
    drawPose(STANDPOSE, 0, [-160, WALK_Y]);
  };
  fold();
  let pulseToken = 0;
  let fallingLeaf = null;

  // 树生长：地面洇开 → 根钻出来 → 干长高 → 枝伸展开
  async function growTree(check, f = 1, withGround = true) {
    if (withGround) {
      groundLine.setAttribute('stroke-dasharray', '1 1');
      groundLine.setAttribute('stroke-dashoffset', 1);
      ground.setAttribute('opacity', 1);
      await tween(420 * f, (t) => groundLine.setAttribute('stroke-dashoffset', String(1 - t)), { check });
    }
    const rootsGrow = Promise.all(
      rootPaths.map((g, i) =>
        wait(i * 100 * f, check).then(() =>
          tween(320 * f, (t) => {
            g.setAttribute('opacity', 1);
            scaleAt(g, BASE, t);
          }, { easing: ease.out, check }),
        ),
      ),
    );
    const trunkGrow = tween(700 * f, (t) => scaleAt(trunkG, BASE, t), { easing: ease.bloom, check });
    await Promise.all([rootsGrow, trunkGrow]);
    await Promise.all(
      branches.map((b, i) =>
        wait(i * 100 * f, check).then(() => tween(400 * f, (t) => b.set(t), { easing: ease.bloom, check })),
      ),
    );
  }

  // 叶一团团绽开（和小人走进来同时进行）
  function bloomLeaves(check, f = 1) {
    const allLeaves = branches.flatMap((b) => b.leaves);
    return Promise.all(
      allLeaves.map((leaf, i) => wait(i * 65 * f, check).then(() => leaf.bloom(420 * f, check))),
    );
  }

  // 小人从左边走进来：腿一前一后地迈，身子一起一伏；到树旁停一停，坐下来靠着树干
  async function walkAndSit(check, f = 1) {
    walker.setAttribute('opacity', 1);
    personG.classList.remove('breathing');
    const STAND_X = 515;
    await tween(
      2200 * f,
      (t) => {
        const x = lerp(-160, STAND_X, t);
        const step = Math.min(1, Math.max(0, t / 0.06)) * Math.min(1, Math.max(0, (1 - t) / 0.06)); // 起步收步都缓一点
        const swing = Math.sin(t * Math.PI * 12) * step; // 六个来回
        const bob = -Math.abs(Math.sin(t * Math.PI * 12)) * 9 * step;
        drawPose(stride(swing), 1, [x, WALK_Y + bob]);
      },
      { check },
    );
    drawPose(STANDPOSE, 1, [STAND_X, WALK_Y]);
    await wait(320 * f, check);
    // 坐下：头和身子向后靠向树干，腿收起来屈着，脚落回地上
    const from = poseAt(STANDPOSE, [STAND_X, WALK_Y]);
    await tween(
      1100 * f,
      (t) => drawPose(mixPose(from, SIT, t)),
      { check, easing: ease.inOut },
    );
    drawPose(SIT);
    personG.classList.add('breathing'); // 坐定了才开始轻轻呼吸
    // 坐定了，墨色才慢慢洇开，脚边落下一片淡淡的影子
    tween(600 * f, (t) => {
      halo.setAttribute('opacity', (t * 0.55).toFixed(2));
      shadow.setAttribute('opacity', (t * 0.3).toFixed(2));
    }, { check }).catch(() => {});
    // 一片小叶子打着转飘下来，落在他的头上
    if (fallingLeaf) fallingLeaf.remove();
    fallingLeaf = svg('path', { d: LEAF_D, fill: '#7a9159', opacity: 0 }, root);
    await tween(
      1400 * f,
      (t) => {
        const x = 578 + 22 * Math.sin(t * Math.PI * 2.2) - 78 * t;
        const y = 288 + (HEAD_AT[1] - 288) * t;
        fallingLeaf.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(t * 260 + 20).toFixed(0)}) scale(${1 - 0.2 * t})`);
        fallingLeaf.setAttribute('opacity', String(Math.min(1, t * 6)));
      },
      { check },
    );
    fallingLeaf.remove();
    fallingLeaf = null;
    headLeaf.setAttribute('opacity', 0.95);
    await tween(600 * f, (t) => headLeaf.setAttribute('transform', `translate(${HEAD_AT[0]} ${HEAD_AT[1]}) rotate(${24 + Math.sin(t * Math.PI * 3) * 8 * (1 - t)}) scale(${lerp(0.4, 1, t).toFixed(2)})`), { check });
  }

  return {
    root,
    body,
    // 树长出来，小人走进来坐下歇脚，一片叶子落在头上
    async appear(check) {
      root.setAttribute('opacity', 1);
      buildScenery();
      tween(2200, (t) => scenery.setAttribute('opacity', t), { check }).catch(() => {});
      walker.setAttribute('opacity', 0);
      await growTree(check);
      // 叶一团团绽开的同时，小人已经走进来了
      await Promise.all([bloomLeaves(check), walkAndSit(check)]);
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity'));
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },
    // 摸一下：风穿过树梢，枝叶摇一摇；小人靠在树上舒服地晃一晃，头上的叶子也跟着颤
    async pulse() {
      const token = ++pulseToken;
      const alive = () => token === pulseToken;
      await tween(
        1200,
        (t) => {
          if (!alive()) return;
          const swing = Math.sin(t * Math.PI * 3) * (1 - t);
          rotateAt(branchL.g, branchL.origin, 4 * swing);
          rotateAt(branchR.g, branchR.origin, -4 * swing);
          rotateAt(topBranch.g, topBranch.origin, 2.5 * swing);
          for (const b of branches) {
            for (const leaf of b.leaves) leaf.set(1 + 0.07 * Math.sin(t * Math.PI * 4) * (1 - t));
          }
          // 小人靠着树干轻轻晃：以臀部为轴摇一点点
          walker.setAttribute('transform', `rotate(${(2.2 * swing).toFixed(2)} ${SIT_AXLE[0]} ${SIT_AXLE[1]})`);
          headLeaf.setAttribute('transform', `translate(${HEAD_AT[0]} ${HEAD_AT[1]}) rotate(${24 + 10 * swing})`);
        },
        { easing: ease.out },
      );
      if (!alive()) return;
      for (const b of branches) {
        rotateAt(b.g, b.origin, 0);
        for (const leaf of b.leaves) leaf.set(1);
      }
      walker.setAttribute('transform', '');
      headLeaf.setAttribute('transform', `translate(${HEAD_AT[0]} ${HEAD_AT[1]}) rotate(24)`);
    },
    // 写完字：树影重新长出来，小人还坐在树下歇脚，枝头再冒出几片嫩绿的新叶
    async finale(check) {
      root.setAttribute('opacity', 1);
      buildScenery();
      tween(1000, (t) => scenery.setAttribute('opacity', t * 0.9), { check }).catch(() => {});
      walker.setAttribute('opacity', 1);
      halo.setAttribute('opacity', 0.22);
      // 树影快速长回来（不留地面线，画面更干净），小人像被一笔一笔重新写出来
      const reveal = { torso: 0, head: 0, arm: 0, legA: 0, legB: 0 };
      await Promise.all([
        (async () => {
          await growTree(check, 0.4, false);
          await bloomLeaves(check, 0.5);
        })(),
        (async () => {
          await tween(520, (t) => { reveal.torso = t; drawPose(SIT, reveal); }, { check });
          await tween(300, (t) => { reveal.head = t; drawPose(SIT, reveal); }, { check });
          await tween(320, (t) => { reveal.arm = t; drawPose(SIT, reveal); }, { check });
          await Promise.all([
            tween(380, (t) => { reveal.legA = t; drawPose(SIT, reveal); }, { check }),
            tween(380, (t) => { reveal.legB = t; drawPose(SIT, reveal); }, { check }),
          ]);
        })(),
      ]);
      drawPose(SIT);
      personG.classList.add('breathing');
      headLeaf.setAttribute('opacity', 0.95);
      headLeaf.setAttribute('transform', `translate(${HEAD_AT[0]} ${HEAD_AT[1]}) rotate(24)`);
      await tween(900, (t) => root.setAttribute('opacity', lerp(1, 0.36, t)), { check });
      // 枝头冒新叶
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
      if (fallingLeaf) {
        fallingLeaf.remove();
        fallingLeaf = null;
      }
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
        scaleAt(g, BASE, 0);
      });
      ground.setAttribute('opacity', 0);
      groundLine.removeAttribute('stroke-dasharray');
      groundLine.removeAttribute('stroke-dashoffset');
      walker.setAttribute('opacity', 0);
      walker.setAttribute('transform', '');
      personG.classList.remove('breathing');
      drawPose(STANDPOSE, 0, [-160, WALK_Y]);
      halo.setAttribute('opacity', 0);
      shadow.setAttribute('opacity', 0);
      headLeaf.setAttribute('opacity', 0);
      newLeaves.setAttribute('opacity', 0);
      newLeaves.replaceChildren();
      root.setAttribute('opacity', 0);
      sceneryLayer.replaceChildren();
      scenery = null;
    },
  };
}
