// 「休」从「人倚树」到楷书的字形变形。
// 七条笔画：人的身（头颈一笔躬下、顺势撇出垂着的手臂）、人的腿，
// 加上树的左枝、右枝、树干、左根、右根——与楷书的撇、竖、横（左右两半）、竖、撇、捺一一对应。
// 每个字形下都是同样七条笔画，只是锚点位置和宽度不同，逐点插值就能连续地变过去。
// 楷书形态的中心线直接取自笔画数据，所以最后一步和笔顺动画严丝合缝。
import { svg, tween, lerp } from '../../util.js';
import { makeStroke, mixStroke, strokePath } from './ribbon.js';

const PARTS = ['person', 'leg', 'branchL', 'branchR', 'trunk', 'rootL', 'rootR'];

const INK = [34, 29, 26];
// 开场刻字用的赭石色：木头和树皮的颜色，最后慢慢沉成墨
const OCHRE = [126, 84, 50];
const colorOf = (rgb) => `rgb(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0})`;

// 甲骨文：刀刻的直线骨架。人按真实甲骨文「人」形侧立于木旁（依 etymology.md / 说文「象臂胫之形」）：
// 一笔是身子——直立微前倾，顺势垂下手臂（收在膝高）；一笔是站直的腿，脚落到地上。
// 树枝向上分叉，树根向下分叉。人和树之间留出空隙，部件分明。
const ORACLE = {
  person: {
    anchors: [[428, 335], [412, 378], [406, 470], [412, 565], [398, 640], [368, 700], [332, 758], [300, 800]],
    w: [[0, 34], [0.2, 30], [0.6, 26], [1, 18]],
    jitter: 3.5,
  },
  leg: {
    anchors: [[412, 565], [420, 670], [428, 770], [432, 868]],
    w: [[0, 26], [0.5, 24], [1, 22]],
    jitter: 3.5,
  },
  branchL: { anchors: [[580, 315], [530, 280], [478, 240], [428, 196], [388, 152]], w: [[0, 26], [1, 20]], jitter: 3 },
  branchR: { anchors: [[580, 315], [630, 282], [676, 240], [720, 196], [752, 156]], w: [[0, 26], [1, 20]], jitter: 3 },
  trunk: { anchors: [[580, 105], [580, 290], [580, 470], [580, 650], [580, 880]], w: [[0, 26], [1, 34]], jitter: 3 },
  rootL: { anchors: [[580, 748], [546, 790], [514, 832], [488, 872]], w: [[0, 24], [1, 18]], jitter: 3 },
  rootR: { anchors: [[580, 748], [618, 790], [656, 830], [690, 868]], w: [[0, 24], [1, 18]], jitter: 3 },
};

// 小篆：线条匀称圆转。人旁是头顶前倾的一弧接着长竖；树枝树根都弯成柔和的弧线。
const SEAL = {
  person: {
    anchors: [[322, 240], [302, 182], [258, 158], [214, 176], [188, 228], [172, 300], [158, 402], [148, 510]],
    w: [[0, 32], [1, 30]],
  },
  leg: {
    anchors: [[322, 238], [316, 390], [310, 545], [306, 700], [302, 872]],
    w: [[0, 32], [1, 32]],
  },
  branchL: { anchors: [[572, 330], [528, 308], [480, 276], [438, 234], [406, 184]], w: [[0, 30], [1, 30]] },
  branchR: { anchors: [[572, 330], [618, 308], [666, 274], [710, 230], [742, 180]], w: [[0, 30], [1, 30]] },
  trunk: { anchors: [[572, 130], [572, 300], [572, 470], [573, 610], [575, 745], [577, 895]], w: [[0, 32], [1, 32]] },
  rootL: { anchors: [[573, 725], [536, 762], [498, 802], [462, 844], [436, 884]], w: [[0, 30], [1, 30]] },
  rootR: { anchors: [[573, 725], [612, 762], [650, 800], [686, 842], [712, 882]], w: [[0, 30], [1, 30]] },
};

// 楷书各笔的宽度：沿中线看着笔画数据的轮廓定的（起笔收笔的肥瘦）
const KAISHU_W = {
  person: [[0, 92], [0.2, 66], [0.5, 46], [0.8, 32], [1, 20]],
  leg: [[0, 62], [0.3, 52], [0.7, 42], [1, 20]],
  branchL: [[0, 54], [0.5, 62], [1, 42]],
  branchR: [[0, 54], [0.6, 50], [1, 52]],
  trunk: [[0, 20], [0.12, 48], [0.5, 52], [0.8, 60], [1, 15]],
  rootL: [[0, 44], [0.4, 34], [1, 12]],
  rootR: [[0, 30], [0.55, 42], [0.85, 76], [1, 24]],
};

// 点到线段的最近点
function closestOnSeg(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}

// 由笔画数据的中线生成楷书形态（横拆成左右两半，从横与竖的交点分开）
function kaishuForm(data) {
  const m = (i) => data.medians[i].map(([x, y]) => [x, 900 - y]);
  const heng = m(2);
  const shu = m(3);
  // 分界点：横的中线上离竖的中线最近的点（同时记下它落在横的第几段上）
  let junction = heng[3];
  let seg = 3;
  let best = Infinity;
  for (let i = 1; i < heng.length; i++) {
    for (let k = 1; k < shu.length; k++) {
      const q = closestOnSeg(heng[i], shu[k - 1], shu[k]);
      const d = Math.hypot(q[0] - heng[i][0], q[1] - heng[i][1]);
      if (d < best) {
        best = d;
        junction = q;
        seg = i;
      }
    }
  }
  // 树枝一律从树干向外长：左枝从交点到左端，右枝从交点到右端
  return {
    person: m(0),
    leg: m(1),
    branchL: [junction, ...heng.slice(0, seg).reverse()],
    branchR: [junction, ...heng.slice(seg)],
    trunk: m(3),
    rootL: m(4),
    rootR: m(5),
  };
}

export function createMorph(layer, data) {
  const strokesOf = (defs) => Object.fromEntries(PARTS.map((p) => [p, makeStroke(defs[p])]));
  const K = kaishuForm(data);
  const kaishuDefs = Object.fromEntries(PARTS.map((p) => [p, { anchors: K[p], w: KAISHU_W[p] }]));
  const FORMS = { oracle: strokesOf(ORACLE), seal: strokesOf(SEAL), kaishu: strokesOf(kaishuDefs) };

  const root = svg('g', { class: 'morph', 'data-testid': 'morph', opacity: 0 }, layer);
  const paths = {};
  for (const p of PARTS) paths[p] = svg('path', { fill: colorOf(INK) }, root);

  let state = FORMS.oracle;
  const reveal = Object.fromEntries(PARTS.map((p) => [p, 1]));
  const render = () => {
    for (const p of PARTS) paths[p].setAttribute('d', strokePath(state[p], reveal[p]));
  };
  const setColor = (rgb, parts = PARTS) => {
    for (const p of parts) paths[p].setAttribute('fill', colorOf(rgb));
  };

  return {
    root,
    // 甲骨文开场：画面淡成一层影子的同时，骨架用赭石一刀一刀刻出来——
    // 先刻树（干、两枝、两根），再刻人（身、腿），最后整幅慢慢沉成墨。
    async drawOracle(check) {
      state = FORMS.oracle;
      for (const p of PARTS) reveal[p] = 0;
      render();
      setColor(OCHRE);
      root.setAttribute('opacity', 1);
      await tween(650, (t) => { reveal.trunk = t; render(); }, { check });
      await Promise.all([
        tween(550, (t) => { reveal.branchL = t; render(); }, { check }),
        tween(550, (t) => { reveal.branchR = t; render(); }, { check }),
      ]);
      await Promise.all([
        tween(520, (t) => { reveal.rootL = t; render(); }, { check }),
        tween(520, (t) => { reveal.rootR = t; render(); }, { check }),
      ]);
      await tween(620, (t) => { reveal.person = t; render(); }, { check });
      await tween(480, (t) => { reveal.leg = t; render(); }, { check });
      await tween(1000, (t) => setColor(OCHRE.map((v, i) => lerp(v, INK[i], t))), { check });
    },
    // 对锚点、宽度、刀刻颤动一起插值，七条笔画同时连续地变形
    async to(name, ms, check) {
      const from = state;
      const to = FORMS[name];
      await tween(
        ms,
        (t) => {
          state = Object.fromEntries(PARTS.map((p) => [p, mixStroke(from[p], to[p], t)]));
          render();
        },
        { check },
      );
      state = to;
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity') ?? 1);
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },
    reset() {
      state = FORMS.oracle;
      for (const p of PARTS) reveal[p] = 1;
      setColor(INK);
      render();
      root.setAttribute('opacity', 0);
    },
  };
}
