// 「一」的实物画面：一条小溪、左右两块岸地、一座微拱的独木桥，
// 鸭妈妈带着两只小鸭排队过桥。
// 摸一下：鸭群蹦一蹦，水面荡开两圈涟漪。
// 桥板与字形层的拱中线是同一条线（见 morph.js），「拓桥」时不错位。
// 远处的对岸淡影放在背景层（layers.scenery，1600×1000 坐标）。
import { svg, tween, wait, lerp, ease } from '../../util.js';

// ---- 桥的几何（与 morph.js 的拱中线一致）----
const X0 = 150;
const X1 = 890;
const bankY = 652; // 岸上缘
const bridgeAt = (x) => 650 - 52 * Math.sin((Math.PI * (x - X0)) / (X1 - X0));
const bridgeTopAt = (x) => bridgeAt(x) - 20; // 桥板上面（鸭子站的地方）

// 鸭子脚底的 y：左岸 → 上桥沿拱走 → 下桥到右岸
const yOf = (x) => {
  if (x <= 172) return bankY;
  if (x >= 868) return bankY;
  if (x < 212) return lerp(bankY, bridgeTopAt(212), (x - 172) / 40);
  if (x > 828) return lerp(bridgeTopAt(828), bankY, (x - 828) / 40);
  return bridgeTopAt(x);
};

const scaleAt = (g, [ox, oy], s) =>
  g.setAttribute('transform', `translate(${ox} ${oy}) scale(${s}) translate(${-ox} ${-oy})`);

// 一只水墨鸭：局部坐标原点在脚底中心。
// 笔画按朝左画，外层 scale(-1,1) 镜成面朝右（走向桥的方向）。
// g 由走路定位，hop 留给蹦跳，inner 只管镜像和大小——各层各管各的，不互相覆盖。
function duck(parent, { body, beak = '#e08a3c', size = 1 }) {
  const g = svg('g', {}, parent);
  const hop = svg('g', {}, g);
  const inner = svg('g', { transform: `scale(${-size} ${size})` }, hop);
  // 脚蹼（先画，上端被身体压住）
  svg('path', {
    d: 'M-4 -8 q -16 4 -14 9 q 3 4 15 2 Z M16 -8 q -15 4 -13 9 q 3 4 15 2 Z',
    fill: beak, stroke: '#b56423', 'stroke-width': 1.5, opacity: 0.95,
  }, inner);
  // 翘起的小尾巴
  svg('path', {
    d: 'M40 -36 q 17 -8 20 -21 q -5 15 -16 25 Z',
    fill: body, stroke: '#3a332c', 'stroke-width': 2.5,
  }, inner);
  // 身体
  svg('path', {
    d: 'M-38 -30 C -42 -14 -32 -4 -12 -3 C 10 -2 36 -8 46 -24 C 50 -34 45 -44 32 -48 C 16 -53 -10 -53 -26 -46 C -33 -43 -37 -37 -38 -30 Z',
    fill: body, stroke: '#3a332c', 'stroke-width': 3, filter: 'url(#ink)',
  }, inner);
  // 颈（一条粗笔把身体和头连起来）+ 头
  svg('path', {
    d: 'M-26 -42 C -32 -56 -38 -62 -44 -66',
    stroke: body, 'stroke-width': 20, fill: 'none', 'stroke-linecap': 'round',
  }, inner);
  svg('circle', { cx: -46, cy: -68, r: 15, fill: body, stroke: '#3a332c', 'stroke-width': 3 }, inner);
  // 扁扁的嘴
  svg('path', {
    d: 'M-59 -72 q -13 -1 -14 4 q 2 5 14 3 Z',
    fill: beak, stroke: '#b56423', 'stroke-width': 1.5,
  }, inner);
  // 眼睛
  svg('circle', { cx: -49, cy: -71, r: 3, fill: '#221d1a' }, inner);
  // 翅膀
  svg('path', {
    d: 'M-14 -34 q 18 -12 36 -2',
    fill: 'none', stroke: '#3a332c', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.75,
  }, inner);
  return { g, hop };
}

// 沿地面（岸/桥）从 fromX 走到 toX，一颠一颠地摇
async function walk(d, fromX, toX, ms, check) {
  await tween(
    ms,
    (t, p) => {
      const x = lerp(fromX, toX, p);
      const bob = -5 * Math.abs(Math.sin(p * Math.PI * 7));
      const rot = 2.5 * Math.sin(p * Math.PI * 7);
      d.setAttribute('transform', `translate(${x.toFixed(1)} ${(yOf(x) + bob).toFixed(1)}) rotate(${rot.toFixed(1)})`);
    },
    { check },
  );
}

// 把鸭子放到指定位置（不出小动画时用）
const place = (d, x, y = yOf(x)) =>
  d.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);

export function createScene(pictureLayer, sceneryLayer) {
  const root = svg('g', { class: 'yi-scene-root', opacity: 0 }, pictureLayer);

  // ---- 溪水：一大片洇开的淡青，水纹都是局部的短笔，不横贯画面 ----
  const water = svg('g', { opacity: 0 }, root);
  svg('path', {
    d: 'M0 700 C 120 668 220 652 340 656 C 470 662 560 662 690 656 C 800 651 920 668 1024 700 L 1024 1060 L 0 1060 Z',
    fill: '#c9dbd6', opacity: 0.5, filter: 'url(#wash1)',
  }, water);
  svg('path', {
    d: 'M0 700 C 120 668 220 652 340 656 C 470 662 560 662 690 656 C 800 651 920 668 1024 700',
    fill: 'none', stroke: '#8fb0a8', 'stroke-width': 5, opacity: 0.55, filter: 'url(#wash1)',
  }, water);
  for (const [x0, x1, y, w] of [
    [330, 470, 724, 5], [600, 748, 782, 5], [400, 560, 848, 4],
    [660, 780, 920, 6], [300, 420, 975, 5],
  ]) {
    svg('path', {
      d: `M${x0} ${y} C ${lerp(x0, x1, 0.4)} ${y - 6} ${lerp(x0, x1, 0.6)} ${y + 6} ${x1} ${y}`,
      fill: 'none', stroke: '#9db8b2', 'stroke-width': w, 'stroke-linecap': 'round', opacity: 0.5,
    }, water);
  }
  // 水边的几块卵石
  for (const [cx, cy, rx, ry] of [[292, 664, 17, 10], [352, 672, 12, 8], [706, 662, 18, 11], [762, 674, 12, 8], [500, 690, 14, 9]]) {
    svg('ellipse', { cx, cy, rx, ry, fill: '#dcd5c2', stroke: '#a89a80', 'stroke-width': 2, opacity: 0.6 }, water);
  }
  // 游水时留下的尾迹会挂在这里
  const trail = svg('g', {}, water);

  // ---- 岸地：左右两块，桥搭在岸之间 ----
  const banks = svg('g', { opacity: 0 }, root);
  svg('path', {
    d: 'M0 640 C 80 634 170 642 262 652 L 262 1060 L 0 1060 Z',
    fill: '#e7dcbd', stroke: '#8a7a5c', 'stroke-width': 4, opacity: 0.96, 'stroke-opacity': 0.4,
  }, banks);
  svg('path', {
    d: 'M1024 636 C 940 632 850 642 788 654 L 788 1060 L 1024 1060 Z',
    fill: '#e7dcbd', stroke: '#8a7a5c', 'stroke-width': 4, opacity: 0.96, 'stroke-opacity': 0.4,
  }, banks);
  // 岸上的小草
  for (const [gx, gy, f] of [[70, 642, 1], [186, 648, -1], [836, 650, 1], [966, 640, -1], [244, 652, 1]]) {
    svg('path', {
      d: `M${gx} ${gy} q ${6 * f} -15 ${14 * f} -17 M${gx + 6} ${gy} q ${2 * f} -10 ${9 * f} -12`,
      fill: 'none', stroke: '#6b6353', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.5,
    }, banks);
  }
  // 右岸一丛芦苇（矮矮的，尖不过「一」字的下缘；风里轻轻摇见 style.css）
  const reeds = svg('g', { class: 'yi-reeds', transform: 'translate(975 648)' }, banks);
  const reed = (x, h, delay) => {
    const g = svg('g', { class: `yi-reed ${delay}` }, reeds);
    svg('path', {
      d: `M${x} 0 C ${x + 4} ${-h * 0.4} ${x - 3} ${-h * 0.7} ${x + 2} ${-h}`,
      fill: 'none', stroke: '#6a7a58', 'stroke-width': 3.5, 'stroke-linecap': 'round',
    }, g);
    svg('ellipse', { cx: x + 2, cy: -h - 7, rx: 4.5, ry: 10, fill: '#a98a55', opacity: 0.85 }, g);
    return g;
  };
  reed(-22, 52, '');
  reed(0, 66, 'r2');
  reed(20, 46, 'r3');

  // ---- 独木桥：一块微拱的厚木板，架在两岸之间 ----
  const bridge = svg('g', { class: 'yi-bridge', 'data-part': 'bridge' }, root);
  const defs = svg('defs', {}, bridge);
  const grad = svg('linearGradient', { id: 'yi-plank', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  svg('stop', { offset: 0, 'stop-color': '#b08a5f' }, grad);
  svg('stop', { offset: 0.5, 'stop-color': '#9a7750' }, grad);
  svg('stop', { offset: 1, 'stop-color': '#7c5f40' }, grad);
  svg('path', {
    d: 'M150 630 Q 512 526 890 630 L 890 670 Q 512 566 150 670 Z',
    fill: 'url(#yi-plank)', stroke: '#3a332c', 'stroke-width': 4, 'stroke-linejoin': 'round',
    filter: 'url(#ink)',
  }, bridge);
  // 木纹：两道顺着板面的淡墨
  svg('path', {
    d: 'M168 644 Q 512 545 872 644', fill: 'none', stroke: '#5c4a34', 'stroke-width': 2.5, opacity: 0.4, 'stroke-linecap': 'round',
  }, bridge);
  svg('path', {
    d: 'M200 658 Q 512 570 840 658', fill: 'none', stroke: '#5c4a34', 'stroke-width': 2, opacity: 0.3, 'stroke-linecap': 'round',
  }, bridge);

  // ---- 鸭群：鸭妈妈带两只小鸭 ----
  const flock = svg('g', { opacity: 0 }, root);
  const mom = duck(flock, { body: '#f5efdd' });
  const kidA = duck(flock, { body: '#eed87f', size: 0.55 });
  const kidB = duck(flock, { body: '#e9cf6d', size: 0.5 });
  const HOME = { mom: 185, a: 112, b: 250 };      // 左岸排队的位置
  const AWAY = { mom: 930, a: 892, b: 874 };       // 过桥后在右岸的位置
  const SETTLE_Y = 656;                            // 右岸站位（头顶不碰字的下缘）

  // 摸哪儿都算摸到：罩住桥面和岸上鸭群的透明形状。
  // 放在最后创建＝画在最上层，点桥面、点水面、点鸭，都先落在这块罩上，
  // 冒泡必定经过 body（水面等实体若画在罩上面，点击会打到它们、不经过 body）。
  const body = svg('g', { 'data-part': 'hit' }, root);
  svg('rect', { x: 110, y: 560, width: 820, height: 310, fill: '#000', 'fill-opacity': 0 }, body);

  let pulseToken = 0;
  let scenery = null;

  const buildScenery = () => {
    sceneryLayer.replaceChildren();
    scenery = svg('g', { opacity: 0 }, sceneryLayer);
    const g = svg('g', { filter: 'url(#mist-wash)', fill: '#7d8f97' }, scenery);
    // 远处对岸的一带淡影 + 两个远芦苇影（1600×1000 背景坐标）
    svg('path', { d: 'M120 668 C 320 648 520 652 760 650 C 1000 648 1240 656 1480 672 L 1480 720 L 120 720 Z', opacity: 0.12 }, g);
    for (const [x, y, h] of [[300, 664, 46], [1360, 660, 52]]) {
      svg('path', { d: `M${x} ${y} C ${x + 5} ${y - h * 0.5} ${x - 4} ${y - h * 0.8} ${x + 2} ${y - h}`, fill: 'none', stroke: '#7d8f97', 'stroke-width': 5, 'stroke-linecap': 'round', opacity: 0.14 }, g);
    }
  };

  const fade = (g, to, ms, check) => {
    const from = Number(g.getAttribute('opacity') ?? 1);
    return tween(ms, (t) => g.setAttribute('opacity', lerp(from, to, t)), { check });
  };

  return {
    root,
    body,
    // 小溪洇开 → 岸地铺好 → 木桥落下 → 鸭群从左边摇摇摆摆走出来
    async appear(check) {
      root.setAttribute('opacity', 1);
      buildScenery();
      tween(2000, (t) => scenery.setAttribute('opacity', t), { check }).catch(() => {});
      fade(water, 1, 900, check).catch(() => {});
      await wait(500, check);
      await fade(banks, 1, 500, check);
      // 木桥从空中落下，落定后轻轻一颤
      bridge.setAttribute('opacity', 0);
      bridge.setAttribute('transform', 'translate(0 -110)');
      await tween(
        650,
        (t) => {
          bridge.setAttribute('opacity', Math.min(1, t * 2));
          bridge.setAttribute('transform', `translate(0 ${(lerp(-110, 0, t) - 14 * Math.sin(t * Math.PI)).toFixed(1)})`);
        },
        { easing: ease.out, check },
      );
      await tween(240, (t) => bridge.setAttribute('transform', `translate(0 ${(-14 * Math.sin(t * Math.PI) * (1 - t)).toFixed(1)})`), { check });
      bridge.setAttribute('transform', '');
      // 鸭群从画面左边摇摇摆摆走到岸上，排成一队
      flock.setAttribute('opacity', 1);
      place(mom.g, -80, bankY + 4);
      place(kidA.g, -150, bankY + 6);
      place(kidB.g, -215, bankY + 7);
      await Promise.all([
        walk(mom.g, -80, HOME.mom, 1500, check),
        wait(160, check).then(() => walk(kidA.g, -150, HOME.a, 1500, check)),
        wait(320, check).then(() => walk(kidB.g, -215, HOME.b, 1500, check)),
      ]);
    },
    // 摸一下：鸭群蹦一蹦、摆一摆，水面荡开两圈涟漪
    async pulse() {
      const token = ++pulseToken;
      const alive = () => token === pulseToken;
      const ripples = [0, 170].map((delay) =>
        wait(delay).then(() => {
          const ring = svg('ellipse', { cx: 512, cy: 712, rx: 46, ry: 12, fill: 'none', stroke: '#9db8b2', 'stroke-width': 5, opacity: 0.65 }, water);
          return tween(880, (t) => {
            ring.setAttribute('rx', lerp(46, 190, t));
            ring.setAttribute('ry', lerp(12, 42, t));
            ring.setAttribute('opacity', String(0.65 * (1 - t)));
          }, { easing: ease.out }).then(() => ring.remove());
        }),
      );
      await tween(
        950,
        (t) => {
          if (!alive()) return;
          const hop = Math.sin(t * Math.PI);
          mom.hop.setAttribute('transform', 'translate(0 ' + (-13 * hop).toFixed(1) + ')');
          kidA.hop.setAttribute('transform', 'translate(0 ' + (-8 * hop).toFixed(1) + ')');
          kidB.hop.setAttribute('transform', 'translate(0 ' + (-7 * hop).toFixed(1) + ')');
        },
        { easing: ease.out },
      );
      if (!alive()) return;
      for (const d of [mom, kidA, kidB]) d.hop.setAttribute('transform', '');
      await Promise.all(ripples);
    },
    // 小鸭过桥：鸭妈妈先走，两只小鸭一前一后跟上，走到右岸的芦苇边
    async crossBridge(check) {
      const settle = (d, x) => d.setAttribute('transform', `translate(${x} ${SETTLE_Y})`);
      await Promise.all([
        walk(mom.g, HOME.mom, AWAY.mom, 2400, check).then(() => settle(mom.g, AWAY.mom)),
        wait(500, check).then(() => walk(kidA.g, HOME.a, AWAY.a, 2400, check)).then(() => settle(kidA.g, AWAY.a)),
        wait(950, check).then(() => walk(kidB.g, HOME.b, AWAY.b, 2400, check)).then(() => settle(kidB.g, AWAY.b)),
      ]);
    },
    // 桥被踩得轻轻一颤：要变身啦
    async quiver(check) {
      await tween(
        720,
        (t) => {
          const s = 1 + 0.05 * Math.sin(t * Math.PI * 4) * (1 - t);
          bridge.setAttribute('transform', `translate(512 640) scale(1 ${s.toFixed(3)}) translate(-512 -640)`);
        },
        { check },
      );
      bridge.setAttribute('transform', '');
    },
    // 木桥退场（字形层的墨线把它接了过去）
    fadeBridge: (opacity, ms, check) => fade(bridge, opacity, ms, check),
    // 溪、岸、鸭压淡（避开「一」字的躯干），留给笔顺一个干净的底
    fadeScene: (opacity, ms, check) =>
      Promise.all([fade(water, opacity, ms, check), fade(banks, opacity, ms, check), fade(flock, opacity, ms, check)]),
    // 写完啦：小溪回来，鸭群从字下面游过去——这一横，又架在了小溪上
    async returnHome(check) {
      // trace 开场的 resetAll 会把整层收走：先把实物层亮回来，再让溪和鸭群回家
      root.setAttribute('opacity', 1);
      trail.replaceChildren();
      await Promise.all([fade(water, 0.5, 900, check), fade(banks, 0.5, 900, check), fade(flock, 1, 600, check)]);
      // 鸭群下水：从左岸的水里出发，排成一列游到右边，身后留下一串小水纹
      place(mom.g, 40, 742);
      place(kidA.g, -30, 752);
      place(kidB.g, -95, 760);
      let nextTrail = 80;
      await Promise.all([
        tween(2600, (t, p) => {
          const x = lerp(40, 950, p);
          mom.g.setAttribute('transform', `translate(${x.toFixed(1)} ${(742 - 3 * Math.abs(Math.sin(p * Math.PI * 9))).toFixed(1)}) rotate(3)`);
          if (x > nextTrail) {
            nextTrail += 120;
            const mark = svg('path', { d: `M${x - 66} 748 q 22 8 44 0`, fill: 'none', stroke: '#9db8b2', 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0.5 }, trail);
            tween(1100, (tt) => mark.setAttribute('opacity', String(0.5 * (1 - tt)))).then(() => mark.remove()).catch(() => {});
          }
        }, { check }),
        wait(240, check).then(() => tween(2600, (t, p) => {
          kidA.g.setAttribute('transform', `translate(${lerp(-30, 880, p).toFixed(1)} ${(752 - 2 * Math.abs(Math.sin(p * Math.PI * 9))).toFixed(1)}) rotate(3)`);
        }, { check })),
        wait(480, check).then(() => tween(2600, (t, p) => {
          kidB.g.setAttribute('transform', `translate(${lerp(-95, 815, p).toFixed(1)} ${(760 - 2 * Math.abs(Math.sin(p * Math.PI * 9))).toFixed(1)}) rotate(3)`);
        }, { check })),
      ]);
    },
    reset() {
      pulseToken++;
      trail.replaceChildren();
      water.setAttribute('opacity', 0);
      banks.setAttribute('opacity', 0);
      bridge.setAttribute('opacity', 0);
      bridge.setAttribute('transform', '');
      flock.setAttribute('opacity', 0);
      place(mom.g, HOME.mom, bankY);
      place(kidA.g, HOME.a, bankY + 2);
      place(kidB.g, HOME.b, bankY + 4);
      for (const d of [mom, kidA, kidB]) d.hop.setAttribute('transform', '');
      root.setAttribute('opacity', 0);
      sceneryLayer.replaceChildren();
      scenery = null;
    },
  };
}
