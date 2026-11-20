// 「大」从小朋友到楷书的字形变形，含人形族的家族比较环节（brief 任务卡）。
// 四条笔画贯穿所有形态，一一对应、逐点插值：
//   armL（左臂→楷书横的左半）、armR（右臂→横的右半）、
//   body（头身连着左腿→撇）、leg（右腿→捺）。
// oracle 场景动线（与旁白配合）：小朋友的几何 →（收拢成）侧立的「人」
// →（转过来）张开手臂的甲骨文「大」。「人是侧着站，大是正面张开手臂」。
// 形态基准（etymology.md「大」条，已对照汉典拓片 refs/da/）：
//   甲骨文（jiaguwen 43_E619/E61B/E61C）：正面人形，头顶短竖出头，
//   两臂自躯干上端向外下方斜张（与水平约四十度），两腿微张分立，整体窄高；
//   小篆（swxz/5927）：躯干一竖通顶，两臂自上段向两侧微垂的长弧，两腿分叉弧线。
// 楷书中心线直接取笔画数据的 medians（y→900-y），最后一步与笔顺动画严丝合缝。
import { svg, tween, wait, lerp } from '../../util.js';
import { makeStroke, mixStroke, strokePath } from './ribbon.js';

const PARTS = ['armL', 'armR', 'body', 'leg'];
const INK = [34, 29, 26];
// 赭石刀刻：甲骨文刻痕的族色（SOP 2.6），最后慢慢沉成墨
const OCHRE = [126, 84, 50];
const colorOf = (rgb) => `rgb(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0})`;

// 侧立收拢的「人」：窄高一条，细臂贴身下垂，两腿并拢，上身微前倾——
// 与已学「人」的甲骨文（侧立直立人形）在轮廓上对上。
const SIDE = {
  armL: {
    anchors: [[484, 336], [466, 410], [452, 482], [442, 548]],
    w: [[0, 13], [1, 10]],
  },
  armR: {
    anchors: [[492, 336], [506, 410], [518, 482], [528, 548]],
    w: [[0, 11], [1, 8]],
  },
  body: {
    anchors: [[498, 172], [492, 252], [487, 332], [484, 412], [481, 492], [476, 592], [472, 692], [468, 792], [464, 848]],
    w: [[0, 30], [0.2, 26], [0.6, 22], [1, 20]],
  },
  leg: {
    anchors: [[484, 492], [490, 594], [498, 696], [506, 790], [510, 846]],
    w: [[0, 20], [0.5, 22], [1, 20]],
  },
};

// 甲骨文：正面张臂的人，刀刻直线。头顶短竖出头，臂端约与水平成三十六度，
// 两脚左右分开约一百零六，整体窄高（对照拓片，臂略展以衔接楷书）。
const ORACLE = {
  armL: {
    anchors: [[504, 340], [452, 378], [398, 414], [340, 458]],
    w: [[0, 24], [0.5, 20], [1, 16]],
    jitter: 3.5,
  },
  armR: {
    anchors: [[504, 340], [556, 378], [610, 414], [668, 458]],
    w: [[0, 24], [0.5, 20], [1, 16]],
    jitter: 3.5,
  },
  body: {
    anchors: [[512, 170], [508, 230], [506, 290], [504, 340], [503, 410], [501, 478], [492, 588], [468, 698], [436, 798], [402, 856]],
    w: [[0, 28], [0.25, 24], [0.5, 22], [0.8, 24], [1, 20]],
    jitter: 3.5,
  },
  leg: {
    anchors: [[501, 478], [516, 588], [538, 698], [566, 796], [612, 854]],
    w: [[0, 20], [0.5, 21], [1, 24]],
    jitter: 3.5,
  },
};

// 小篆：线条匀称圆转（对照 swxz/5927）：一竖通顶（头顶即竖线顶端，不另出短头），
// 两臂自竖线上段向两侧微垂的长弧，两腿自分叉处甩开的弧线。
const SEAL = {
  armL: {
    anchors: [[512, 290], [452, 302], [392, 322], [332, 352], [276, 386]],
    w: [[0, 26], [1, 26]],
  },
  armR: {
    anchors: [[512, 290], [572, 302], [632, 322], [692, 352], [748, 386]],
    w: [[0, 26], [1, 26]],
  },
  body: {
    anchors: [[512, 105], [512, 215], [512, 325], [512, 435], [512, 530], [488, 632], [452, 732], [414, 822], [382, 880]],
    w: [[0, 30], [1, 32]],
  },
  leg: {
    anchors: [[512, 530], [538, 632], [576, 732], [616, 822], [650, 878]],
    w: [[0, 30], [1, 32]],
  },
};

// 楷书各笔的宽度：沿中线看笔画数据的轮廓定的（起笔收笔的肥瘦）。
// 撇的起笔顿头在数据里横宽竖扁，ribbon 的起笔圆帽是各向同性的圆，
// 宽度取九十而不是轮廓的一百四十四，圆帽才不会把外框顶边撑出容差。
const KAISHU_W = {
  armL: [[0, 46], [1, 58]],
  armR: [[0, 46], [0.5, 48], [1, 82]],
  body: [[0, 90], [0.22, 62], [0.5, 60], [0.75, 54], [1, 20]],
  leg: [[0, 34], [0.4, 56], [0.7, 82], [0.87, 126], [1, 62]],
};

// 点到线段的最近点
function closestOnSeg(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
}

// 由笔画数据的中线生成楷书形态：横拆成左右两半（两臂），撇是头身连左腿，捺是右腿
function kaishuForm(data) {
  const m = (i) => data.medians[i].map(([x, y]) => [x, 900 - y]);
  const heng = m(0);
  const pie = m(1);
  // 分界点：横的中线上离撇的中线最近的点（同时记下它落在横的第几段上）
  let junction = heng[3];
  let seg = 3;
  let best = Infinity;
  for (let i = 1; i < heng.length; i++) {
    for (let k = 1; k < pie.length; k++) {
      const q = closestOnSeg(heng[i], pie[k - 1], pie[k]);
      const d = Math.hypot(q[0] - heng[i][0], q[1] - heng[i][1]);
      if (d < best) {
        best = d;
        junction = q;
        seg = i;
      }
    }
  }
  // 手臂一律从躯干向外长：左臂从交点到左端，右臂从交点到右端
  return {
    armL: [junction, ...heng.slice(0, seg).reverse()],
    armR: [junction, ...heng.slice(seg)],
    body: pie,
    leg: m(2),
  };
}

export function createMorph(layer, data) {
  const strokesOf = (defs) => Object.fromEntries(PARTS.map((p) => [p, makeStroke(defs[p])]));
  const K = kaishuForm(data);
  const kaishuDefs = Object.fromEntries(PARTS.map((p) => [p, { anchors: K[p], w: KAISHU_W[p] }]));
  const FORMS = { side: strokesOf(SIDE), oracle: strokesOf(ORACLE), seal: strokesOf(SEAL), kaishu: strokesOf(kaishuDefs) };

  const root = svg('g', { class: 'morph', 'data-testid': 'morph', 'data-pose': 'side', opacity: 0 }, layer);
  const paths = {};
  for (const p of PARTS) paths[p] = svg('path', { fill: colorOf(INK), 'data-part': p }, root);

  let state = null;
  const render = () => {
    for (const p of PARTS) paths[p].setAttribute('d', state ? strokePath(state[p]) : '');
  };
  const setColor = (rgb) => {
    for (const p of PARTS) paths[p].setAttribute('fill', colorOf(rgb));
  };
  const mixState = (a, b, t) => Object.fromEntries(PARTS.map((p) => [p, mixStroke(a[p], b[p], t)]));

  return {
    root,
    // 比较环节的动线（与旁白「还记得人字吗……转过来，张开手臂」配合）：
    // 从小朋友当前的几何起笔（与画面重合，看起来没有切换），
    // 先收拢成侧立的「人」——停一拍——再转过来张开手臂，成为甲骨文的「大」，
    // 赭石刀刻的颤动随张开一起长出来，最后整幅慢慢沉成墨。
    async drawOracle(fromStrokes, check) {
      state = fromStrokes;
      render();
      root.setAttribute('data-pose', 'picture');
      setColor(INK);
      root.setAttribute('opacity', 1);
      await tween(1800, (t) => {
        state = mixState(fromStrokes, FORMS.side, t);
        render();
      }, { check });
      state = FORMS.side;
      render();
      root.setAttribute('data-pose', 'side');
      await wait(1200, check);
      const from = state;
      const to = FORMS.oracle;
      await tween(
        2000,
        (t) => {
          state = mixState(from, to, t);
          render();
          setColor(INK.map((v, i) => lerp(v, OCHRE[i], t)));
        },
        { check },
      );
      state = to;
      render();
      root.setAttribute('data-pose', 'open');
      await tween(1200, (t) => setColor(OCHRE.map((v, i) => lerp(v, INK[i], t))), { check });
      setColor(INK);
    },
    // 对锚点、宽度、刀刻颤动一起插值，四条笔画同时连续地变形
    async to(name, ms, check) {
      const from = state;
      const to = FORMS[name];
      await tween(
        ms,
        (t) => {
          state = mixState(from, to, t);
          render();
        },
        { check },
      );
      state = to;
      render();
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity') ?? 1);
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },
    reset() {
      state = FORMS.oracle;
      setColor(INK);
      render();
      root.setAttribute('data-pose', 'side');
      root.setAttribute('opacity', 0);
    },
  };
}
