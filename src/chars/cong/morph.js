// 「从」从「二人相随」到楷书的字形变形。
// 四条笔画：前面的人（头身连着垂臂的长笔、腿）、后面的人（同样两条），
// 每个字形下都是同样四条笔画，只是锚点位置和宽度不同，逐点插值就能连续地变过去。
// 甲骨文对照汉典拓片（zy/jiaguwen/42_F5D6～F5DA：两人同向朝左、一前一后相随，
// 前后稍有高低错落）；小篆对照说文拓片（swxz/4ECE：两个窄长人形并立、后一人略低）。
// 楷书形态的中心线直接取自笔画数据，所以最后一步和笔顺动画严丝合缝。
import { svg, tween, lerp } from '../../util.js';
import { makeStroke, mixStroke, strokePath } from './ribbon.js';

const PARTS = ['leadBody', 'leadLeg', 'followBody', 'followLeg'];

const INK = [34, 29, 26];
// 开场刻字用的赭石色：人形族甲骨刻痕的家族色（同「人」「休」），最后慢慢沉成墨
const OCHRE = [126, 84, 50];
const colorOf = (rgb) => `rgb(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0})`;

// 甲骨文：刀刻的直线骨架。两个人都按真实甲骨文「人」形侧立朝左（依 etymology.md「从」条）：
// 一笔是头身——头顶顿笔起，身子直立微前倾，到腰间顺势垂下手臂（收在膝下）；
// 一笔是腿，从腰间搭出踩到地上。前面的人头略高，后面的人略低，两人之间留出空隙。
const ORACLE = {
  leadBody: {
    anchors: [[415, 225], [402, 258], [396, 330], [400, 410], [387, 477], [363, 533], [334, 577], [306, 609]],
    w: [[0, 36], [0.22, 26], [0.55, 21], [1, 16]],
    jitter: 3.5,
  },
  leadLeg: {
    anchors: [[400, 410], [408, 512], [419, 616], [429, 712]],
    w: [[0, 22], [0.6, 23], [1, 30]],
    jitter: 3.5,
  },
  followBody: {
    anchors: [[688, 300], [675, 335], [669, 412], [673, 497], [659, 568], [633, 628], [601, 674], [570, 709]],
    w: [[0, 38], [0.22, 27], [0.55, 22], [1, 17]],
    jitter: 3.5,
  },
  followLeg: {
    anchors: [[673, 497], [682, 606], [694, 717], [705, 819]],
    w: [[0, 23], [0.6, 24], [1, 31]],
    jitter: 3.5,
  },
};

// 小篆：线条匀称圆转。对照说文小篆拓片（img.zdic.net/swxz/4ECE.svg）：
// 每个人是一个窄长的拱——头顶前倾成一弧，弧的两端顺势垂下两条长竖；
// 前面的拱略高，后面的拱整体低一点，两个拱之间空隙分明。
const SEAL = {
  leadBody: {
    anchors: [[455, 232], [410, 200], [362, 197], [322, 212], [298, 246], [290, 306], [283, 386], [274, 470], [262, 556], [250, 636], [242, 700]],
    w: [[0, 28], [1, 28]],
  },
  leadLeg: {
    anchors: [[455, 234], [438, 320], [430, 408], [432, 496], [444, 580], [466, 648], [492, 692]],
    w: [[0, 28], [1, 28]],
  },
  followBody: {
    anchors: [[785, 282], [740, 250], [692, 247], [652, 262], [628, 296], [620, 356], [613, 436], [604, 520], [592, 606], [580, 686], [572, 750]],
    w: [[0, 28], [1, 28]],
  },
  followLeg: {
    anchors: [[785, 284], [768, 370], [760, 458], [762, 546], [774, 630], [796, 698], [822, 742]],
    w: [[0, 28], [1, 28]],
  },
};

// 楷书各笔的宽度：沿中线看着笔画数据的轮廓定的（起笔收笔的肥瘦），
// 中心线就是「从」四笔（左人撇、点，右人撇、捺）的中线，y 换成 900 - y。
const KAISHU = {
  leadBody: {
    anchors: [[257, 200], [294, 221], [320, 253], [298, 484], [272, 593], [241, 669], [188, 751], [123, 814], [54, 855]],
    w: [[0, 30], [0.1, 80], [0.3, 62], [0.6, 58], [0.8, 52], [0.9, 38], [1, 10]],
  },
  leadLeg: {
    anchors: [[318, 578], [318, 589], [415, 673], [435, 703], [443, 736]],
    w: [[0, 6], [0.15, 30], [0.35, 42], [0.6, 56], [0.75, 62], [0.9, 52], [1, 24]],
  },
  followBody: {
    anchors: [[593, 140], [630, 161], [656, 193], [635, 428], [601, 592], [552, 708], [516, 760], [446, 830], [366, 879]],
    w: [[0, 30], [0.1, 84], [0.3, 58], [0.6, 54], [0.8, 56], [0.9, 42], [1, 10]],
  },
  followLeg: {
    anchors: [[650, 541], [655, 579], [711, 665], [760, 733], [820, 799], [850, 823], [991, 862]],
    w: [[0, 4], [0.3, 36], [0.55, 56], [0.7, 78], [0.85, 62], [1, 10]],
  },
};

export function createMorph(layer) {
  const strokesOf = (defs) => Object.fromEntries(PARTS.map((p) => [p, makeStroke(defs[p])]));
  const FORMS = { oracle: strokesOf(ORACLE), seal: strokesOf(SEAL), kaishu: strokesOf(KAISHU) };

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
    // 从画面里两个人当前的样子（和画面重合）起笔，长出刀刻的颤动，变成甲骨文；
    // 赭石刻完，颜色慢慢沉成墨。
    async drawOracle(fromStrokes, check) {
      state = fromStrokes;
      render();
      setColor(OCHRE);
      root.setAttribute('opacity', 1);
      const to = FORMS.oracle;
      await tween(2400, (t) => {
        state = Object.fromEntries(PARTS.map((p) => [p, mixStroke(fromStrokes[p], to[p], t)]));
        render();
      }, { check });
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
