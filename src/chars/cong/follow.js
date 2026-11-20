// 水墨二人组：大人牵着孩子，一前一后朝左走（「从」的相随画面）。
// 每人还是两条笔画：一笔从圆圆的头顿下来，直着身子微微前倾，
// 到腰间甩出手臂——大人的手臂向后伸，孩子的手臂向前够，两只手牵在一起；
// 一笔是腿，从腰间搭出踩向左前方，正走在路上。
// 四条笔画跟字形的四笔一一对应，变形时无缝衔接（形态基准见 morph.js 头注）。
import { svg, tween, lerp, ease } from '../../util.js';
import { makeStroke, strokePath } from './ribbon.js';

const INK = '#2a241e'; // 人形族的墨里带一点赭石暖（同「休」的小人）

const POSE = {
  leadBody: {
    // 大人：头、背、腰，再到向后牵孩子的手臂
    anchors: [[320, 235], [312, 282], [306, 360], [312, 452], [318, 478], [368, 505], [446, 538]],
    w: [[0, 92], [0.15, 60], [0.4, 48], [0.6, 40], [0.78, 33], [1, 26]],
  },
  leadLeg: {
    anchors: [[312, 452], [298, 565], [282, 668], [268, 748]],
    w: [[0, 52], [0.5, 42], [0.85, 36], [1, 46]],
  },
  followBody: {
    // 孩子：个头小一点，手臂向前上方够着大人的手
    anchors: [[596, 352], [590, 392], [585, 455], [590, 535], [540, 566], [462, 556]],
    w: [[0, 74], [0.15, 48], [0.4, 40], [0.6, 34], [0.78, 28], [1, 22]],
  },
  followLeg: {
    anchors: [[590, 535], [576, 625], [562, 712], [552, 782]],
    w: [[0, 42], [0.5, 34], [0.85, 30], [1, 38]],
  },
};

// 脚下的两小段地（只落在脚边，不横贯画面）；身后的脚印诉说着「一路跟着走」
const GROUNDS = ['M225 764 C 300 774 380 774 452 766', 'M505 796 C 560 804 630 804 688 798'];
const PRINTS = [
  { x: 742, y: 772, rot: -18, o: 0.55 },
  { x: 770, y: 790, rot: -8, o: 0.55 },
  { x: 822, y: 752, rot: -14, o: 0.42 },
  { x: 850, y: 770, rot: -4, o: 0.42 },
  { x: 900, y: 780, rot: -10, o: 0.3 },
  { x: 926, y: 794, rot: 0, o: 0.3 },
];

export function createFollow(layer) {
  const base = Object.fromEntries(Object.keys(POSE).map((p) => [p, makeStroke(POSE[p])]));

  const root = svg('g', { class: 'follow-pair', opacity: 0 }, layer);
  const body = svg('g', {}, root); // 引擎会给它加 data-testid="picture"
  // 透明命中区：孩子戳到两个人附近的空白也算摸到了
  const hit = svg('ellipse', { cx: 440, cy: 520, rx: 340, ry: 330, fill: 'transparent' }, body);
  hit.style.pointerEvents = 'all';
  const walkG = svg('g', {}, body); // 收尾时挪到字底下、缩小，都动这一层
  const haloG = svg('g', { opacity: 0 }, walkG);
  // 一整片淡墨晕染罩住牵着手的两个人（连成一片，不分你我，正好是「跟着走」的气场）
  svg('ellipse', { cx: 450, cy: 545, rx: 330, ry: 295, fill: '#4a423a', opacity: 0.3, filter: 'url(#wash2)' }, haloG);
  const printsG = svg('g', { opacity: 0 }, walkG);
  for (const { x, y, rot, o } of PRINTS) {
    svg('ellipse', { cx: x, cy: y, rx: 16, ry: 9, transform: `rotate(${rot} ${x} ${y})`, fill: '#4a423a', opacity: o, filter: 'url(#ink)' }, printsG);
  }
  const groundG = svg('g', { opacity: 0 }, walkG);
  const grounds = GROUNDS.map((d) =>
    svg('path', { d, fill: 'none', stroke: '#3a332c', 'stroke-width': 12, 'stroke-linecap': 'round', opacity: 0.25 }, groundG)
  );
  const hopG = svg('g', {}, walkG); // 摸一下的时候，两个人一起轻轻跳
  const adultG = svg('g', { class: 'cong-fig' }, hopG);
  const childG = svg('g', { class: 'cong-fig child' }, hopG);
  const paths = {
    leadBody: svg('path', { fill: INK, 'data-part': 'leadBody' }, adultG),
    leadLeg: svg('path', { fill: INK, 'data-part': 'leadLeg' }, adultG),
    followBody: svg('path', { fill: INK, 'data-part': 'followBody' }, childG),
    followLeg: svg('path', { fill: INK, 'data-part': 'followLeg' }, childG),
  };

  const reveal = Object.fromEntries(Object.keys(POSE).map((p) => [p, 0]));
  const render = () => {
    for (const p of Object.keys(POSE)) paths[p].setAttribute('d', strokePath(base[p], reveal[p]));
  };
  render();

  return {
    root,
    body,
    // 画面里两个人当前的几何，给字形变形做起笔
    form: () => base,
    // 像有人在宣纸上作画：先写大人（身、腿），再写孩子（身、腿），
    // 最后抹两笔地、点上脚印，墨色再洇开一点
    async appear(check) {
      root.setAttribute('opacity', 1);
      haloG.setAttribute('opacity', 0);
      groundG.setAttribute('opacity', 0);
      printsG.setAttribute('opacity', 0);
      for (const p of Object.keys(POSE)) reveal[p] = 0;
      render();
      await tween(1050, (t) => { reveal.leadBody = t; render(); }, { check });
      await tween(700, (t) => { reveal.leadLeg = t; render(); }, { check });
      await tween(950, (t) => { reveal.followBody = t; render(); }, { check });
      await tween(650, (t) => { reveal.followLeg = t; render(); }, { check });
      await tween(450, (t) => groundG.setAttribute('opacity', t), { check });
      await tween(500, (t) => printsG.setAttribute('opacity', t), { check });
      await tween(500, (t) => haloG.setAttribute('opacity', t), { check });
    },
    // 摸一下：牵着手的两个人一起蹦一下，脚下荡开一圈晕
    //（晕圈建在 walkG 里，收尾挪位缩小后它也跟着两个人走）
    async pulse() {
      const ring = svg('ellipse', { cx: 450, cy: 780, rx: 260, ry: 40, fill: 'none', stroke: '#4a423a', 'stroke-width': 12, filter: 'url(#wash2)' }, walkG);
      await tween(
        950,
        (t) => {
          hopG.setAttribute('transform', `translate(${-12 * Math.sin(t * Math.PI)} ${-26 * Math.sin(t * Math.PI)})`);
          ring.setAttribute('rx', lerp(260, 430, t));
          ring.setAttribute('ry', lerp(40, 66, t));
          ring.setAttribute('opacity', 0.5 * (1 - t));
        },
        { easing: ease.out },
      );
      hopG.setAttribute('transform', '');
      ring.remove();
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity'));
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },
    // 收尾：挪到字底下缩小站好（脚印和地也跟着，像刚从右边一路走来）
    setPlaced({ scale = 1, cx = 500, cy = 500 } = {}) {
      walkG.setAttribute('transform', `translate(${cx - scale * 500} ${cy - scale * 500}) scale(${scale})`);
    },
    reset() {
      for (const p of Object.keys(POSE)) reveal[p] = 0;
      render();
      root.setAttribute('opacity', 0);
      haloG.setAttribute('opacity', 0);
      groundG.setAttribute('opacity', 0);
      printsG.setAttribute('opacity', 0);
      hopG.setAttribute('transform', '');
      walkG.setAttribute('transform', '');
    },
  };
}
