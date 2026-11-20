// 夜晚的篝火：两根墨木交叉架着，火苗一层层水彩洇开（绛红罩边、焰橙、焰心暖黄），
// 火苗会呼吸（CSS），火星一颗颗往上飘。摸一下，火苗窜一窜，爆出一捧小火星。
// 夜幕和星星放在背景层（layers.scenery，1600×1000 坐标）；进入字形环节后夜幕退去，
// 收尾时再轻轻回来一层薄暮。色系为火族定色：绛红 + 焰心暖黄（见 etymology.md 色系表）。
import { svg, tween, ease, lerp } from '../../util.js';
import { makeStroke, strokePath } from './ribbon.js';
import { FLAME, PARTS } from './forms.js';

// 火族色系
const CRIMSON = '#8e2b36'; // 绛红：外焰罩边、刻字起笔
const FLAME_ORANGE = '#d96a35'; // 焰橙：中层
const HEART_YELLOW = '#f4b24e'; // 焰心暖黄
const CORE_PALE = '#fbe3a0'; // 焰心最亮的一小口
const SPARK_GOLD = '#f6c356'; // 火星

const LOG_WOOD = '#453222';
const STONE = '#5a5347';

// 火苗的每一层：以舌根为原点整体收缩 + 变窄，叠出水彩的层次
const shrink = (def, wm, k) => {
  const b = def.anchors[def.anchors.length - 1];
  return {
    anchors: def.anchors.map(([x, y]) => [b[0] + (x - b[0]) * k, b[1] + (y - b[1]) * k]),
    w: def.w.map(([s, w]) => [s, w * wm]),
  };
};

// 一条火苗舌的水彩层（外绛红 wash2、中焰橙 wash1、内暖黄 wash1；主焰再加最亮的焰心）
function tongue(parent, def, part) {
  const g = svg('g', { 'data-huo-tongue': part }, parent);
  const layers = [
    { spec: { wm: 1, k: 1 }, fill: CRIMSON, op: 0.5, filter: 'url(#wash2)', testid: part === 'main' ? 'flame-outer' : null },
    { spec: { wm: 0.72, k: 0.9 }, fill: FLAME_ORANGE, op: 0.58, filter: 'url(#wash1)' },
    { spec: { wm: 0.44, k: 0.78 }, fill: HEART_YELLOW, op: 0.85, filter: 'url(#wash1)' },
  ];
  if (part === 'main') layers.push({ spec: { wm: 0.2, k: 0.6 }, fill: CORE_PALE, op: 0.95, testid: 'flame-core' });
  for (const { spec, fill, op, filter, testid } of layers) {
    const attrs = { d: strokePath(makeStroke(shrink(def, spec.wm, spec.k))), fill, opacity: op };
    if (filter) attrs.filter = filter;
    if (testid) attrs['data-huo-part'] = testid;
    svg('path', attrs, g);
  }
  return g;
}

const SPARK_D = 'M0 -6.5 C 2.8 -2.8 3.6 2 0 6 C -3.6 2 -2.8 -2.8 0 -6.5 Z';
const BURST_D = 'M0 -8 C 3.4 -3.4 4.4 2.2 0 6.6 C -4.4 2.2 -3.4 -3.4 0 -8 Z';

// 环境里一直往上飘的小火星（外层 g 定位＋定大小，内层 path 跑 CSS 动画）
const DRIFTERS = [
  { x: 448, y: 470, d: '3.4s', dl: '0s', s: 1 },
  { x: 496, y: 420, d: '4.2s', dl: '1.3s', s: 1.3 },
  { x: 546, y: 502, d: '3.6s', dl: '2.2s', s: 0.9 },
  { x: 516, y: 560, d: '2.9s', dl: '0.7s', s: 1.1 },
  { x: 466, y: 534, d: '3.8s', dl: '2.9s', s: 0.8 },
  { x: 430, y: 560, d: '3.1s', dl: '1.8s', s: 0.7 },
  { x: 588, y: 470, d: '3.9s', dl: '0.4s', s: 0.85 },
];

// 夜空：避开星空中带（x 520～1080 会映在舞台左侧的干净带上，残留扫描用）
const STARS = [
  [110, 150, 2.6, 1], [212, 305, 1.8, 0], [88, 452, 2.2, 0], [305, 208, 1.5, 0], [168, 566, 2.8, 1],
  [382, 428, 1.6, 0], [76, 668, 2.0, 0], [262, 700, 1.4, 0], [355, 96, 2.2, 0], [440, 560, 1.7, 1],
  [1136, 96, 2.2, 0], [1158, 186, 2.8, 1], [1236, 326, 1.8, 0], [1330, 152, 2.4, 0], [1424, 424, 1.6, 0],
  [1182, 524, 2.0, 1], [1502, 262, 1.5, 0], [1392, 598, 2.2, 0], [1096, 420, 1.4, 0], [1480, 60, 1.9, 1],
];

export function createFire(pictureLayer, sceneryLayer) {
  const root = svg('g', { class: 'huo-fire', opacity: 0 }, pictureLayer);

  // ---- 背景夜幕（scenery 层，1600×1000）----
  let scenery = null;
  const buildScenery = () => {
    sceneryLayer.replaceChildren();
    scenery = svg('g', { opacity: 0 }, sceneryLayer);
    const defs = svg('defs', {}, scenery);
    const night = svg('linearGradient', { id: 'huo-night', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    svg('stop', { offset: 0, 'stop-color': '#1c2333', 'stop-opacity': 0.95 }, night);
    svg('stop', { offset: 0.55, 'stop-color': '#232a3e', 'stop-opacity': 0.88 }, night);
    svg('stop', { offset: 1, 'stop-color': '#33304a', 'stop-opacity': 0.8 }, night);
    svg('rect', { x: 0, y: 0, width: 1600, height: 1000, fill: 'url(#huo-night)' }, scenery);
    // 远处黑黢黢的山影
    const hills = svg('g', { filter: 'url(#mist-wash)' }, scenery);
    svg('path', {
      d: 'M0 800 C 180 726 360 748 540 776 C 740 806 920 756 1120 784 C 1320 812 1480 762 1600 790 L1600 1000 L0 1000 Z',
      fill: '#10141f', opacity: 0.5,
    }, hills);
    // 星星：小的静态，大一点的眨呀眨
    const stars = svg('g', {}, scenery);
    for (const [x, y, r, tw] of STARS) {
      svg('circle', {
        cx: x, cy: y, r, fill: '#f4ecd8', opacity: 0.75,
        ...(tw ? { class: 'huo-star', style: `animation-delay:${(x % 7) * 0.9}s` } : {}),
      }, stars);
    }
  };

  // ---- 暖光（火堆晕开的光。外圈往红里收：暖橙的低透明度叠在夜蓝上会发橄榄灰）----
  const glowG = svg('g', { opacity: 0 }, root);
  const glowDefs = svg('defs', {}, glowG);
  const glowGrad = svg('radialGradient', { id: 'huo-glow', cx: 0.5, cy: 0.58, r: 0.5 }, glowDefs);
  svg('stop', { offset: 0, 'stop-color': '#f8ca62', 'stop-opacity': 0.26 }, glowGrad);
  svg('stop', { offset: 0.45, 'stop-color': '#d96a35', 'stop-opacity': 0.09 }, glowGrad);
  svg('stop', { offset: 1, 'stop-color': '#b04a2b', 'stop-opacity': 0 }, glowGrad);
  svg('ellipse', { cx: 512, cy: 610, rx: 262, ry: 240, fill: 'url(#huo-glow)' }, glowG);
  // 火光落在地上的暖光池（柴堆的落地感；往橙红收，避免黄绿相位）
  const groundGrad = svg('radialGradient', { id: 'huo-ground', cx: 0.5, cy: 0.5, r: 0.5 }, glowDefs);
  svg('stop', { offset: 0, 'stop-color': '#ef9d3e', 'stop-opacity': 0.22 }, groundGrad);
  svg('stop', { offset: 0.55, 'stop-color': '#c25430', 'stop-opacity': 0.08 }, groundGrad);
  svg('stop', { offset: 1, 'stop-color': '#a84428', 'stop-opacity': 0 }, groundGrad);
  svg('ellipse', { cx: 512, cy: 826, rx: 215, ry: 58, fill: 'url(#huo-ground)' }, glowG);

  // ---- 地面、石头、木柴 ----
  const groundG = svg('g', { opacity: 0 }, root);
  svg('ellipse', { cx: 512, cy: 838, rx: 195, ry: 28, fill: '#3a332c', opacity: 0.26, filter: 'url(#wash2)' }, groundG);
  // 几笔短短的地面线（只做局部脚线，不横贯画面）
  for (const [gx, gy, f] of [[386, 846, 1], [646, 850, -1], [512, 858, 1]]) {
    svg('path', {
      d: `M${gx} ${gy} q ${7 * f} -13 ${15 * f} -15`,
      fill: 'none', stroke: '#6b5a44', 'stroke-width': 3.5, 'stroke-linecap': 'round', opacity: 0.5,
    }, groundG);
  }
  svg('ellipse', { cx: 366, cy: 818, rx: 30, ry: 19, fill: STONE, opacity: 0.8, filter: 'url(#wash1)' }, groundG);
  svg('ellipse', { cx: 660, cy: 824, rx: 26, ry: 17, fill: STONE, opacity: 0.7, filter: 'url(#wash1)' }, groundG);

  const logsG = svg('g', { opacity: 0 }, root);
  const log = (x1, y1, x2, y2) => {
    const g = svg('g', {}, logsG);
    svg('path', {
      d: `M${x1} ${y1} L${x2} ${y2}`, stroke: LOG_WOOD, 'stroke-width': 46,
      'stroke-linecap': 'round', fill: 'none', filter: 'url(#ink)',
    }, g);
    // 两端的年轮（暗色木纹端面，不抢戏）
    for (const [ex, ey] of [[x1, y1], [x2, y2]]) {
      svg('circle', { cx: ex, cy: ey, r: 13, fill: '#5d4531', filter: 'url(#ink)' }, g);
      svg('circle', { cx: ex, cy: ey, r: 6, fill: 'none', stroke: LOG_WOOD, 'stroke-width': 3, opacity: 0.6 }, g);
    }
    return g;
  };
  const logA = log(338, 800, 694, 758);
  const logB = log(352, 764, 688, 806);

  // 柴缝里透出的炭火
  const emberG = svg('g', { opacity: 0 }, root);
  svg('ellipse', { cx: 512, cy: 774, rx: 92, ry: 20, fill: HEART_YELLOW, opacity: 0.42, filter: 'url(#wash1)' }, emberG);
  svg('ellipse', { cx: 512, cy: 774, rx: 48, ry: 11, fill: CORE_PALE, opacity: 0.5 }, emberG);

  // ---- 火苗（三层缩放嵌套：点火 / 窜动 / 呼吸互不打架）----
  const igniteG = svg('g', {}, root); // appear 点火用
  const leapG = svg('g', {}, igniteG); // pulse 窜动用
  const breatheG = svg('g', { class: 'huo-flame-body' }, leapG); // CSS 呼吸
  const flameG = svg('g', { opacity: 0 }, breatheG);
  const tongues = Object.fromEntries(PARTS.map((p) => [p, tongue(flameG, FLAME[p], p)]));
  const setIgnite = (s) => igniteG.setAttribute('transform', `translate(512 742) scale(${s}) translate(-512 -742)`);
  const setLeap = (s) => leapG.setAttribute('transform', `translate(512 742) scale(${s}) translate(-512 -742)`);

  // ---- 一直飘的火星 ----
  const driftG = svg('g', { opacity: 0 }, root);
  for (const { x, y, d, dl, s } of DRIFTERS) {
    const at = svg('g', { transform: `translate(${x} ${y}) scale(${s})` }, driftG);
    svg('path', { d: SPARK_D, fill: SPARK_GOLD, class: 'huo-spark', style: `--d:${d};--dl:${dl}` }, at);
  }

  // ---- 透明命中罩：罩住火苗和柴堆，画在实物层最上层（前批教训）----
  const body = svg('g', { class: 'huo-hit' }, root);
  svg('ellipse', { cx: 512, cy: 552, rx: 272, ry: 310, fill: '#000', 'fill-opacity': 0 }, body);
  svg('ellipse', { cx: 512, cy: 780, rx: 215, ry: 75, fill: '#000', 'fill-opacity': 0 }, body);

  // 初始都收着
  setIgnite(0.12);
  setLeap(1);
  let pulseToken = 0;
  const bursts = [];

  const setLogsAt = (t) => {
    logA.setAttribute('transform', `translate(${lerp(-46, 0, t)} 0)`);
    logB.setAttribute('transform', `translate(${lerp(46, 0, t)} 0)`);
  };

  return {
    root,
    body,
    // 夜幕落下、柴架好、一颗火星把火点起来
    async appear(check, { fast = false, night = 0.95 } = {}) {
      const f = fast ? 0.4 : 1;
      root.setAttribute('opacity', 1);
      buildScenery();
      setIgnite(0.12);
      setLeap(1);
      flameG.setAttribute('opacity', 0);
      await tween(1500 * f, (t) => scenery.setAttribute('opacity', lerp(0, night, t)), { check });
      await Promise.all([
        tween(620 * f, (t) => {
          logsG.setAttribute('opacity', t);
          groundG.setAttribute('opacity', t);
          setLogsAt(t);
        }, { check }),
        tween(620 * f, (t) => {
          emberG.setAttribute('opacity', t);
          glowG.setAttribute('opacity', t);
        }, { check }),
      ]);
      // 点火：火苗从柴缝里窜起来
      await tween(1500 * f, (t) => {
        setIgnite(lerp(0.12, 1, t));
        flameG.setAttribute('opacity', Math.min(1, t * 2.2));
      }, { easing: ease.bloom, check });
      setIgnite(1);
      flameG.setAttribute('opacity', 1);
      tween(400 * f, (t) => driftG.setAttribute('opacity', 0.9 * t), { check }).catch(() => {});
    },
    // 摸一下：火苗窜一窜，荡开一圈光晕，爆出一捧小火星
    async pulse() {
      const token = ++pulseToken;
      const alive = () => token === pulseToken;
      const ring = svg('circle', {
        cx: 512, cy: 560, r: 210, fill: 'none', stroke: CRIMSON, 'stroke-width': 12,
        opacity: 0.55, filter: 'url(#wash2)',
      }, root);
      const g = svg('g', {}, root);
      bursts.push(g);
      const seeds = Array.from({ length: 6 }, (_, i) => ({
        x: 512 + Math.cos((i / 6) * Math.PI * 2) * 60,
        y: 560 + Math.sin((i / 6) * Math.PI * 2) * 40,
        dx: (i - 2.5) * 22,
        ph: i * 1.7,
      }));
      for (const s of seeds) {
        svg('path', { d: BURST_D, fill: SPARK_GOLD, transform: `translate(${s.x} ${s.y})` }, g);
      }
      await tween(1150, (t) => {
        if (!alive()) return;
        setLeap(1 + 0.16 * Math.sin(t * Math.PI));
        ring.setAttribute('r', lerp(210, 470, t));
        ring.setAttribute('opacity', 0.55 * (1 - t));
        glowG.setAttribute('opacity', 1 + 0.3 * Math.sin(t * Math.PI));
        for (const [i, s] of seeds.entries()) {
          const k = g.children[i];
          const sway = Math.sin(t * Math.PI * 2.2 + s.ph) * (1 - t) * 18;
          k.setAttribute('transform', `translate(${(s.x + s.dx * t + sway).toFixed(1)} ${(s.y - 240 * t - 40 * t * t).toFixed(1)}) scale(${(1 - 0.4 * t).toFixed(2)}) rotate(${(t * 260 + s.ph * 20).toFixed(0)})`);
          k.setAttribute('opacity', String(Math.min(1, t * 5) * (1 - Math.max(0, t - 0.75) * 4)));
        }
      }, { easing: ease.out });
      if (!alive()) return;
      setLeap(1);
      ring.remove();
      g.remove();
      const gi = bursts.indexOf(g);
      if (gi >= 0) bursts.splice(gi, 1);
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity'));
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },
    async nightFade(target, ms, check) {
      if (!scenery) return;
      const from = Number(scenery.getAttribute('opacity') ?? 0);
      await tween(ms, (t) => scenery.setAttribute('opacity', lerp(from, target, t)), { check });
    },
    // 写完字：几颗火星再轻轻飘一阵（流程动画，可取消）
    async sparkle(check) {
      const g = svg('g', {}, root);
      bursts.push(g);
      const seeds = DRIFTERS.slice(0, 4).map(({ x, y }) => [x + 20, y + 40]);
      for (const [x, y] of seeds) svg('path', { d: SPARK_D, fill: SPARK_GOLD, transform: `translate(${x} ${y})` }, g);
      await Promise.all(
        seeds.map(([x, y], i) =>
          tween(1600, (t) => {
            const k = g.children[i];
            const sway = Math.sin(t * Math.PI * 2 + i) * 14 * (1 - t);
            k.setAttribute('transform', `translate(${(x + sway).toFixed(1)} ${(y - 170 * t).toFixed(1)}) scale(${(1 - 0.35 * t).toFixed(2)})`);
            k.setAttribute('opacity', String(Math.min(1, t * 4) * (1 - t * 0.9)));
          }, { check }).catch(() => {}),
        ),
      );
      g.remove();
      const gi = bursts.indexOf(g);
      if (gi >= 0) bursts.splice(gi, 1);
    },
    reset() {
      pulseToken++;
      for (const b of bursts) b.remove();
      bursts.length = 0;
      root.setAttribute('opacity', 0);
      logsG.setAttribute('opacity', 0);
      groundG.setAttribute('opacity', 0);
      emberG.setAttribute('opacity', 0);
      glowG.setAttribute('opacity', 0);
      flameG.setAttribute('opacity', 0);
      driftG.setAttribute('opacity', 0);
      setIgnite(0.12);
      setLeap(1);
      setLogsAt(0);
      sceneryLayer.replaceChildren();
      scenery = null;
    },
  };
}
