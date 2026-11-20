// 「比」的实物画面：两个水墨小朋友肩挨着肩站着，在比谁的个子高——
// 左边的小朋友矮一点，右边的哥哥高一点。
// 摸一下：矮的小朋友踮起脚尖使劲长高，高的小朋友得意地点点头。
// 每个小朋友都是两条笔画（头身连着垂下的手臂、站直的腿），与字形的四笔一一对应，
// 交给字形变形起笔用：左身臂→竖提、左腿→横、右腿→撇、右身臂→竖弯钩。
// 人形族同款：赭石＋淡墨（人、休），远处淡淡的远山和一轮暖日放在背景层。
import { svg, tween, wait, lerp, ease } from '../../util.js';
import { makeStroke, strokePath } from './ribbon.js';

// 左边的小朋友（矮一点）：头身一笔、腿一笔
const POSE_L = {
  ti: {
    anchors: [[356, 320], [342, 374], [338, 460], [344, 548], [330, 618], [312, 682], [288, 738], [266, 780]],
    w: [[0, 72], [0.16, 48], [0.4, 38], [0.68, 30], [1, 18]],
  },
  heng: {
    anchors: [[344, 548], [356, 636], [370, 724], [382, 786], [390, 812]],
    w: [[0, 42], [0.5, 34], [0.85, 30], [1, 38]],
  },
};
// 右边的小朋友（高一点）：同样两笔，个子高些
const POSE_R = {
  gou: {
    anchors: [[666, 240], [648, 304], [642, 408], [650, 514], [634, 594], [612, 666], [584, 732], [556, 784]],
    w: [[0, 78], [0.16, 52], [0.4, 42], [0.68, 32], [1, 20]],
  },
  pie: {
    anchors: [[650, 514], [664, 612], [680, 710], [694, 780], [702, 812]],
    w: [[0, 46], [0.5, 38], [0.85, 32], [1, 42]],
  },
};

// 淡墨晕染版：同形放宽，套水彩滤镜（小朋友是大元素，可以用大位移的 wash2）
const haloW = (w) => w.map(([s, v]) => [s, v * 1.6]);

export function createPair(pictureLayer, sceneryLayer) {
  const base = {
    ti: makeStroke(POSE_L.ti), heng: makeStroke(POSE_L.heng),
    gou: makeStroke(POSE_R.gou), pie: makeStroke(POSE_R.pie),
  };
  const haloS = {
    ti: makeStroke({ ...POSE_L.ti, w: haloW(POSE_L.ti.w) }),
    heng: makeStroke({ ...POSE_L.heng, w: haloW(POSE_L.heng.w) }),
    gou: makeStroke({ ...POSE_R.gou, w: haloW(POSE_R.gou.w) }),
    pie: makeStroke({ ...POSE_R.pie, w: haloW(POSE_R.pie.w) }),
  };

  const root = svg('g', { class: 'bi-pair', opacity: 0 }, pictureLayer);
  // 摸哪儿都算摸到：罩住两个小朋友的透明形状
  const body = svg('g', {}, root);
  svg('ellipse', { cx: 330, cy: 570, rx: 190, ry: 300, fill: '#000', 'fill-opacity': 0 }, body);
  svg('ellipse', { cx: 640, cy: 530, rx: 200, ry: 330, fill: '#000', 'fill-opacity': 0 }, body);

  // 脚下的地面：每人脚下一小段淡墨短影，不横贯画面（审美红线）
  const ground = svg('g', { opacity: 0 }, root);
  svg('path', {
    d: 'M252 828 C 300 822 348 824 396 826', fill: 'none', stroke: '#5a5347',
    'stroke-width': 7, 'stroke-linecap': 'round', opacity: 0.4, filter: 'url(#wash2)',
  }, ground);
  svg('path', {
    d: 'M548 828 C 600 822 656 824 708 826', fill: 'none', stroke: '#5a5347',
    'stroke-width': 7, 'stroke-linecap': 'round', opacity: 0.4, filter: 'url(#wash2)',
  }, ground);

  // 淡墨晕染
  const halo = svg('g', { opacity: 0, filter: 'url(#wash2)' }, root);
  const haloPaths = {};
  for (const p of ['ti', 'heng', 'gou', 'pie']) {
    haloPaths[p] = svg('path', { fill: '#4a423a', opacity: 0.5 }, halo);
  }

  // 两个小朋友：外层管踮脚/点头（pulse 的 transform），内层管呼吸（CSS 动画），互不干扰
  const kidL = svg('g', {}, root);
  const kidR = svg('g', {}, root);
  const innerL = svg('g', { class: 'kid-inner breathing' }, kidL);
  const innerR = svg('g', { class: 'kid-inner breathing' }, kidR);
  const paths = {};
  for (const p of ['ti', 'heng']) paths[p] = svg('path', { fill: '#241f1b', 'data-part': p }, innerL);
  for (const p of ['gou', 'pie']) paths[p] = svg('path', { fill: '#241f1b', 'data-part': p }, innerR);

  const render = () => {
    for (const p of ['ti', 'heng', 'gou', 'pie']) {
      paths[p].setAttribute('d', strokePath(base[p]));
      haloPaths[p].setAttribute('d', strokePath(haloS[p]));
    }
  };
  // 一笔一笔「写」出来：左小朋友先（身子、腿），右小朋友跟着（身子、腿）
  const reveal = { ti: 0, heng: 0, gou: 0, pie: 0 };
  const drawInk = () => {
    paths.ti.setAttribute('d', strokePath(base.ti, reveal.ti));
    paths.heng.setAttribute('d', strokePath(base.heng, reveal.heng));
    paths.gou.setAttribute('d', strokePath(base.gou, reveal.gou));
    paths.pie.setAttribute('d', strokePath(base.pie, reveal.pie));
  };

  // 远处淡淡的远山和一轮暖日（背景层 1600×1000）
  let scenery = null;
  const buildScenery = () => {
    sceneryLayer.replaceChildren();
    scenery = svg('g', { opacity: 0 }, sceneryLayer);
    const hills = svg('g', { filter: 'url(#mist-wash)' }, scenery);
    svg('path', {
      d: 'M60 810 C 260 640 420 620 560 810 Z', fill: '#3f4b50', opacity: 0.1,
    }, hills);
    svg('path', {
      d: 'M900 812 C 1080 600 1260 580 1420 812 Z', fill: '#3f4b50', opacity: 0.12,
    }, hills);
    svg('circle', { cx: 1240, cy: 176, r: 62, fill: '#e6c07e', opacity: 0.5, filter: 'url(#glow)' }, scenery);
    svg('circle', { cx: 1240, cy: 176, r: 30, fill: '#eed9a8', opacity: 0.4 }, scenery);
  };

  const scaleAt = (g, [ox, oy], sx, sy) => g.setAttribute('transform', `translate(${ox} ${oy}) scale(${sx} ${sy}) translate(${-ox} ${-oy})`);

  return {
    root,
    body,
    // 小朋友们当前的几何，给字形变形起笔（键与 morph 的笔画对应）
    form: () => base,
    // 像有人在宣纸上作画：地面先洇开，两个小朋友一笔一笔写出来，墨色再晕开一点
    async appear(check, { fast = false } = {}) {
      root.setAttribute('opacity', 1);
      halo.setAttribute('opacity', 0);
      for (const p of ['ti', 'heng', 'gou', 'pie']) reveal[p] = 0;
      drawInk();
      if (!fast) {
        buildScenery();
        tween(2000, (t) => scenery.setAttribute('opacity', t), { check }).catch(() => {});
      }
      const k = fast ? 0.12 : 1;
      await tween(360 * k, (t) => ground.setAttribute('opacity', t), { check });
      await tween(1150 * k, (t) => { reveal.ti = t; drawInk(); }, { check, easing: ease.inOut });
      await tween(800 * k, (t) => { reveal.heng = t; drawInk(); }, { check });
      await wait(90 * k, check);
      await tween(1250 * k, (t) => { reveal.gou = t; drawInk(); }, { check, easing: ease.inOut });
      await tween(820 * k, (t) => { reveal.pie = t; drawInk(); }, { check });
      render();
      await tween(620 * k, (t) => halo.setAttribute('opacity', t * 0.5), { check });
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity'));
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },
    // 摸一下：矮的小朋友踮起脚尖使劲长高，高的小朋友轻轻点头——比一比呀
    async pulse() {
      await tween(
        1400,
        (t) => {
          // 踮脚：左小朋友从脚底向上伸一伸（两个小起伏），右边高点的小朋友得意地点点头
          const tip = Math.abs(Math.sin(t * Math.PI * 2)) * (1 - 0.4 * t);
          scaleAt(kidL, [344, 812], 1, 1 + 0.055 * tip);
          kidR.setAttribute('transform', `rotate(${(2.4 * Math.sin(t * Math.PI) * (1 - t)).toFixed(2)} 650 780)`);
        },
        { easing: ease.inOut },
      );
      scaleAt(kidL, [344, 812], 1, 1);
      kidR.setAttribute('transform', '');
    },
    // 收尾：挪到字的正下方缩小站好（肩并肩，正好在字底下那块空地里）
    setPlaced({ scale = 1, cx = 500, cy = 500 } = {}) {
      root.setAttribute('transform', `translate(${cx - scale * 500} ${cy - scale * 500}) scale(${scale})`);
    },
    reset() {
      root.setAttribute('transform', '');
      root.setAttribute('opacity', 0);
      halo.setAttribute('opacity', 0);
      ground.setAttribute('opacity', 0);
      scaleAt(kidL, [344, 812], 1, 1);
      kidR.setAttribute('transform', '');
      for (const p of ['ti', 'heng', 'gou', 'pie']) reveal[p] = 0;
      drawInk();
      sceneryLayer.replaceChildren();
      scenery = null;
    },
  };
}
