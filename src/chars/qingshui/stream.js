// 清亮见底的溪水：水底的小石头看得见，水面水光慢慢流，两条小鱼悄悄游过，
// 岸边一丛蒲草、几笔青草。摸一下：水纹荡开，冒几颗小水泡。
// 组字时，三颗小水滴就从这条溪里飞出去，去找青。
import { svg, tween, wait, lerp, ease } from '../../util.js';

// 水底的小石头：大小、颜色错开，深一点、顶上带一点浅色反光，透过水也看得清
const PEBBLES = [
  { cx: 300, cy: 700, rx: 52, ry: 34, rot: -8, fill: '#8f8268' },
  { cx: 415, cy: 660, rx: 30, ry: 20, rot: 12, fill: '#a8906c' },
  { cx: 762, cy: 646, rx: 40, ry: 24, rot: -6, fill: '#83886a' },
  { cx: 585, cy: 766, rx: 66, ry: 40, rot: 5, fill: '#a97f7b' },
  { cx: 185, cy: 802, rx: 58, ry: 36, rot: 10, fill: '#9a8862' },
  { cx: 872, cy: 786, rx: 48, ry: 30, rot: -14, fill: '#8f8268' },
  { cx: 490, cy: 884, rx: 80, ry: 48, rot: -4, fill: '#8a846e' },
  { cx: 700, cy: 922, rx: 62, ry: 38, rot: 8, fill: '#958560' },
  { cx: 96, cy: 938, rx: 44, ry: 26, rot: -10, fill: '#827b60' },
  { cx: 330, cy: 978, rx: 55, ry: 32, rot: 6, fill: '#9e8d68' },
];

// 溪床（石头之间的深色水底）和几层水色：上缘是一道弯弯的水面，左右溶进纸色
const BED = 'M-30 620 C 140 600 260 648 400 636 C 540 624 620 668 760 656 C 880 646 980 678 1054 664 L1054 1064 L-30 1064 Z';
const WASHES = [
  {
    d: 'M-30 596 C 90 570 180 618 280 606 C 380 594 430 646 540 648 C 650 650 690 600 780 594 C 870 588 930 634 1010 626 C 1032 623 1046 616 1054 610 L1054 1064 L-30 1064 Z',
    fill: '#9ec2b2', op: 0.32, filter: 'url(#wash2)',
  },
  {
    d: 'M-30 660 C 120 640 220 686 340 672 C 460 658 520 706 640 702 C 760 698 830 652 930 660 C 1000 666 1036 686 1054 696 L1054 1064 L-30 1064 Z',
    fill: '#bcd8c8', op: 0.26, filter: 'url(#wash1)',
  },
  {
    // 贴着水面的一层浅色：上缘与深水层的上缘同一条弯，水沿才不会出现断层
    d: 'M-30 622 C 90 596 180 644 280 632 C 380 620 430 672 540 674 C 650 676 690 626 780 620 C 870 614 930 660 1010 652 C 1032 649 1046 642 1054 636 L1054 662 C 900 690 700 668 500 682 C 300 696 120 672 -30 684 Z',
    fill: '#dcecdf', op: 0.45, filter: 'url(#wash1)',
  },
];

// 水面的水光：一道道浅浅的弯，各自轻轻闪
const GLINTS = [
  [236, 692, 46], [430, 742, 34], [610, 682, 40], [724, 802, 52],
  [512, 884, 44], [830, 906, 38], [330, 832, 30], [560, 780, 26],
].map(([x, y, w], i) => ({ x, y, w, d: 3.6 + (i % 4) * 1.3 }));

// 一条小鱼（朝右，长约五十二）：贴着水面的影子，深一点才看得见
function drawFish(parent) {
  svg('path', { d: 'M0 0 C 12 -11 30 -11 40 0 C 30 11 12 11 0 0 Z', fill: '#3f5a66', opacity: 0.5 }, parent);
  svg('path', { d: 'M38 0 L52 -9 L50 0 L52 9 Z', fill: '#3f5a66', opacity: 0.4 }, parent);
  svg('circle', { cx: 9, cy: -1.5, r: 1.8, fill: '#26333a', opacity: 0.8 }, parent);
}

// 一片细长的叶或草：根在原点，向上生长，带一点天然的弧
function bladePath(len, w, bend) {
  const tipX = bend * len * 0.3;
  return `M0 0
    C ${w} ${-len * 0.3} ${w * 0.9 + bend * len * 0.2} ${-len * 0.72} ${tipX} ${-len}
    C ${-w * 0.7 + bend * len * 0.16} ${-len * 0.7} ${-w * 0.5} ${-len * 0.28} 0 0 Z`;
}

// 组字时小水滴从溪里起飞的地方
const DROPS_FROM = [[352, 884], [214, 918], [455, 948]];
const GLINTS_OP = 0.6;

export function createStream(pictureLayer, sceneryLayer) {
  const root = svg('g', { class: 'qingshui-stream', opacity: 0 }, pictureLayer);

  // 每层水色用左右溶开的渐变，水面在画面边缘不被切出硬边
  const defs = svg('defs', {}, root);
  const sideFade = (id, color) => {
    const grad = svg('linearGradient', { id, x1: 0, y1: 0, x2: 1, y2: 0 }, defs);
    svg('stop', { offset: 0, 'stop-color': color, 'stop-opacity': 0 }, grad);
    svg('stop', { offset: 0.22, 'stop-color': color, 'stop-opacity': 1 }, grad);
    svg('stop', { offset: 0.78, 'stop-color': color, 'stop-opacity': 1 }, grad);
    svg('stop', { offset: 1, 'stop-color': color, 'stop-opacity': 0 }, grad);
  };
  WASHES.forEach((w, i) => sideFade(`qingshui-w${i}`, w.fill));
  sideFade('qingshui-bed', '#8fb2a0');
  // 小石头和小鱼用的轻柔滤镜：只微微晕开，别像大 wash 那样把小东西抹没
  const soft = svg('filter', { id: 'qingshui-soft', x: '-30%', y: '-30%', width: '160%', height: '160%' }, defs);
  svg('feGaussianBlur', { stdDeviation: 2.2 }, soft);
  const sweep = svg('radialGradient', { id: 'qingshui-sweep' }, defs);
  svg('stop', { offset: 0, 'stop-color': '#f4fbf4', 'stop-opacity': 0.9 }, sweep);
  svg('stop', { offset: 1, 'stop-color': '#f4fbf4', 'stop-opacity': 0 }, sweep);

  // 溪床和小石头（水色盖上之前先画好，才是「泡在水里」的样子）
  const bed = svg('g', { opacity: 0 }, root);
  svg('path', { d: BED, fill: 'url(#qingshui-bed)', opacity: 0.35, filter: 'url(#wash2)' }, bed);

  const pebblesG = svg('g', { filter: 'url(#qingshui-soft)' }, root);
  const pebEls = PEBBLES.map((p) => {
    const g = svg('g', { opacity: 0 }, pebblesG);
    svg('ellipse', { cx: p.cx, cy: p.cy + p.ry * 0.22, rx: p.rx * 0.98, ry: p.ry * 0.8, fill: '#6e6552', opacity: 0.28 }, g);
    svg('ellipse', { cx: p.cx, cy: p.cy, rx: p.rx, ry: p.ry, fill: p.fill, transform: `rotate(${p.rot} ${p.cx} ${p.cy})` }, g);
    // 水清，石头顶上 catch 一点亮
    svg('ellipse', {
      cx: p.cx - p.rx * 0.16, cy: p.cy - p.ry * 0.34, rx: p.rx * 0.52, ry: p.ry * 0.36,
      fill: '#ece4cd', opacity: 0.5,
    }, g);
    return g;
  });

  // 几层水色一层层洇上来
  const waterEls = WASHES.map((w, i) => {
    const g = svg('g', { opacity: 0 }, root);
    svg('path', { d: w.d, fill: `url(#qingshui-w${i})`, opacity: w.op, filter: w.filter }, g);
    return g;
  });

  // 两条小鱼贴着水色游（影子映在水面上）；错开相位，多半时候总有一条在画面里
  const fishG = svg('g', { opacity: 0 }, root);
  const fishA = svg('g', { transform: 'translate(0 764) scale(1.15)' }, fishG);
  drawFish(svg('g', { class: 'qingshui-fish-a', style: 'animation-delay: -9s' }, fishA));
  const fishB = svg('g', { transform: 'translate(0 872)' }, fishG);
  drawFish(svg('g', { transform: 'scale(-0.85 0.85)' }, svg('g', { class: 'qingshui-fish-b', style: 'animation-delay: -21s' }, fishB)));

  // 浑水纱：一开场的溪还有点白蒙蒙，慢慢褪干净，石头就看得见了
  const veil = svg('path', { d: WASHES[0].d, fill: '#ece2cd', opacity: 0.55 }, root);

  // 水面的水光
  const glintsG = svg('g', { opacity: 0 }, root);
  for (const { x, y, w, d } of GLINTS) {
    svg('path', {
      d: `M${x} ${y} q ${w / 2} -5 ${w} 0`,
      fill: 'none', stroke: '#eef7ee', 'stroke-width': 4.5, 'stroke-linecap': 'round',
      class: 'qingshui-glint', style: `--qingshui-d: ${d}s`,
    }, glintsG);
  }

  // 右岸一丛蒲草（一支蒲棒＋几片叶），左下角一小簇青草
  const reeds = svg('g', { transform: 'translate(962 655) scale(0)', opacity: 0.9 }, root);
  svg('path', { d: 'M0 0 C 3 -62 -5 -142 2 -212', fill: 'none', stroke: '#6f8f7a', 'stroke-width': 4, 'stroke-linecap': 'round' }, reeds);
  svg('ellipse', { cx: 2, cy: -228, rx: 7.5, ry: 24, fill: '#8a7050', opacity: 0.85 }, reeds);
  svg('path', { d: bladePath(232, 9, 0.34), fill: '#5d8a67', opacity: 0.6, filter: 'url(#wash1)' }, reeds);
  svg('path', { d: bladePath(196, 8, -0.2), fill: '#487457', opacity: 0.55, filter: 'url(#wash1)' }, reeds);
  svg('path', { d: bladePath(150, 7, 0.05), fill: '#5d8a67', opacity: 0.5, filter: 'url(#wash1)' }, reeds);
  const grass = svg('g', { transform: 'translate(74 1012) scale(0)', opacity: 0.9 }, root);
  svg('path', { d: bladePath(168, 10, -0.42), fill: '#5d8a67', opacity: 0.62, filter: 'url(#wash1)' }, grass);
  svg('path', { d: bladePath(138, 9, -0.1), fill: '#487457', opacity: 0.58, filter: 'url(#wash1)' }, grass);
  svg('path', { d: bladePath(120, 8, 0.22), fill: '#3c6449', opacity: 0.5, filter: 'url(#wash1)' }, grass);

  // 涟漪、水泡、飞出去的小水滴、扫过的水光，都收在这层，reset 好清
  const fx = svg('g', {}, root);

  // 摸哪儿都算摸到溪水：罩住水面的透明形状，放最上层稳稳接住点击
  const body = svg('g', {}, root);
  svg('ellipse', { cx: 512, cy: 810, rx: 565, ry: 240, fill: '#000', 'fill-opacity': 0 }, body);
  svg('rect', { x: 0, y: 560, width: 1024, height: 464, fill: '#000', 'fill-opacity': 0 }, body);

  // ---- 小玩意儿：水滴、涟漪、水泡、水光 ----
  function makeDrop() {
    const g = svg('g', { opacity: 0 }, fx);
    svg('path', {
      d: 'M0 -15 C 6.5 -6 9.5 -1 9.5 5 A 9.5 9.5 0 1 1 -9.5 5 C -9.5 -1 -6.5 -6 0 -15 Z',
      fill: '#4a7d99',
    }, g);
    svg('circle', { cx: -3, cy: 4, r: 2.6, fill: '#f2faf5', opacity: 0.85 }, g);
    return g;
  }

  // 水纹从摸到的地方荡开一圈
  function ripple([x, y]) {
    const wave = (r0, r1, o0, ms, delay) =>
      wait(delay).then(() => {
        const ring = svg('ellipse', {
          cx: x, cy: y, rx: r0, ry: r0 * 0.3, fill: 'none', stroke: '#e9f4ec',
          'stroke-width': 3, opacity: o0, filter: 'url(#wash2)',
        }, fx);
        return tween(ms, (t) => {
          ring.setAttribute('rx', String(lerp(r0, r1, t)));
          ring.setAttribute('ry', String(lerp(r0 * 0.3, r1 * 0.3, t)));
          ring.setAttribute('opacity', String(o0 * (1 - t)));
        }, { easing: ease.out }).then(() => ring.remove());
      });
    wave(12, 96, 0.7, 1050, 0);
    wave(8, 58, 0.5, 900, 240);
  }

  // 几颗小水泡摇摇晃晃浮上来
  function bubbles([x, y]) {
    [[0, 5, 92], [180, 4, 70], [320, 6.5, 112]].forEach(([delay, r, rise]) => {
      wait(delay).then(() => {
        const b = svg('circle', { cx: x, cy: y, r, fill: 'none', stroke: '#d9ecdf', 'stroke-width': 2, opacity: 0.8 }, fx);
        tween(1000, (t) => {
          b.setAttribute('cy', String(y - rise * t));
          b.setAttribute('cx', String(x + Math.sin(t * 9 + delay) * 6));
          b.setAttribute('opacity', String(0.8 * (1 - t * t)));
        }, { easing: ease.out }).then(() => b.remove());
      });
    });
  }

  function glintFlash() {
    tween(520, (t) => glintsG.setAttribute('opacity', String(lerp(GLINTS_OP, 1, Math.sin(t * Math.PI)))), { easing: ease.out })
      .then(() => glintsG.setAttribute('opacity', String(GLINTS_OP)));
  }

  // 水光扫过一遍：一道亮从左晃到右，水一下子「清亮」了
  async function brighten(check) {
    const s = svg('ellipse', { cx: 160, cy: 780, rx: 210, ry: 130, fill: 'url(#qingshui-sweep)', opacity: 0, filter: 'url(#glow)' }, fx);
    await Promise.all([
      tween(950, (t) => {
        s.setAttribute('transform', `translate(${t * 780} 0)`);
        s.setAttribute('opacity', String(Math.sin(t * Math.PI) * 0.95));
      }, { check }),
      tween(950, (t) => glintsG.setAttribute('opacity', String(lerp(GLINTS_OP, 1, Math.sin(t * Math.PI)))), { check }),
    ]);
    s.remove();
    glintsG.setAttribute('opacity', String(GLINTS_OP));
  }

  // 小水滴沿弧线飞到落点（组字：去找青）
  async function flyDrop(i, to, check, { ms = 700, rise = 130 } = {}) {
    const from = DROPS_FROM[i];
    const g = makeDrop();
    const cx = (from[0] + to[0]) / 2 - 70;
    const cy = (from[1] + to[1]) / 2 - rise;
    await tween(ms, (t) => {
      const mt = 1 - t;
      const x = mt * mt * from[0] + 2 * mt * t * cx + t * t * to[0];
      const y = mt * mt * from[1] + 2 * mt * t * cy + t * t * to[1];
      g.setAttribute('transform', `translate(${x} ${y}) rotate(${Math.sin(t * Math.PI) * 16}) scale(${lerp(1.1, 0.92, t)})`);
      g.setAttribute('opacity', String(Math.min(1, t * 5)));
    }, { easing: ease.inOut, check });
    g.remove();
  }

  // 第三滴不落点，贴着水面向上滑出一道提：水滴在前面跑，墨迹跟在后面
  async function streakDrop(path, check) {
    const g = makeDrop();
    g.setAttribute('opacity', 1);
    const n = path.length - 1;
    await tween(900, (t) => {
      const f = t * n;
      const i = Math.min(n - 1, Math.floor(f));
      const u = f - i;
      const [a, b] = [path[i], path[i + 1]];
      g.setAttribute('transform', `translate(${lerp(a[0], b[0], u)} ${lerp(a[1], b[1], u)}) rotate(${lerp(-64, 12, t)}) scale(${lerp(1, 0.3, t)})`);
      if (t > 0.82) g.setAttribute('opacity', String((1 - t) / 0.18));
    }, { check });
    g.remove();
  }

  // 水滴落在纸上，洇开一个小小的水圈
  function bloom([x, y]) {
    const ring = svg('ellipse', {
      cx: x, cy: y, rx: 6, ry: 2.5, fill: 'none', stroke: '#8fb3c2',
      'stroke-width': 3.5, opacity: 0.85, filter: 'url(#wash2)',
    }, fx);
    const dots = [-1, 1].map((s) => svg('circle', { cx: x, cy: y, r: 2.4, fill: '#a9c8d4', opacity: 0.9 }, fx));
    return tween(620, (t) => {
      ring.setAttribute('rx', String(lerp(6, 30, t)));
      ring.setAttribute('ry', String(lerp(2.5, 10, t)));
      ring.setAttribute('opacity', String(0.85 * (1 - t)));
      dots.forEach((d, i) => d.setAttribute('cy', String(y - t * 26 + i)));
    }, { easing: ease.out }).then(() => {
      ring.remove();
      dots.forEach((d) => d.remove());
    });
  }

  const grow = (g, base) => tween(700, (t) => g.setAttribute('transform', `${base} scale(${t.toFixed(3)})`));

  return {
    root,
    body,
    // 溪水出现：水色一层层洇上来，白蒙蒙的水慢慢变清，石头、水光、小鱼都出来了
    async appear(check, { fast = false } = {}) {
      const f = fast ? 0.4 : 1;
      root.setAttribute('opacity', 1);
      buildScenery(sceneryLayer, f);
      const scaleAt = (g, t) => g.setAttribute('transform', `translate(512 800) scale(${t}) translate(-512 -800)`);
      await Promise.all([
        tween(700 * f, (t) => bed.setAttribute('opacity', String(t)), { check }),
        ...pebEls.map((g, i) =>
          wait((140 + i * 85) * f, check).then(() => tween(420 * f, (t) => g.setAttribute('opacity', String(t)), { easing: ease.bloom, check })),
        ),
        ...waterEls.map((g, i) =>
          wait((300 + i * 240) * f, check).then(() =>
            tween(900 * f, (t) => {
              g.setAttribute('opacity', String(t));
              scaleAt(g, lerp(0.965, 1, t));
            }, { easing: ease.bloom, check }),
          ),
        ),
        wait(650 * f, check).then(() =>
          Promise.all([
            tween(600 * f, (t) => fishG.setAttribute('opacity', String(t)), { check }),
            tween(600 * f, (t) => glintsG.setAttribute('opacity', String(GLINTS_OP * t)), { check }),
          ]),
        ),
        wait(520 * f, check).then(() => tween(1500 * f, (t) => veil.setAttribute('opacity', String(lerp(0.55, 0, t))), { check })),
        wait(500 * f, check).then(() => grow(reeds, 'translate(962 655)')),
        wait(760 * f, check).then(() => grow(grass, 'translate(74 1012)')),
      ]);
    },
    // 摸一下：水纹荡开，冒几颗小水泡，水光眨一眨
    pulse() {
      const spots = [[430, 800], [640, 872], [764, 758], [330, 884]];
      const s = spots[(Math.random() * spots.length) | 0];
      ripple(s);
      bubbles([s[0] + 30, s[1] - 10]);
      glintFlash();
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity') ?? 1);
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },
    brighten,
    flyDrop,
    streakDrop,
    bloom,
    ripple,
    // 字写完了：一颗小水滴从半空落回溪里，又荡开一圈水纹（呼应三点水）
    async rainBack(check) {
      const g = makeDrop();
      g.setAttribute('transform', 'translate(648 596)');
      g.setAttribute('opacity', 1);
      await tween(560, (t) =>
        g.setAttribute('transform', `translate(648 ${lerp(596, 842, t * t)}) scale(${lerp(0.9, 0.72, t)})`), { check });
      g.remove();
      ripple([648, 852]);
      bubbles([648, 850]);
    },
    reset() {
      fx.replaceChildren();
      bed.setAttribute('opacity', 0);
      for (const g of pebEls) g.setAttribute('opacity', 0);
      for (const g of waterEls) {
        g.setAttribute('opacity', 0);
        g.setAttribute('transform', 'translate(512 800) scale(0.965) translate(-512 -800)');
      }
      fishG.setAttribute('opacity', 0);
      glintsG.setAttribute('opacity', 0);
      veil.setAttribute('opacity', 0.55);
      reeds.setAttribute('transform', 'translate(962 655) scale(0)');
      grass.setAttribute('transform', 'translate(74 1012) scale(0)');
      root.setAttribute('opacity', 0);
      sceneryLayer.replaceChildren();
    },
  };
}

// 背景点缀（1600×1000，slice 铺满整屏）：远处一抹青山（青家的山），
// 山脚一片浅浅的水色——stage 里的溪就是从这片山谷里流出来的
function buildScenery(sceneryLayer, f) {
  sceneryLayer.replaceChildren();
  const g = svg('g', { opacity: 0 }, sceneryLayer);
  svg('path', {
    d: 'M-50 585 C 200 545 380 600 560 570 C 760 536 940 596 1120 566 C 1300 536 1480 590 1650 562 L1650 730 L-50 730 Z',
    fill: '#7fa08f', opacity: 0.16, filter: 'url(#mist-wash)',
  }, g);
  svg('path', { d: 'M-60 705 C 80 645 200 626 320 656 L320 770 L-60 770 Z', fill: '#6f9585', opacity: 0.13, filter: 'url(#mist-wash)' }, g);
  svg('path', { d: 'M1160 696 C 1270 640 1400 626 1520 650 L1650 662 L1650 790 L1160 790 Z', fill: '#6f9585', opacity: 0.13, filter: 'url(#mist-wash)' }, g);
  svg('path', {
    d: 'M-50 850 C 300 824 620 862 940 838 C 1220 818 1450 848 1650 832 L1650 1000 L-50 1000 Z',
    fill: '#bcd8ca', opacity: 0.15, filter: 'url(#mist-wash)',
  }, g);
  tween(2000 * f, (t) => g.setAttribute('opacity', String(t))).catch(() => {});
}
