// 「人」从甲骨文到楷书的字形变形。
// 每个字形都是同样两条笔画：躬身垂臂的长笔（变成楷书的撇）和腿（变成捺），
// 所以实物小人、甲骨文、小篆、楷书可以两两逐点插值，连续地变过去。
// 楷书形态的中心线直接取笔画数据的 medians，接笔顺动画时不跳。
import { svg, tween, lerp } from '../../util.js';
import { makeStroke, mixStroke, strokePath } from './ribbon.js';

const INK = 'rgb(34,29,26)';

const FORMS = {
  // 甲骨文：侧立的人。头身一笔向下弯（起笔的小折是头），末段顺势撇出成垂下的手臂；
  // 腿从腰上搭出，向右下踩稳。刻痕细，带一点刀刻的颤动。
  oracle: {
    body: {
      anchors: [[484, 180], [462, 232], [500, 300], [530, 392], [514, 478], [466, 556], [386, 632], [296, 690]],
      w: [[0, 30], [0.3, 23], [0.7, 21], [1, 17]],
      jitter: 3.5,
    },
    leg: {
      anchors: [[496, 478], [550, 568], [620, 662], [678, 738], [714, 790]],
      w: [[0, 20], [0.6, 21], [1, 29]],
      jitter: 3.5,
    },
  },
  // 小篆：线条匀称圆转，还是那个弯腰的人
  seal: {
    body: {
      anchors: [[512, 212], [544, 300], [530, 420], [476, 540], [392, 636], [296, 706], [218, 752]],
      w: [[0, 34], [1, 34]],
    },
    leg: {
      anchors: [[500, 438], [538, 520], [618, 614], [706, 700], [770, 752], [820, 788]],
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
  const bodyPath = svg('path', { fill: INK }, root);
  const legPath = svg('path', { fill: INK }, root);
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
