// 雨后远山：三层黛青色的山峦一层层洇开，山间飘着雾带，山脚一片淡青的水光，
// 前景两簇青草叶，叶尖挂着雨珠。摸一下：雾荡开一圈，草叶轻轻摇，雨珠落进水里。
import { svg, tween, wait, lerp, ease } from '../../util.js';
import { createFlora } from './flora.js';

// 三层山，从远到近：颜色渐深，山脚一层层往下压
const RIDGES = [
  {
    fill: '#9fb9ae', op: 0.55, filter: 'url(#wash1)', base: [512, 700],
    d: 'M-30 480 C 40 400 150 330 250 345 C 340 359 395 435 465 455 C 545 478 615 385 705 358 C 795 331 870 400 935 425 C 985 444 1025 432 1054 415 L1054 665 L-30 665 Z',
  },
  {
    fill: '#78a28f', op: 0.6, filter: 'url(#wash1)', base: [512, 830],
    d: 'M-30 640 C 60 560 140 480 235 495 C 320 508 370 585 450 605 C 535 626 600 520 690 498 C 785 475 855 545 920 570 C 975 591 1020 578 1054 560 L1054 800 L-30 800 Z',
  },
  {
    fill: '#517e6b', op: 0.66, filter: 'url(#wash2)', base: [512, 960],
    d: 'M-30 800 C 70 745 170 660 275 675 C 360 687 415 760 500 778 C 585 796 655 700 745 682 C 835 664 900 730 965 752 C 1010 767 1040 758 1054 748 L1054 950 L-30 950 Z',
  },
];

// 山脚的湖光：近山浸在水里，水色映着山色
const WATER = {
  d: 'M-30 916 C 180 896 380 934 560 917 C 740 900 880 930 1054 906 L1054 1044 L-30 1044 Z',
  fill: '#b7d2c1', op: 0.5,
};
// 水面两道淡淡的反光
const GLINTS = [
  'M300 946 C 360 940 430 950 486 945',
  'M560 966 C 640 958 730 970 800 962',
];

const scaleAt = (g, [ox, oy], s) => g.setAttribute('transform', `translate(${ox} ${oy}) scale(${s}) translate(${-ox} ${-oy})`);

export function createHills(pictureLayer, sceneryLayer) {
  const root = svg('g', { class: 'qing-hills', opacity: 0 }, pictureLayer);

  // 每层山用自己的渐变：左右两端溶进宣纸，山就不会被画面边缘切出硬边
  const defs = svg('defs', {}, root);
  const sideFade = (id, color) => {
    const grad = svg('linearGradient', { id, x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
    svg('stop', { offset: 0, 'stop-color': color, 'stop-opacity': 0 }, grad);
    svg('stop', { offset: 0.16, 'stop-color': color, 'stop-opacity': 1 }, grad);
    svg('stop', { offset: 0.8, 'stop-color': color, 'stop-opacity': 1 }, grad);
    svg('stop', { offset: 1, 'stop-color': color, 'stop-opacity': 0 }, grad);
  };
  RIDGES.forEach((r, i) => sideFade(`qing-ridge-${i}`, r.fill));
  sideFade('qing-water', WATER.fill);

  // 摸哪儿都算摸到山：罩住山群和水面的透明形状
  const body = svg('g', {}, root);
  svg('ellipse', { cx: 512, cy: 545, rx: 565, ry: 345, fill: '#000', 'fill-opacity': 0 }, body);
  svg('rect', { x: 0, y: 760, width: 1024, height: 264, fill: '#000', 'fill-opacity': 0 }, body);

  // 三层山：先都收着，appear 时一层层洇开
  const ridges = RIDGES.map((r, i) => {
    const g = svg('g', { opacity: 0 }, root);
    svg('path', { d: r.d, fill: `url(#qing-ridge-${i})`, opacity: r.op, filter: r.filter }, g);
    return { g, r };
  });

  // 山间雾带：宣纸色的软带子，CSS 里各自慢慢飘（都收在画面里，不越界被切）
  const mists = [
    { cx: 430, cy: 548, rx: 400, ry: 30, op: 0.42, cls: 'qing-mist qing-mist-a' },
    { cx: 590, cy: 672, rx: 420, ry: 34, op: 0.5, cls: 'qing-mist qing-mist-b' },
    { cx: 512, cy: 872, rx: 460, ry: 40, op: 0.5, cls: 'qing-mist qing-mist-c' },
  ].map((m) => {
    const g = svg('g', { class: m.cls, opacity: 0 }, root);
    svg('ellipse', { cx: m.cx, cy: m.cy, rx: m.rx, ry: m.ry, fill: '#f6efdd', filter: 'url(#wash2)' }, g);
    return { g, op: m.op };
  });

  // 山脚水光：两端同样溶进纸色
  const water = svg('g', { opacity: 0 }, root);
  svg('path', { d: WATER.d, fill: 'url(#qing-water)', opacity: WATER.op, filter: 'url(#wash1)' }, water);
  for (const d of GLINTS) {
    svg('path', { d, fill: 'none', stroke: '#eaf3ea', 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.4, filter: 'url(#wash2)' }, water);
  }

  // 前景草木（挂在 picture 层，山淡出时跟着 root 一起淡）
  const flora = createFlora(root);

  let pulseToken = 0;
  let mistRing = null;

  // 一圈雾从山心里荡开
  async function mist(check, { cx = 512, cy = 560 } = {}) {
    mistRing?.remove();
    mistRing = svg('ellipse', { cx, cy, rx: 110, ry: 30, fill: '#f6efdd', opacity: 0.42, filter: 'url(#wash2)' }, root);
    const ring = mistRing;
    await tween(950, (t) => {
      ring.setAttribute('rx', String(lerp(110, 430, t)));
      ring.setAttribute('ry', String(lerp(30, 120, t)));
      ring.setAttribute('opacity', String(0.42 * (1 - t)));
    }, { easing: ease.out, check });
    ring.remove();
    if (mistRing === ring) mistRing = null;
  }

  return {
    root,
    body,
    // 雨停了：山从雾里一层层洇出来，雾带浮起、水面亮起、草木绽开，叶尖落下一滴雨珠
    async appear(check, { fast = false } = {}) {
      const f = fast ? 0.4 : 1;
      root.setAttribute('opacity', 1);
      buildScenery(sceneryLayer, f, check);
      const bloomRidge = ({ g, r }, i) =>
        wait(i * 430 * f, check).then(() =>
          tween(1050 * f, (t) => {
            g.setAttribute('opacity', String(t));
            scaleAt(g, r.base, lerp(0.955, 1, t));
          }, { easing: ease.bloom, check }),
        );
      // 山一层层洇开的同时，雾带、水光和草叶跟着一起活过来
      await Promise.all([
        ...ridges.map(bloomRidge),
        ...mists.map(({ g, op }, i) =>
          wait((700 + i * 240) * f, check).then(() => tween(750 * f, (t) => g.setAttribute('opacity', String(op * t)), { check })),
        ),
        tween(850 * f, (t) => water.setAttribute('opacity', String(t)), { check }),
        wait(900 * f, check).then(() => flora.bloom(check, { fast })),
      ]);
      // 挂上一滴雨珠，再落下
      await flora.rainDrop(check);
    },
    // 摸一下：山间的雾荡开一圈，草叶摇一摇，又落下一滴雨珠
    async pulse() {
      const token = ++pulseToken;
      const alive = () => token === pulseToken;
      mist();
      flora.sway().then(() => (alive() ? flora.rainDrop() : null));
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity'));
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },
    // 字写好了：山影重新洇回来，雾再荡开一圈，草木摇着落下一滴雨珠
    async afterRain(check) {
      await Promise.all([mist(check), flora.sway()]);
      await flora.rainDrop(check);
    },
    reset() {
      pulseToken++;
      mistRing?.remove();
      mistRing = null;
      for (const { g, r } of ridges) {
        g.setAttribute('opacity', 0);
        scaleAt(g, r.base, 1);
      }
      for (const { g } of mists) g.setAttribute('opacity', 0);
      water.setAttribute('opacity', 0);
      flora.reset();
      root.setAttribute('opacity', 0);
      sceneryLayer.replaceChildren();
    },
  };
}

// 背景点缀（1600×1000，slice 铺满整屏）：把纸色的远山染上一层青意，
// 左右两端各添一道淡淡的青色山影，让 stage 里的山群和纸上的远山连成一个世界
function buildScenery(sceneryLayer, f, check) {
  sceneryLayer.replaceChildren();
  const g = svg('g', { opacity: 0 }, sceneryLayer);
  svg('path', {
    d: 'M-50 640 C 240 610 520 640 800 615 C 1090 590 1370 625 1650 598 L1650 810 L-50 810 Z',
    fill: '#7fa08f', opacity: 0.18, filter: 'url(#mist-wash)',
  }, g);
  const side = (d) => svg('path', { d, fill: '#6f9585', opacity: 0.14, filter: 'url(#mist-wash)' }, g);
  side('M-60 780 C 60 700 190 652 320 668 C 430 682 500 745 560 775 L560 850 L-60 850 Z');
  side('M1120 772 C 1220 706 1340 668 1460 682 C 1560 694 1620 742 1660 768 L1660 850 L1120 850 Z');
  svg('path', {
    d: 'M-50 874 C 320 858 640 886 960 866 C 1220 850 1450 874 1650 858 L1650 926 L-50 926 Z',
    fill: '#a9c6b6', opacity: 0.2, filter: 'url(#mist-wash)',
  }, g);
  tween(2300 * f, (t) => g.setAttribute('opacity', String(t)), { check }).catch(() => {});
}
