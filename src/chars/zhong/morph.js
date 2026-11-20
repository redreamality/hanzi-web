// 「众」从「放学的人群」到楷书的叠加变形。
// 六条笔画 = 三个人（各两条：身子连手臂、腿），与楷书六笔一一对应：
//   上面的人 → 撇、捺（第一二笔）；左下的人（小）→ 撇、点（第三四笔）；
//   右下的人 → 撇、捺（第五六笔）。下面两个人正好是刚学的「从」。
// 动线：一个人（人）→ 再来一个（从）→ 第三个叠到上面（众，品字，同「森」上木下林）
// → 楷书。每个阶段只是锚点位置和宽度不同，逐点插值连续变形。
// 字形依据：说文㐺「眾立也。从三人」（拓片 swxz/343A 三人并立，见 etymology.md「众」行）；
// 品字叠加是组字演示（取今日楷书的构成），不标榜古文字形。
// 新来的人物先带赭石色（人形族甲骨刻痕的家族色），站定后慢慢沉成墨。
import { svg, tween, wait, lerp } from '../../util.js';
import { makeStroke, mixStroke, strokePath } from './ribbon.js';

// DOM 顺序 = 笔顺顺序（第一二笔是上面的人，三四笔左下，五六笔右下）
const PARTS = ['topBody', 'topLeg', 'frontBody', 'frontLeg', 'backBody', 'backLeg'];

const INK = [34, 29, 26];
const OCHRE = [126, 84, 50];
const colorOf = (rgb) => `rgb(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0})`;

// ---- 各阶段的姿态（侧立人形，同「人」「从」一系：头身一笔、腿一笔）----

// 一个人：舞台中央的大人（「人」课的小人长大了，站在中间）
const ONE = {
  frontBody: {
    anchors: [[508, 172], [493, 226], [486, 338], [492, 452], [477, 530], [455, 600], [429, 660]],
    w: [[0, 86], [0.15, 56], [0.4, 44], [0.68, 34], [1, 20]],
  },
  frontLeg: {
    anchors: [[492, 452], [505, 564], [520, 678], [531, 782]],
    w: [[0, 50], [0.5, 40], [0.85, 34], [1, 44]],
  },
};

// 两个人：左边小一点、右边大一点，一左一右站好（正是「从」的两个人的位置）
const DUO = {
  frontBody: {
    anchors: [[312, 468], [300, 516], [294, 594], [299, 676], [288, 740], [271, 798]],
    w: [[0, 64], [0.15, 42], [0.4, 34], [0.68, 26], [1, 16]],
  },
  frontLeg: {
    anchors: [[299, 676], [309, 760], [321, 836]],
    w: [[0, 40], [0.5, 32], [0.85, 28], [1, 38]],
  },
  backBody: {
    anchors: [[652, 438], [639, 488], [632, 576], [638, 666], [627, 734], [608, 794]],
    w: [[0, 74], [0.15, 48], [0.4, 38], [0.68, 30], [1, 18]],
  },
  backLeg: {
    anchors: [[638, 666], [650, 758], [661, 840]],
    w: [[0, 44], [0.5, 36], [0.85, 30], [1, 40]],
  },
};

// 第三个人：先小身子站在两人中间（RISE），再长高站到上面（TOP）——品字
const RISE = {
  topBody: {
    anchors: [[504, 492], [498, 515], [495, 558], [498, 601], [493, 627]],
    w: [[0, 50], [0.15, 32], [0.4, 26], [0.68, 20], [1, 12]],
  },
  topLeg: {
    anchors: [[498, 601], [502, 622], [505, 640]],
    w: [[0, 30], [0.5, 24], [0.85, 20], [1, 26]],
  },
};
const TOP = {
  topBody: {
    anchors: [[508, 122], [493, 180], [486, 288], [492, 396], [479, 460]],
    w: [[0, 82], [0.15, 52], [0.4, 42], [0.68, 32], [1, 20]],
  },
  topLeg: {
    anchors: [[492, 396], [502, 448], [510, 492]],
    w: [[0, 48], [0.5, 38], [0.85, 32], [1, 42]],
  },
};

// 楷书：中心线取自笔画数据的 medians（y 换成 900 - y），宽度沿中线肥瘦，
// 所以最后一步和笔顺动画严丝合缝。
const KAISHU = {
  topBody: {
    anchors: [[500, 110], [520, 148], [515, 163], [476, 249], [432, 313], [384, 365], [335, 406], [220, 472]],
    w: [[0, 30], [0.1, 78], [0.3, 60], [0.6, 56], [0.8, 50], [0.9, 36], [1, 10]],
  },
  topLeg: {
    anchors: [[512, 257], [511, 266], [555, 308], [716, 430], [764, 443], [889, 454]],
    w: [[0, 4], [0.3, 36], [0.55, 56], [0.7, 76], [0.85, 60], [1, 10]],
  },
  frontBody: {
    anchors: [[326, 494], [354, 536], [287, 669], [200, 773], [113, 841]],
    w: [[0, 24], [0.15, 58], [0.4, 50], [0.7, 42], [0.9, 28], [1, 8]],
  },
  frontLeg: {
    anchors: [[319, 675], [334, 677], [413, 728], [433, 747], [455, 791]],
    w: [[0, 6], [0.15, 30], [0.35, 42], [0.6, 54], [0.75, 60], [0.9, 50], [1, 22]],
  },
  backBody: {
    anchors: [[639, 488], [663, 514], [666, 528], [627, 660], [579, 742], [544, 785], [450, 863]],
    w: [[0, 26], [0.1, 72], [0.3, 56], [0.6, 52], [0.8, 50], [0.9, 36], [1, 10]],
  },
  backLeg: {
    anchors: [[667, 646], [672, 664], [726, 731], [830, 835], [905, 857], [969, 867]],
    w: [[0, 4], [0.3, 36], [0.55, 56], [0.7, 76], [0.85, 60], [1, 10]],
  },
};

export function createMorph(layer) {
  const strokesOf = (defs) => Object.fromEntries(Object.keys(defs).map((p) => [p, makeStroke(defs[p])]));

  const root = svg('g', { class: 'morph', 'data-testid': 'morph', opacity: 0 }, layer);
  const paths = {};
  for (const p of PARTS) paths[p] = svg('path', { fill: colorOf(INK), 'data-part': p }, root);

  // 当前几何；不在台上的人物部件是 null（path 为空，不进联合外框）
  let state = {};
  const inks = Object.fromEntries(PARTS.map((p) => [p, [...INK]]));

  // 只渲染指定部件（并发时各管各的，不覆盖别人正在逐笔 reveal 的 path）
  const renderParts = (list) => {
    for (const p of list) paths[p].setAttribute('d', state[p] ? strokePath(state[p]) : '');
  };
  const paint = (list) => {
    for (const p of list) paths[p].setAttribute('fill', colorOf(inks[p]));
  };

  // 一笔一笔「写」出一个人物（赭石起笔），写完才登记进 state
  const drawFigure = async (defs, parts, check) => {
    const fresh = strokesOf(defs);
    for (const p of parts) {
      inks[p] = [...OCHRE];
      paint([p]);
      await tween(700, (t) => paths[p].setAttribute('d', strokePath(fresh[p], t)), { check });
      state[p] = fresh[p];
    }
  };

  // 新人物站定后，赭石慢慢沉成墨（只动颜色）
  const settle = (parts, ms, check) =>
    tween(ms, (t) => {
      for (const p of parts) inks[p] = OCHRE.map((v, i) => lerp(v, INK[i], t));
      paint(parts);
    }, { check });

  return {
    root,
    // 第一个人：人群散去，中央写出一个大大的「人」（赭石起笔，沉墨）
    async drawOne(check) {
      root.setAttribute('opacity', 1);
      state = {};
      renderParts(PARTS);
      await drawFigure(ONE, ['frontBody', 'frontLeg'], check);
      await settle(['frontBody', 'frontLeg'], 900, check);
    },
    // 第二个人：左边的人挪到「从」的前人位、缩一点；右边赭石写出后人，沉墨
    async addSecond(check) {
      const from = { frontBody: state.frontBody, frontLeg: state.frontLeg };
      const to = strokesOf(DUO);
      const move = tween(2200, (t) => {
        for (const p of ['frontBody', 'frontLeg']) state[p] = mixStroke(from[p], to[p], t);
        renderParts(['frontBody', 'frontLeg']);
      }, { check });
      const arrive = (async () => {
        await wait(500, check);
        await drawFigure(DUO, ['backBody', 'backLeg'], check);
        await settle(['backBody', 'backLeg'], 800, check);
      })();
      await Promise.all([move, arrive]);
      state.frontBody = to.frontBody;
      state.frontLeg = to.frontLeg;
      renderParts(['frontBody', 'frontLeg']);
    },
    // 第三个人：小小地站在两人中间，再往上长高站到最上面（品字），沉墨
    async addTop(check) {
      const rise = strokesOf(RISE);
      const top = strokesOf(TOP);
      inks.topBody = [...OCHRE];
      inks.topLeg = [...OCHRE];
      paint(['topBody', 'topLeg']);
      await tween(500, (t) => {
        paths.topBody.setAttribute('d', strokePath(rise.topBody, Math.min(1, t / 0.6)));
        paths.topLeg.setAttribute('d', t > 0.6 ? strokePath(rise.topLeg, (t - 0.6) / 0.4) : '');
      }, { check });
      state.topBody = rise.topBody;
      state.topLeg = rise.topLeg;
      await wait(200, check);
      await tween(1600, (t) => {
        state.topBody = mixStroke(rise.topBody, top.topBody, t);
        state.topLeg = mixStroke(rise.topLeg, top.topLeg, t);
        renderParts(['topBody', 'topLeg']);
      }, { check });
      await settle(['topBody', 'topLeg'], 800, check);
    },
    // 三个人一起变成楷书的六个笔画
    async toKaishu(ms, check) {
      const from = {};
      for (const p of PARTS) from[p] = state[p] ?? strokesOf(RISE)[p] ?? makeStroke(KAISHU[p]);
      const to = strokesOf(KAISHU);
      await tween(ms, (t) => {
        for (const p of PARTS) state[p] = mixStroke(from[p], to[p], t);
        renderParts(PARTS);
      }, { check });
      state = to;
      renderParts(PARTS);
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity') ?? 1);
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },
    reset() {
      root.setAttribute('opacity', 0);
      state = {};
      for (const p of PARTS) {
        inks[p] = [...INK];
        paths[p].setAttribute('d', '');
        paths[p].setAttribute('fill', colorOf(INK));
      }
    },
  };
}
