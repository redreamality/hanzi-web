// 「比」从实物到楷书的字形变形。
// 全程四条笔画（DOM 顺序 = 笔顺）：横、竖提、撇、竖弯钩，
// 在实物/古文字里对应：左人腿、左人身臂、右人腿、右人身臂——
// 两个侧立人形（头身垂臂一笔＋腿一笔）并排，正是「二人为比」。
// 每个字形只是锚点位置和宽度不同，四条笔画逐点插值就能连续地变过去。
// 楷书锚点沿笔画数据中线手调（补上竖提底部的顿笔、竖弯钩的挑尖），
// 终形外框与笔画数据对齐，接笔顺动画时不跳。
// 形态基准（etymology.md「比」条，已核汉典拓片）：甲骨文两人并肩同向、
// 小篆两人紧挨并列四条通长竖线（底部向左下微撇）、刀刻赭石开场——人形族同款。
import { svg, tween, lerp } from '../../util.js';
import { makeStroke, mixStroke, strokePath } from './ribbon.js';

// DOM/笔顺顺序：横、竖提、撇、竖弯钩
const PARTS = ['heng', 'ti', 'pie', 'gou'];

const INK = [34, 29, 26];
// 开场刻字用的赭石色：人形族同款（人、休），最后慢慢沉成墨
const OCHRE = [126, 84, 50];
const colorOf = (rgb) => `rgb(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0})`;

// 甲骨文：两个侧立人形并肩同向（面朝左），对照汉典拓片（zy/jiaguwen/42_F609、F60A）。
// 每人两笔：头身连着垂下的手臂（成竖提/竖弯钩）、站直的腿（成横/撇）。
// 两人几乎同高、贴肩紧挨（拓片 F609 间隙 0.01、F60A 交错；2026-11-20 审计后右人自 0.24 间隙左移贴拢）
// ——这就是「比」，跟「从」的一前一后不一样。
const ORACLE = {
  ti: {
    anchors: [[356, 168], [340, 222], [332, 336], [338, 452], [320, 544], [290, 624], [252, 696], [216, 756]],
    w: [[0, 32], [0.28, 24], [0.62, 20], [1, 15]],
    jitter: 3.5,
  },
  heng: {
    anchors: [[338, 452], [352, 574], [370, 700], [388, 812]],
    w: [[0, 20], [0.6, 21], [1, 29]],
    jitter: 3.5,
  },
  gou: {
    anchors: [[566, 168], [550, 222], [542, 336], [548, 452], [530, 544], [500, 624], [462, 696], [426, 756]],
    w: [[0, 32], [0.28, 24], [0.62, 20], [1, 15]],
    jitter: 3.5,
  },
  pie: {
    anchors: [[548, 452], [562, 574], [580, 700], [598, 812]],
    w: [[0, 20], [0.6, 21], [1, 29]],
    jitter: 3.5,
  },
};

// 小篆：对照说文小篆拓片（img.zdic.net/swxz/6BD4.svg）——两人紧挨并列，
// 每人「头弧＋通长的垂臂」和「通长的腿」各成一线，底部向左下微撇。线条匀称圆转。
const SEAL = {
  ti: {
    anchors: [[400, 252], [344, 186], [272, 176], [224, 210], [206, 284], [196, 400], [188, 520], [180, 640], [168, 730], [146, 790]],
    w: [[0, 30], [1, 30]],
  },
  heng: {
    anchors: [[400, 256], [380, 370], [370, 480], [372, 580], [366, 668], [352, 730], [330, 788]],
    w: [[0, 30], [1, 30]],
  },
  gou: {
    anchors: [[700, 252], [644, 186], [572, 176], [524, 210], [506, 284], [496, 400], [488, 520], [480, 640], [468, 730], [446, 790]],
    w: [[0, 30], [1, 30]],
  },
  pie: {
    anchors: [[700, 256], [680, 370], [670, 480], [672, 580], [666, 668], [652, 730], [630, 788]],
    w: [[0, 30], [1, 30]],
  },
};

// 楷书：中心线沿笔画数据的中线，补上顿笔和挑尖；宽度照真实轮廓的肥瘦
const KAISHU = {
  heng: {
    anchors: [[273, 475], [289, 461], [323, 456], [390, 433], [427, 425], [453, 429]],
    w: [[0, 60], [0.5, 64], [1, 52]],
  },
  ti: {
    anchors: [[196, 249], [243, 291], [247, 340], [246, 480], [232, 610], [222, 700], [208, 770], [190, 822], [214, 800], [300, 712], [431, 613]],
    w: [[0, 60], [0.18, 62], [0.42, 58], [0.58, 66], [0.72, 76], [0.85, 50], [1, 20]],
  },
  pie: {
    anchors: [[778, 275], [788, 289], [795, 324], [695, 391], [588, 448], [578, 462]],
    w: [[0, 72], [0.25, 62], [0.55, 50], [1, 30]],
  },
  gou: {
    anchors: [[501, 126], [535, 152], [561, 189], [548, 400], [544, 618], [556, 705], [578, 758], [620, 786], [690, 800], [790, 800], [865, 780], [886, 760], [890, 600]],
    w: [[0, 64], [0.15, 66], [0.55, 58], [0.75, 60], [0.88, 74], [0.96, 88], [1, 26]],
  },
};

const FORMS = {
  oracle: Object.fromEntries(PARTS.map((p) => [p, makeStroke(ORACLE[p])])),
  seal: Object.fromEntries(PARTS.map((p) => [p, makeStroke(SEAL[p])])),
  kaishu: Object.fromEntries(PARTS.map((p) => [p, makeStroke(KAISHU[p])])),
};

export function createMorph(layer) {
  const root = svg('g', { class: 'morph', 'data-testid': 'morph', opacity: 0 }, layer);
  const paths = {};
  for (const p of PARTS) paths[p] = svg('path', { fill: colorOf(INK), 'data-part': p }, root);

  let state = FORMS.oracle;
  const render = () => {
    for (const p of PARTS) paths[p].setAttribute('d', strokePath(state[p]));
  };
  const setColor = (rgb) => {
    for (const p of PARTS) paths[p].setAttribute('fill', colorOf(rgb));
  };

  return {
    root,
    // 甲骨文开场：字形从两个孩子身上起笔（同一形状，看起来没有切换），
    // 小人淡出的同时长出刀刻的颤动，变成赭石的甲骨文，再慢慢沉成墨。
    async drawOracle(fromStrokes, check) {
      state = fromStrokes;
      render();
      setColor(OCHRE);
      root.setAttribute('opacity', 1);
      const to = FORMS.oracle;
      await tween(
        2400,
        (t) => {
          state = Object.fromEntries(PARTS.map((p) => [p, mixStroke(fromStrokes[p], to[p], t)]));
          render();
        },
        { check },
      );
      state = to;
      await tween(1000, (t) => setColor(OCHRE.map((v, i) => lerp(v, INK[i], t))), { check });
    },
    // 对锚点、宽度、刀刻颤动一起插值，四条笔画同时连续地变形
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
      setColor(INK);
      render();
      root.setAttribute('opacity', 0);
    },
  };
}
