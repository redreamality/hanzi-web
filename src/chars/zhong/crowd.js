// 放学的人群：操场上七个水墨小人，高高低低站成一群（「众」的实物画面）。
// 每个小人还是两条笔画（头身连手臂、腿），是「人」「从」一族的侧立人形；
// 有人背着赭石色的小书包，脚边滚着一颗球，两小段地只落在人群脚下（不横贯画面）。
// 摸一下：大家一起轻轻蹦起来，球也蹦，脚下荡开一圈晕。
import { svg, tween, lerp, ease } from '../../util.js';
import { makeStroke, strokePath } from './ribbon.js';

const INK = '#2a241e'; // 人形族的墨里带一点赭石暖（同「人」「休」「从」的小人）
const BAG = '#8a5a36'; // 赭石小书包

// 基准小人（胯在原点，头顶朝上）：一笔头身连垂下的手臂，一笔腿
const POSE = {
  body: {
    anchors: [[0, -238], [-11, -186], [-16, -104], [-10, -20], [-22, 52], [-40, 110]],
    w: [[0, 64], [0.15, 42], [0.4, 34], [0.68, 26], [1, 16]],
  },
  leg: {
    anchors: [[-10, -20], [0, 66], [12, 150], [20, 218]],
    w: [[0, 36], [0.5, 30], [0.85, 26], [1, 34]],
  },
};
// 举手变体：手臂向上扬起（放学看到家人，兴奋打招呼）
const POSE_WAVE = {
  ...POSE,
  body: {
    ...POSE.body,
    anchors: [[0, -238], [-11, -186], [-16, -104], [-10, -20], [14, -68], [36, -136]],
  },
};

// 七个小朋友：中间的大一点，两边渐小，有的朝左有的朝右，挤成一群
const KIDS = [
  { x: 525, hip: 600, s: 1.2 },                       // 中间的大孩子
  { x: 305, hip: 650, s: 1.0 },                       // 左边
  { x: 700, hip: 680, s: 0.9 },                       // 右边
  { x: 415, hip: 712, s: 0.75, bag: true },           // 左中的小不点，背书包
  { x: 815, hip: 640, s: 1.05 },                      // 右边的大孩子
  { x: 610, hip: 726, s: 0.7, wave: true, bag: true },// 中右的小不点，举手，背书包
  { x: 185, hip: 736, s: 0.65, flip: true },          // 最左的小不点，朝右看
];

// 两小段地（只落在脚边，不横贯画面）
const GROUNDS = ['M180 880 C 280 892 400 894 500 888', 'M540 894 C 640 902 740 900 860 892'];

export function createCrowd(layer) {
  const root = svg('g', { class: 'crowd', opacity: 0 }, layer);
  const body = svg('g', {}, root); // 引擎会给它加 data-testid="picture"

  // 一整片淡墨晕染罩住人群（连成一片的热闹气场）
  const haloG = svg('g', { opacity: 0 }, body);
  svg('ellipse', { cx: 500, cy: 690, rx: 420, ry: 240, fill: '#4a423a', opacity: 0.25, filter: 'url(#wash2)' }, haloG);

  const groundG = svg('g', { opacity: 0 }, body);
  for (const d of GROUNDS) {
    svg('path', { d, fill: 'none', stroke: '#3a332c', 'stroke-width': 11, 'stroke-linecap': 'round', opacity: 0.25 }, groundG);
  }

  // 人群
  const kids = KIDS.map((k, i) => {
    const place = svg('g', { transform: `translate(${k.x} ${k.hip}) scale(${k.flip ? -k.s : k.s} ${k.s})` }, body);
    const hop = svg('g', {}, place);
    const fig = svg('g', { class: 'zhong-kid' }, hop);
    fig.style.animationDuration = `${3.2 + (i % 4) * 0.55}s`;
    fig.style.animationDelay = `${-(i * 0.8)}s`;
    let bag = null;
    if (k.bag) {
      bag = svg('ellipse', { cx: 17, cy: -112, rx: 17, ry: 23, transform: 'rotate(-12 17 -112)', fill: BAG, opacity: 0.8, filter: 'url(#ink)' }, fig);
    }
    const pose = k.wave ? POSE_WAVE : POSE;
    const bodyPath = svg('path', { fill: INK, 'data-part': 'body' }, fig);
    const legPath = svg('path', { fill: INK, 'data-part': 'leg' }, fig);
    const base = { body: makeStroke(pose.body), leg: makeStroke(pose.leg) };
    return { ...k, hop, fig, bag, paths: { body: bodyPath, leg: legPath }, base, reveal: { body: 0, leg: 0 } };
  });
  const renderKid = (kid) => {
    kid.paths.body.setAttribute('d', strokePath(kid.base.body, kid.reveal.body));
    kid.paths.leg.setAttribute('d', strokePath(kid.base.leg, kid.reveal.leg));
  };

  // 皮球（小元素：不用 wash2，轻滤镜）
  const decoG = svg('g', { opacity: 0 }, body);
  svg('circle', { cx: 893, cy: 850, r: 21, fill: '#b4653c', opacity: 0.85, filter: 'url(#ink)' }, decoG);
  svg('path', { d: 'M884 843 Q 893 850 902 843', fill: 'none', stroke: '#f2e8d5', 'stroke-width': 3, opacity: 0.5 }, decoG);

  // 透明命中罩：孩子戳到人群附近的空白也算摸到了（压在最上层，防止被后画的元素盖住）
  const hit = svg('ellipse', { cx: 500, cy: 700, rx: 430, ry: 310, fill: 'transparent' }, body);
  hit.style.pointerEvents = 'all';

  return {
    root,
    body,
    // 像有人在宣纸上作画：晕染铺开，小朋友一个一个写出来，最后球滚过来、地抹两笔
    async appear(check) {
      root.setAttribute('opacity', 1);
      haloG.setAttribute('opacity', 0);
      groundG.setAttribute('opacity', 0);
      decoG.setAttribute('opacity', 0);
      for (const kid of kids) kid.reveal = { body: 0, leg: 0 };
      kids.forEach(renderKid);
      await tween(500, (t) => haloG.setAttribute('opacity', t), { check });
      // 从中间往两边，一批一批冒出来
      const batches = [[kids[0]], [kids[1], kids[2]], [kids[3], kids[5]], [kids[6], kids[4]]];
      for (const batch of batches) {
        await Promise.all(
          batch.map(async (kid) => {
            await tween(430, (t) => { kid.reveal.body = t; renderKid(kid); }, { check });
            await tween(300, (t) => { kid.reveal.leg = t; renderKid(kid); }, { check });
          }),
        );
      }
      await Promise.all([
        tween(350, (t) => decoG.setAttribute('opacity', t), { check }),
        tween(400, (t) => groundG.setAttribute('opacity', t), { check }),
      ]);
    },
    // 摸一下：一群人一起蹦一下，球蹦得更高，脚下荡开一圈晕
    async pulse() {
      const ring = svg('ellipse', { cx: 500, cy: 878, rx: 330, ry: 44, fill: 'none', stroke: '#4a423a', 'stroke-width': 12, filter: 'url(#wash2)' }, body);
      ring.style.pointerEvents = 'none';
      await tween(
        950,
        (t) => {
          const h = Math.sin(t * Math.PI);
          for (const kid of kids) kid.hop.setAttribute('transform', `translate(0 ${(-20 * kid.s * h).toFixed(1)})`);
          decoG.setAttribute('transform', `translate(0 ${(-34 * h).toFixed(1)})`);
          ring.setAttribute('rx', lerp(330, 520, t));
          ring.setAttribute('ry', lerp(44, 70, t));
          ring.setAttribute('opacity', 0.5 * (1 - t));
        },
        { easing: ease.out },
      );
      for (const kid of kids) kid.hop.setAttribute('transform', '');
      decoG.setAttribute('transform', '');
      ring.remove();
    },
    // 收尾：人群又淡淡地站回大字后面（合影）。
    // 注意：进描红时引擎会 resetAll，人群已被清空——必须先把每个人重画完整，再淡入
    //（只恢复 root 透明度的话，done 场景会什么都看不见）
    async finaleIn(check) {
      for (const kid of kids) kid.reveal = { body: 1, leg: 1 };
      kids.forEach(renderKid);
      haloG.setAttribute('opacity', 1);
      groundG.setAttribute('opacity', 1);
      decoG.setAttribute('opacity', 1);
      root.setAttribute('opacity', 0);
      await tween(1100, (t) => root.setAttribute('opacity', 0.3 * t), { check });
    },
    // 收尾后再轻轻蹦一下，像合影时大家一起喊茄子
    async wave(check) {
      await tween(
        1100,
        (t) => {
          const h = Math.sin(t * Math.PI);
          for (const kid of kids) kid.hop.setAttribute('transform', `translate(0 ${(-14 * kid.s * h).toFixed(1)})`);
        },
        { check },
      );
      for (const kid of kids) kid.hop.setAttribute('transform', '');
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity'));
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },
    reset() {
      root.setAttribute('opacity', 0);
      haloG.setAttribute('opacity', 0);
      groundG.setAttribute('opacity', 0);
      decoG.setAttribute('opacity', 0);
      decoG.setAttribute('transform', '');
      for (const kid of kids) {
        kid.reveal = { body: 0, leg: 0 };
        kid.hop.setAttribute('transform', '');
        renderKid(kid);
      }
    },
  };
}
