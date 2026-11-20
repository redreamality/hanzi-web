// 「北」的实物画面：两个小朋友吵了架，背对着背站着赌气——
// 左边的朝左看（那边是凉凉的远山），右边的朝右看（那边是暖暖的太阳），
// 一个甩着左手指那边，一个甩着右手指这边，谁也不理谁。
// 五条笔画跟字形的五笔一一对应（左人：竖=头身、横=左手臂、提=左腿；
// 右人：撇=右手臂、竖弯钩=头身连着向右跨出的腿，尾巴是翘起的脚尖），
// 交给字形变形起笔用，变形时无缝衔接（形态基准见 morph.js 头注）。
// 人形族同款：赭石暖墨小人＋淡墨晕染；摸一下：两个人一起气鼓鼓地跳，
// 各自把脸别得更开，头顶冒出两团小小的「哼」。
import { svg, tween, wait, lerp, ease } from '../../util.js';
import { makeStroke, strokePath } from './ribbon.js';

// 左边的小朋友（朝左）：头身一笔、向左伸的手臂一笔、向左跨的腿一笔
const POSE_L = {
  shu: {
    anchors: [[348, 152], [352, 232], [360, 350], [366, 470], [368, 590], [372, 690], [380, 790], [384, 828]],
    w: [[0, 92], [0.14, 56], [0.4, 46], [0.7, 42], [1, 34]],
  },
  heng: {
    anchors: [[150, 470], [185, 462], [240, 452], [300, 447], [345, 443]],
    w: [[0, 40], [0.4, 48], [0.8, 44], [1, 34]],
  },
  ti: {
    anchors: [[155, 812], [215, 795], [275, 760], [340, 725]],
    w: [[0, 44], [0.5, 40], [1, 32]],
  },
};
// 右边的小朋友（朝右，个子高一点点）：向右甩的手臂一笔、
// 头身连着向右跨出的腿一笔（从头顶顿下来，直直的背，一步跨出去，脚尖翘起）
const POSE_R = {
  pie: {
    anchors: [[800, 335], [762, 362], [718, 400], [668, 440], [630, 478]],
    w: [[0, 42], [0.4, 48], [0.8, 42], [1, 32]],
  },
  gou: {
    anchors: [[548, 128], [556, 205], [563, 320], [568, 440], [576, 565], [610, 640], [668, 690], [742, 724], [812, 748], [862, 742], [878, 716]],
    w: [[0, 96], [0.14, 58], [0.4, 48], [0.6, 50], [0.72, 54], [0.85, 42], [1, 20]],
  },
};

// 淡墨晕染版：同形放宽，套水彩滤镜（小朋友是大元素，可以用大位移的 wash2）
const haloW = (w) => w.map(([s, v]) => [s, v * 1.6]);

export function createPair(pictureLayer, sceneryLayer) {
  const base = {
    shu: makeStroke(POSE_L.shu), heng: makeStroke(POSE_L.heng), ti: makeStroke(POSE_L.ti),
    pie: makeStroke(POSE_R.pie), gou: makeStroke(POSE_R.gou),
  };
  const haloS = {
    shu: makeStroke({ ...POSE_L.shu, w: haloW(POSE_L.shu.w) }),
    heng: makeStroke({ ...POSE_L.heng, w: haloW(POSE_L.heng.w) }),
    ti: makeStroke({ ...POSE_L.ti, w: haloW(POSE_L.ti.w) }),
    pie: makeStroke({ ...POSE_R.pie, w: haloW(POSE_R.pie.w) }),
    gou: makeStroke({ ...POSE_R.gou, w: haloW(POSE_R.gou.w) }),
  };

  const root = svg('g', { class: 'bei-pair', opacity: 0 }, pictureLayer);
  // 摸哪儿都算摸到：罩住两个小朋友的透明形状（建在 body 里，点空白也算摸到）
  const body = svg('g', {}, root);
  svg('ellipse', { cx: 290, cy: 540, rx: 210, ry: 350, fill: '#000', 'fill-opacity': 0 }, body);
  svg('ellipse', { cx: 700, cy: 480, rx: 230, ry: 360, fill: '#000', 'fill-opacity': 0 }, body);

  // 收尾时挪到字底下、缩小，都动这一层（晕染和地面跟着两个人走）
  const walkG = svg('g', {}, root);
  // 脚下的地面：每人脚下一小段淡墨短影，不横贯画面（审美红线）
  const ground = svg('g', { opacity: 0 }, walkG);
  svg('path', {
    d: 'M150 842 C 210 836 280 838 340 840', fill: 'none', stroke: '#5a5347',
    'stroke-width': 7, 'stroke-linecap': 'round', opacity: 0.4, filter: 'url(#wash2)',
  }, ground);
  svg('path', {
    d: 'M560 838 C 640 830 730 832 810 838', fill: 'none', stroke: '#5a5347',
    'stroke-width': 7, 'stroke-linecap': 'round', opacity: 0.4, filter: 'url(#wash2)',
  }, ground);
  // 淡墨晕染（两个小人各一团，中间留着干净的纸缝——背对背，不挨着）
  const halo = svg('g', { opacity: 0, filter: 'url(#wash2)' }, walkG);
  const haloPaths = {};
  for (const p of ['shu', 'heng', 'ti', 'pie', 'gou']) {
    haloPaths[p] = svg('path', { fill: '#4a423a', opacity: 0.5 }, halo);
  }
  // 摸一下的时候一起蹦：外层管蹦＋别脸（pulse 的 transform），内层管呼吸（CSS 动画）
  const hopG = svg('g', {}, walkG);
  const kidL = svg('g', {}, hopG);
  const kidR = svg('g', {}, hopG);
  const innerL = svg('g', { class: 'kid-inner breathing' }, kidL);
  const innerR = svg('g', { class: 'kid-inner breathing breathing-late' }, kidR);
  const paths = {};
  for (const p of ['shu', 'heng', 'ti']) paths[p] = svg('path', { fill: '#241f1b', 'data-part': p }, innerL);
  for (const p of ['pie', 'gou']) paths[p] = svg('path', { fill: '#241f1b', 'data-part': p }, innerR);

  const render = () => {
    for (const p of ['shu', 'heng', 'ti', 'pie', 'gou']) {
      paths[p].setAttribute('d', strokePath(base[p]));
      haloPaths[p].setAttribute('d', strokePath(haloS[p]));
    }
  };
  // 一笔一笔「写」出来：先左边的（头身、手臂、腿），再右边的（跨出的腿、手臂）
  const reveal = { shu: 0, heng: 0, ti: 0, pie: 0, gou: 0 };
  const drawInk = () => {
    paths.shu.setAttribute('d', strokePath(base.shu, reveal.shu));
    paths.heng.setAttribute('d', strokePath(base.heng, reveal.heng));
    paths.ti.setAttribute('d', strokePath(base.ti, reveal.ti));
    paths.pie.setAttribute('d', strokePath(base.pie, reveal.pie));
    paths.gou.setAttribute('d', strokePath(base.gou, reveal.gou));
  };

  // 远处：左边凉凉的青灰远山和一弯淡淡的冷月，右边暖暖的赭石山和一轮暖日（背景层 1600×1000）
  let scenery = null;
  const buildScenery = () => {
    sceneryLayer.replaceChildren();
    scenery = svg('g', { opacity: 0 }, sceneryLayer);
    const hills = svg('g', { filter: 'url(#mist-wash)' }, scenery);
    svg('path', {
      d: 'M40 820 C 200 650 350 630 480 820 Z', fill: '#44586b', opacity: 0.12,
    }, hills);
    svg('path', {
      d: 'M1000 812 C 1160 610 1320 590 1460 812 Z', fill: '#6b5a42', opacity: 0.13,
    }, hills);
    svg('circle', { cx: 320, cy: 200, r: 46, fill: '#a9c0cf', opacity: 0.32, filter: 'url(#glow)' }, scenery);
    svg('circle', { cx: 1240, cy: 176, r: 62, fill: '#e6c07e', opacity: 0.5, filter: 'url(#glow)' }, scenery);
    svg('circle', { cx: 1240, cy: 176, r: 30, fill: '#eed9a8', opacity: 0.4 }, scenery);
    // 冷山边两缕淡淡的北风（小元素用 #ink 轻滤镜，不用 wash2）
    svg('path', {
      d: 'M120 300 C 200 270 280 270 350 296', fill: 'none', stroke: '#7d93a4',
      'stroke-width': 8, 'stroke-linecap': 'round', opacity: 0.22, filter: 'url(#ink)',
    }, scenery);
    svg('path', {
      d: 'M170 380 C 240 356 300 356 356 376', fill: 'none', stroke: '#7d93a4',
      'stroke-width': 6, 'stroke-linecap': 'round', opacity: 0.16, filter: 'url(#ink)',
    }, scenery);
  };

  return {
    root,
    body,
    // 小朋友们当前的几何，给字形变形起笔（键与 morph 的笔画对应）
    form: () => base,
    // 像有人在宣纸上作画：冷山暖山先洇开，两个小朋友一笔一笔写出来，墨色再晕开一点
    async appear(check, { fast = false } = {}) {
      root.setAttribute('opacity', 1);
      halo.setAttribute('opacity', 0);
      for (const p of ['shu', 'heng', 'ti', 'pie', 'gou']) reveal[p] = 0;
      drawInk();
      if (!fast) {
        buildScenery();
        tween(2000, (t) => scenery.setAttribute('opacity', t), { check }).catch(() => {});
      }
      const k = fast ? 0.12 : 1;
      await tween(360 * k, (t) => ground.setAttribute('opacity', t), { check });
      await tween(1100 * k, (t) => { reveal.shu = t; drawInk(); }, { check, easing: ease.inOut });
      await tween(750 * k, (t) => { reveal.heng = t; drawInk(); }, { check });
      await tween(600 * k, (t) => { reveal.ti = t; drawInk(); }, { check });
      await wait(90 * k, check);
      await tween(1200 * k, (t) => { reveal.gou = t; drawInk(); }, { check, easing: ease.inOut });
      await tween(760 * k, (t) => { reveal.pie = t; drawInk(); }, { check });
      render();
      await tween(620 * k, (t) => halo.setAttribute('opacity', t * 0.5), { check });
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity'));
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },
    // 摸一下：两个人气鼓鼓地一起蹦一下，各自把脸别得更开，头顶冒出两团小小的「哼」
    async pulse() {
      const puffAt = (cx, cy) =>
        svg('ellipse', { cx, cy, rx: 20, ry: 14, fill: '#4a423a', opacity: 0, filter: 'url(#ink)' }, hopG);
      const puffs = [puffAt(316, 118), puffAt(652, 96)];
      await tween(
        1400,
        (t) => {
          const hop = Math.sin(t * Math.PI);
          hopG.setAttribute('transform', `translate(0 ${(-30 * hop).toFixed(1)})`);
          kidL.setAttribute('transform', `rotate(${(-4.5 * hop * (1 - 0.25 * t)).toFixed(2)} 372 822)`);
          kidR.setAttribute('transform', `rotate(${(4.5 * hop * (1 - 0.25 * t)).toFixed(2)} 620 822)`);
          const po = Math.sin(Math.min(1, t * 1.35) * Math.PI);
          puffs[0].setAttribute('opacity', (0.5 * po).toFixed(2));
          puffs[1].setAttribute('opacity', (0.5 * po).toFixed(2));
          puffs[0].setAttribute('cy', (118 - 44 * t).toFixed(1));
          puffs[1].setAttribute('cy', (96 - 44 * t).toFixed(1));
        },
        { easing: ease.inOut },
      );
      hopG.setAttribute('transform', '');
      kidL.setAttribute('transform', '');
      kidR.setAttribute('transform', '');
      puffs.forEach((p) => p.remove());
    },
    // 收尾：挪到字底下缩小站好（还是背对背，正好在北字底下那块空地里）
    setPlaced({ scale = 1, cx = 500, cy = 500 } = {}) {
      walkG.setAttribute('transform', `translate(${cx - scale * 500} ${cy - scale * 500}) scale(${scale})`);
    },
    reset() {
      root.setAttribute('opacity', 1);
      walkG.setAttribute('transform', '');
      hopG.setAttribute('transform', '');
      kidL.setAttribute('transform', '');
      kidR.setAttribute('transform', '');
      halo.setAttribute('opacity', 0);
      ground.setAttribute('opacity', 0);
      for (const p of ['shu', 'heng', 'ti', 'pie', 'gou']) reveal[p] = 0;
      drawInk();
      root.setAttribute('opacity', 0);
      sceneryLayer.replaceChildren();
      scenery = null;
    },
  };
}
