// 「北」从实物到楷书的字形变形。
// 全程五条笔画（DOM 顺序 = 笔顺）：竖、横、提、撇、竖弯钩，
// 在实物/古文字里对应：左人的头身、向左伸的手臂、向左跨的腿，
// 右人向右甩的手臂、头身连着向右扫出的腿（尾巴是脚尖挑起）——
// 两个侧立人形背对背，正是说文「从二人相背」。
// 每个字形只是锚点位置和宽度不同，五条笔画逐点插值就能连续地变过去。
// 楷书锚点沿笔画数据中线手调（补上竖顶的鼓肚、竖弯钩的挑尖），
// 终形外框与笔画数据对齐，接笔顺动画时不跳。
// 形态基准（etymology.md「北」条，已核汉典拓片）：甲骨文两人镜像相背
// （jiaguwen 42_F60B～F60F：左人朝左右人朝右，各=头+内侧长竖+向下外甩的短弧）；
// 小篆（swxz/5317、xiaozhuan 27_5317：每人=头顶横杠+两条通长竖线，外线底端外撇，
// 右人有右下小尾）；刀刻赭石开场——人形族同款。
import { svg, tween, lerp } from '../../util.js';
import { makeStroke, mixStroke, strokePath } from './ribbon.js';

// DOM/笔顺顺序：竖、横、提、撇、竖弯钩
const PARTS = ['shu', 'heng', 'ti', 'pie', 'gou'];

const INK = [34, 29, 26];
// 开场刻字用的赭石色：人形族同款（人、休、从、比），最后慢慢沉成墨
const OCHRE = [126, 84, 50];
const colorOf = (rgb) => `rgb(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0})`;

// 甲骨文：两个侧立人形镜像相背（对照汉典拓片 zy/jiaguwen/42_F60B～F60F）。
// 左人朝左：竖=头＋内侧长竖（背，抵着中缝）；横=自肩向下外甩的手臂；
// 提=顺势向外撇出的小腿。右人朝右，撇=外甩的手臂，竖弯钩=头＋长竖（尾是脚尖）。
// 两人中缝分明，这就是「北」，跟「从」的一前一后、「比」的肩并肩都不一样。
const ORACLE = {
  shu: {
    anchors: [[390, 140], [392, 214], [386, 330], [380, 450], [372, 570], [360, 690], [346, 790], [334, 864]],
    w: [[0, 84], [0.14, 52], [0.4, 36], [0.7, 28], [1, 22]],
    jitter: 3.5,
  },
  heng: {
    anchors: [[380, 290], [330, 330], [282, 382], [240, 442], [206, 504], [182, 560]],
    w: [[0, 46], [0.4, 36], [1, 22]],
    jitter: 3.5,
  },
  ti: {
    anchors: [[350, 660], [312, 724], [272, 788], [242, 850]],
    w: [[0, 30], [0.6, 28], [1, 34]],
    jitter: 3.5,
  },
  pie: {
    anchors: [[700, 290], [740, 330], [786, 382], [822, 442], [846, 504], [862, 560]],
    w: [[0, 46], [0.4, 36], [1, 22]],
    jitter: 3.5,
  },
  gou: {
    anchors: [[630, 140], [624, 214], [616, 330], [610, 450], [606, 570], [610, 690], [622, 790], [640, 858]],
    w: [[0, 84], [0.14, 52], [0.4, 36], [0.7, 28], [1, 22]],
    jitter: 3.5,
  },
};

// 小篆：对照说文小篆拓片（img.zdic.net/swxz/5317.svg、zy/xiaozhuan/27_5317.svg）——
// 每人一个平平的头顶横杠，两条通长的竖线从杠上垂下来，外线底端微微向外撇；
// 右人底部带一点向右下的小尾（竖弯钩扫笔的祖先）。线条匀称圆转，两人中缝分明。
// 五笔的分工：左杠归竖（头），左外线归横（手臂化进去），提叠在外线下段（小腿）；
// 右杠归竖弯钩（起笔从杠右端扫回来再垂下），右外线归撇。
const SEAL = {
  shu: {
    anchors: [[248, 118], [340, 110], [428, 122], [420, 210], [410, 330], [400, 460], [394, 600], [390, 720], [382, 862]],
    w: [[0, 30], [1, 30]],
  },
  heng: {
    anchors: [[302, 130], [300, 220], [306, 330], [310, 460], [308, 600], [300, 740], [282, 874]],
    w: [[0, 30], [1, 30]],
  },
  ti: {
    anchors: [[310, 470], [306, 600], [300, 720], [284, 856]],
    w: [[0, 28], [1, 28]],
  },
  pie: {
    anchors: [[700, 130], [690, 220], [688, 330], [694, 460], [702, 600], [716, 740], [742, 868]],
    w: [[0, 30], [1, 30]],
  },
  gou: {
    anchors: [[806, 120], [700, 112], [632, 120], [614, 210], [598, 330], [584, 460], [576, 600], [578, 720], [600, 828], [682, 878], [790, 884], [858, 862]],
    w: [[0, 30], [1, 30]],
  },
};

// 楷书：中心线沿笔画数据的中线，补上竖顶的鼓肚、撇的方头、竖弯钩的挑尖；
// 宽度照真实轮廓的肥瘦（竖顶和竖弯钩顶上都有个宽宽的顿头）
const KAISHU = {
  shu: {
    anchors: [[341, 193], [367, 215], [388, 248], [387, 340], [385, 480], [381, 620], [376, 723], [381, 798]],
    w: [[0, 50], [0.1, 92], [0.3, 62], [0.6, 54], [0.85, 64], [1, 58]],
  },
  heng: {
    anchors: [[160, 482], [189, 489], [227, 486], [334, 457], [352, 441]],
    w: [[0, 46], [0.3, 56], [0.7, 50], [1, 34]],
  },
  ti: {
    anchors: [[129, 771], [187, 787], [323, 731], [338, 709]],
    w: [[0, 42], [0.35, 58], [0.7, 66], [1, 42]],
  },
  pie: {
    anchors: [[786, 319], [799, 331], [807, 363], [762, 400], [688, 452], [609, 496], [603, 514]],
    w: [[0, 62], [0.12, 86], [0.3, 70], [0.55, 50], [0.8, 28], [1, 12]],
  },
  gou: {
    anchors: [[534, 119], [573, 145], [590, 173], [578, 270], [571, 440], [569, 566], [579, 717], [599, 766], [640, 803], [709, 822], [793, 824], [844, 817], [873, 805], [893, 789], [895, 774], [896, 609]],
    w: [[0, 52], [0.08, 106], [0.18, 64], [0.4, 56], [0.55, 58], [0.7, 66], [0.8, 74], [0.9, 82], [0.97, 86], [1, 20]],
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
    // 对锚点、宽度、刀刻颤动一起插值，五条笔画同时连续地变形
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
