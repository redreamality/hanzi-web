// 「人」从甲骨文到楷书的字形变形。
// 每个字形都是同样两条笔画：头身连着垂臂的长笔（变成楷书的撇）和腿（变成捺），
// 所以实物小人、甲骨文、小篆、楷书可以两两逐点插值，连续地变过去。
// 楷书形态的中心线直接取笔画数据的 medians，接笔顺动画时不跳。
// 形态基准（openspec etymology.md「人」条）：侧立人形——身体直立微前倾、
// 手臂自然下垂、腿站立；甲骨文、小篆都对照汉典拓片（zy/jiaguwen、swxz/4EBA）画，不躬身。
import { svg, tween, lerp } from '../../util.js';
import { makeStroke, mixStroke, strokePath } from './ribbon.js';

const INK = 'rgb(34,29,26)';

const FORMS = {
  // 甲骨文：侧立的人。一笔从头颈下来，身子直立、微微前倾，到腰间顺势
  // 垂下手臂（收在膝下一点）；一笔是腿，从腰间搭出，几乎垂直地踩到地上。
  // 刻痕细，带一点刀刻的颤动。
  oracle: {
    body: {
      anchors: [[508, 165], [492, 217], [486, 328], [492, 443], [474, 534], [442, 612], [402, 680], [360, 726]],
      w: [[0, 32], [0.28, 24], [0.62, 20], [1, 15]],
      jitter: 3.5,
    },
    leg: {
      anchors: [[492, 443], [506, 565], [524, 690], [542, 806]],
      w: [[0, 20], [0.6, 21], [1, 29]],
      jitter: 3.5,
    },
  },
  // 小篆：线条匀称圆转。对照说文小篆拓片（img.zdic.net/swxz/4EBA.svg）：
  // 头顶前倾成一弧（弧的右端搭着肩背），前侧顺势垂下长竖手臂；
  // 腿从肩背起笔，中段轻轻内收，底下向右下撇出。
  seal: {
    body: {
      anchors: [[618, 268], [544, 200], [456, 192], [376, 220], [334, 282], [318, 388], [302, 498], [282, 608], [256, 706], [226, 772]],
      w: [[0, 34], [1, 34]],
    },
    leg: {
      anchors: [[618, 270], [576, 376], [548, 476], [552, 570], [582, 664], [634, 734], [696, 772]],
      w: [[0, 34], [1, 34]],
    },
  },
  // 楷书：中心线就是笔画数据里撇、捺的中线；宽度是沿中线逐点量真实轮廓得出的
  kaishu: {
    body: {
      anchors: [[483, 164], [508, 198], [511, 222], [473, 348], [408, 484], [328, 597], [271, 656], [144, 761], [72, 805]],
      w: [[0, 46], [0.17, 102], [0.25, 90], [0.42, 58], [0.75, 56], [0.92, 30], [1, 16]],
    },
    leg: {
      anchors: [[474, 423], [477, 441], [490, 461], [571, 567], [691, 700], [753, 755], [798, 781], [986, 810]],
      w: [[0, 26], [0.33, 35], [0.58, 70], [0.83, 103], [0.92, 65], [1, 15]],
    },
  },
};

export function createMorph(layer) {
  const root = svg('g', { class: 'morph', 'data-testid': 'morph', opacity: 0 }, layer);
  const bodyPath = svg('path', { fill: INK, 'data-part': 'body' }, root);
  const legPath = svg('path', { fill: INK, 'data-part': 'leg' }, root);
  let state = { body: makeStroke(FORMS.oracle.body), leg: makeStroke(FORMS.oracle.leg) };

  const render = (s) => {
    state = s;
    bodyPath.setAttribute('d', strokePath(s.body));
    legPath.setAttribute('d', strokePath(s.leg));
  };

  return {
    root,
    // 从小人当前的样子（和小人重合）起，长出刀刻的颤动，变成甲骨文
    async drawOracle(fromStrokes, check) {
      render(fromStrokes);
      root.setAttribute('opacity', 1);
      const to = { body: makeStroke(FORMS.oracle.body), leg: makeStroke(FORMS.oracle.leg) };
      await tween(2400, (t) => render({ body: mixStroke(fromStrokes.body, to.body, t), leg: mixStroke(fromStrokes.leg, to.leg, t) }), { check });
    },
    async to(name, ms, check) {
      const from = state;
      const to = { body: makeStroke(FORMS[name].body), leg: makeStroke(FORMS[name].leg) };
      await tween(ms, (t) => render({ body: mixStroke(from.body, to.body, t), leg: mixStroke(from.leg, to.leg, t) }), { check });
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity') ?? 1);
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },
    reset() {
      root.setAttribute('opacity', 0);
      render({ body: makeStroke(FORMS.oracle.body), leg: makeStroke(FORMS.oracle.leg) });
    },
  };
}
