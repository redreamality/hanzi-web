// 「情」的实物画面：一个小朋友盘腿坐着，双手捧着自己的一颗心。
// 想着喜欢的人，心就暖暖的、怦怦地跳（心族的胭脂红，是全画唯一的彩色）。
// 摸一下：心怦怦跳两下，冒出几颗小心心摇摇晃晃往上飘，小朋友也跟着轻轻晃。
// 组字时：小朋友隐去，这颗心轻轻飘起来，飞到「青」的旁边站成竖心旁。
// 背景层（layers.scenery，1600×1000 坐标）：远处一抹青色的山（青家的山）和一小片暖光。
import { svg, tween, wait, lerp, ease } from '../../util.js';

// 小朋友（屏幕坐标）：盘腿坐，双手捧在胸前
const SIT_AXLE = [512, 780]; // 臀部（晃动时的轴）
const HEART_AT = [512, 596]; // 心悬停的地方（掌上方）
const HEAD_AT = [512, 474]; // 头心

// 一颗心：中心在原点，宽九十六、高九十二，心尖朝下
const HEART_D =
  'M0 -20 C -14 -44 -48 -40 -48 -10 C -48 14 -20 30 0 48 C 20 30 48 14 48 -10 C 48 -40 14 -44 0 -20 Z';

const INK_BODY = '#2a241e'; // 人物深墨剪影（与「休」的小人同款）
const HEART_RED = '#c2455c'; // 心族的胭脂红（「心」一课定的族色，与日系朱砂、火族绛红拉开层次）
const HEART_DARK = '#8e2f4a'; // 心族的紫胭（描边）
const HEART_GLOW = '#f2c1bd'; // 心族的暖粉晕

const scaleAt = (el, [ox, oy], s) =>
  el.setAttribute('transform', `translate(${ox} ${oy}) scale(${s}) translate(${-ox} ${-oy})`);
const rotateAt = (el, [ox, oy], deg) => el.setAttribute('transform', `rotate(${deg} ${ox} ${oy})`);

export function createKid(pictureLayer, sceneryLayer) {
  const root = svg('g', { class: 'qingxin-kid', opacity: 0 }, pictureLayer);

  // 渐变与轻滤镜都加本字前缀，不碰共享的
  const defs = svg('defs', {}, root);
  const haloGrad = svg('radialGradient', { id: 'qingxin-halo' }, defs);
  svg('stop', { offset: 0, 'stop-color': HEART_GLOW, 'stop-opacity': 0.6 }, haloGrad);
  svg('stop', { offset: 0.55, 'stop-color': HEART_GLOW, 'stop-opacity': 0.24 }, haloGrad);
  svg('stop', { offset: 1, 'stop-color': HEART_GLOW, 'stop-opacity': 0 }, haloGrad);
  const soft = svg('filter', { id: 'qingxin-soft', x: '-30%', y: '-30%', width: '160%', height: '160%' }, defs);
  svg('feGaussianBlur', { stdDeviation: 2 }, soft);

  // ---- 小朋友（kidG 整体淡出时，心不在里面） ----
  const kidG = svg('g', { class: 'qingxin-person' }, root);

  // 地面：一小片淡淡的影子（不做横贯的地面线）
  const shadow = svg('ellipse', { cx: 512, cy: 800, rx: 132, ry: 15, fill: '#4a423a', opacity: 0, filter: 'url(#wash2)' }, kidG);

  // 盘着的两条腿：一道弯弯的粗笔，两头圆圆的膝盖
  const legG = svg('g', { opacity: 0 }, kidG);
  const legP = svg('path', {
    d: 'M436 764 C 458 802 566 802 588 764',
    fill: 'none', stroke: INK_BODY, 'stroke-width': 30, 'stroke-linecap': 'round', pathLength: 1,
  }, legG);
  svg('circle', { cx: 436, cy: 766, r: 15, fill: INK_BODY }, legG);
  svg('circle', { cx: 588, cy: 766, r: 15, fill: INK_BODY }, legG);

  // 躯干：肩到臀的一团深墨（从腰里长出来）
  const torsoG = svg('g', {}, kidG);
  const TORSO_BOX = [512, 770]; // 躯干生长的轴（臀部）
  const torsoP = svg('path', {
    d: 'M470 542 C 462 620 460 700 470 748 C 492 770 532 770 554 748 C 564 700 562 620 554 542 C 522 524 502 524 470 542 Z',
    fill: INK_BODY,
  }, torsoG);

  // 头：圆圆的深墨脑袋，顶上一撮呆毛，闭着的笑眼，两点腮红
  const headG = svg('g', {}, kidG);
  const headC = svg('circle', { cx: HEAD_AT[0], cy: HEAD_AT[1], r: 0, fill: INK_BODY }, headG);
  const face = svg('g', { opacity: 0 }, headG);
  svg('path', {
    d: 'M512 442 q 6 -18 24 -22 M512 442 q -4 -16 -16 -24',
    fill: 'none', stroke: INK_BODY, 'stroke-width': 5, 'stroke-linecap': 'round',
  }, face);
  svg('path', {
    d: 'M488 472 q 8 7 16 0 M520 472 q 8 7 16 0',
    fill: 'none', stroke: '#e9dcc4', 'stroke-width': 4.5, 'stroke-linecap': 'round', opacity: 0.9,
  }, face);
  svg('ellipse', { cx: 484, cy: 492, rx: 8, ry: 5, fill: '#d98a8a', opacity: 0.5, filter: 'url(#qingxin-soft)' }, face);
  svg('ellipse', { cx: 540, cy: 492, rx: 8, ry: 5, fill: '#d98a8a', opacity: 0.5, filter: 'url(#qingxin-soft)' }, face);

  // 两条手臂（各自的肩为轴，心脱手时向外张开）：从肩弯到胸前，捧着
  const SHOULDER_L = [486, 566];
  const SHOULDER_R = [538, 566];
  const armLG = svg('g', {}, kidG);
  const armL = svg('path', {
    d: 'M486 566 C 468 620 452 662 472 692',
    fill: 'none', stroke: INK_BODY, 'stroke-width': 23, 'stroke-linecap': 'round', pathLength: 1,
  }, armLG);
  const handL = svg('ellipse', { cx: 474, cy: 700, rx: 17, ry: 12, fill: INK_BODY, opacity: 0, transform: 'rotate(-18 474 700)' }, armLG);
  const armRG = svg('g', {}, kidG);
  const armR = svg('path', {
    d: 'M538 566 C 556 620 572 662 552 692',
    fill: 'none', stroke: INK_BODY, 'stroke-width': 23, 'stroke-linecap': 'round', pathLength: 1,
  }, armRG);
  const handR = svg('ellipse', { cx: 550, cy: 700, rx: 17, ry: 12, fill: INK_BODY, opacity: 0, transform: 'rotate(18 550 700)' }, armRG);
  const armStroke = (p, t) => {
    p.setAttribute('stroke-dasharray', '1 1');
    p.setAttribute('stroke-dashoffset', String(1 - t));
  };

  // ---- 心（独立于 kidG：小朋友隐去时它还在） ----
  const heartG = svg('g', { class: 'qingxin-heart', opacity: 0, transform: `translate(${HEART_AT[0]} ${HEART_AT[1]})` }, root);
  const halo = svg('ellipse', { cx: 0, cy: 4, rx: 132, ry: 118, fill: 'url(#qingxin-halo)' }, heartG);
  const beatG = svg('g', { class: 'qingxin-beat' }, heartG);
  svg('path', { d: HEART_D, fill: HEART_RED, stroke: HEART_DARK, 'stroke-width': 3 }, beatG);
  svg('path', {
    d: 'M-24 -18 C -32 -10 -30 -2 -22 -6 C -16 -10 -18 -18 -24 -18 Z',
    fill: '#f2e2d2', opacity: 0.55, filter: 'url(#qingxin-soft)',
  }, beatG);

  // 小心心泡泡、闪光，都收在这层，reset 好清
  const fx = svg('g', {}, root);

  // 摸哪儿都算摸到：罩住小朋友和心的透明形状，放最上层稳稳接住点击
  const body = svg('g', {}, root);
  svg('ellipse', { cx: 512, cy: 636, rx: 310, ry: 280, fill: '#000', 'fill-opacity': 0 }, body);

  // ---- 远处的青色山影和一小片暖光（背景坐标 1600×1000） ----
  let scenery = null;
  const buildScenery = () => {
    sceneryLayer.replaceChildren();
    scenery = svg('g', { opacity: 0 }, sceneryLayer);
    // 青家的远山：情里的青，就是从这样的山色里来的
    svg('path', {
      d: 'M-50 620 C 180 560 340 620 520 585 C 700 550 860 615 1040 580 C 1230 545 1400 600 1650 566 L1650 760 L-50 760 Z',
      fill: '#7fa08f', opacity: 0.15, filter: 'url(#mist-wash)',
    }, scenery);
    svg('path', {
      d: 'M-60 705 C 90 648 210 630 330 660 L330 780 L-60 780 Z',
      fill: '#6f9585', opacity: 0.11, filter: 'url(#mist-wash)',
    }, scenery);
    // 心里的暖：右上角一小片淡淡的暖光
    svg('ellipse', { cx: 1280, cy: 250, rx: 260, ry: 190, fill: 'url(#qingxin-halo)', opacity: 0.8 }, scenery);
  };

  // 心所在的位置（飞行、落回都从这儿出发）
  const heartAt = () => {
    const m = /translate\(([-\d.]+) ([-\d.]+)\)/.exec(heartG.getAttribute('transform') || '');
    return m ? [Number(m[1]), Number(m[2])] : [...HEART_AT];
  };
  const heartTo = ([x, y], extra = '') =>
    heartG.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})${extra}`);
  // 心自己的形状（收窄、拉长都用它；beatG 上还有 CSS 的呼吸，两者不叠在同一元素）
  const heartShape = (sx, sy) => beatG.setAttribute('transform', `scale(${sx.toFixed(3)} ${sy.toFixed(3)})`);

  // 冒几颗小心心：从心旁边摇摇晃晃往上飘，渐渐淡掉（小元素，干净颜色不套大 wash）
  function popHearts([x, y], n, check) {
    return Promise.all(
      Array.from({ length: n }, (_, i) =>
        wait(i * 240, check).then(() => {
          const g = svg('g', { opacity: 0 }, fx);
          const s = 0.3 + Math.random() * 0.14;
          svg('path', { d: HEART_D, fill: HEART_RED, opacity: 0.8, transform: `scale(${s})` }, g);
          const dir = i % 2 === 0 ? -1 : 1;
          return tween(1500, (t) => {
            g.setAttribute('transform', `translate(${(x + dir * (26 + i * 14) * Math.sin(t * Math.PI * 1.6)).toFixed(1)} ${(y - 30 - t * 175).toFixed(1)}) rotate(${dir * t * 40})`);
            g.setAttribute('opacity', String(0.8 * Math.min(1, t * 5) * (1 - t * t)));
          }, { easing: ease.out, check }).then(() => g.remove());
        }),
      ),
    );
  }

  let pulseToken = 0;

  return {
    root,
    body,
    // 小朋友一笔一笔长出来，捧着的心也洇出来，开始怦怦跳
    async appear(check, { fast = false } = {}) {
      const f = fast ? 0.45 : 1;
      root.setAttribute('opacity', 1);
      buildScenery();
      tween(2200 * f, (t) => scenery.setAttribute('opacity', String(t)), { check }).catch(() => {});
      kidG.setAttribute('opacity', 1);
      await tween(420 * f, (t) => shadow.setAttribute('opacity', String(t * 0.3)), { check });
      await Promise.all([
        tween(560 * f, (t) => scaleAt(torsoG, TORSO_BOX, t), { easing: ease.bloom, check }),
        wait(320 * f, check).then(() => tween(460 * f, (t) => headC.setAttribute('r', (36 * t).toFixed(1)), { easing: ease.bloom, check })),
      ]);
      await tween(340 * f, (t) => face.setAttribute('opacity', String(t)), { check });
      await Promise.all([
        tween(420 * f, (t) => {
          legG.setAttribute('opacity', '1');
          legP.setAttribute('stroke-dasharray', '1 1');
          legP.setAttribute('stroke-dashoffset', String(1 - t));
        }, { check }),
        tween(420 * f, (t) => armStroke(armL, t), { check }),
        tween(420 * f, (t) => armStroke(armR, t), { check }).then(() =>
          tween(220 * f, (t) => {
            handL.setAttribute('opacity', String(t));
            handR.setAttribute('opacity', String(t));
          }, { check }),
        ),
      ]);
      // 心：暖光先亮，心形慢慢洇出来，然后开始怦怦地跳
      await tween(600 * f, (t) => {
        heartG.setAttribute('opacity', String(t));
        halo.setAttribute('opacity', String(t));
        heartShape(lerp(0.3, 1, ease.bloom(t)), lerp(0.3, 1, ease.bloom(t)));
      }, { easing: ease.out, check });
      heartShape(1, 1);
      beatG.classList.add('qingxin-beating');
      kidG.classList.add('qingxin-breathing');
    },

    // 摸一下：心怦怦跳两下，冒几颗小心心，小朋友也跟着轻轻晃
    async pulse() {
      const token = ++pulseToken;
      const alive = () => token === pulseToken;
      const [hx, hy] = heartAt();
      popHearts([hx, hy], 3).catch(() => {});
      // CSS 的慢心跳、慢呼吸和这里 JS 的动画都用 transform：先停掉 CSS 的，跳完再加回来
      beatG.classList.remove('qingxin-beating');
      kidG.classList.remove('qingxin-breathing');
      await tween(
        950,
        (t) => {
          if (!alive()) return;
          // 两下心跳：快快地缩放两次
          const beat = Math.max(Math.sin(t * Math.PI * 2), Math.sin(t * Math.PI * 4) * 0.4) * 0.16;
          beatG.setAttribute('transform', `scale(${(1 + beat).toFixed(3)} ${(1 + beat * 1.25).toFixed(3)})`);
          halo.setAttribute('opacity', String(lerp(1, 1.5, Math.sin(t * Math.PI))));
          // 小朋友开心地轻轻晃：以臀为轴左右摆
          rotateAt(kidG, SIT_AXLE, Math.sin(t * Math.PI * 2.5) * 1.6 * (1 - t));
        },
        { easing: ease.out },
      );
      if (!alive()) return;
      beatG.setAttribute('transform', 'scale(1 1)');
      halo.setAttribute('opacity', '1');
      rotateAt(kidG, SIT_AXLE, 0);
      beatG.classList.add('qingxin-beating');
      kidG.classList.add('qingxin-breathing');
    },

    // 组字开始：双臂向外张开（心要脱手了），小朋友慢慢隐去
    async handsOpen(check) {
      await tween(700, (t) => {
        rotateAt(armLG, SHOULDER_L, 24 * t);
        rotateAt(armRG, SHOULDER_R, -24 * t);
      }, { check });
    },
    async fadeAway(check) {
      kidG.classList.remove('qingxin-breathing');
      await tween(1100, (t) => kidG.setAttribute('opacity', String(1 - t)), { check });
    },

    // 心沿着弯弯的弧线飞去「青」的旁边（to 是竖心旁的竖笔上方）
    async flyHeart(to, check) {
      beatG.classList.remove('qingxin-beating');
      const from = heartAt();
      const cx = (from[0] + to[0]) / 2 - 130;
      const cy = Math.min(from[1], to[1]) - 160;
      await tween(1500, (t) => {
        const mt = 1 - t;
        const x = mt * mt * from[0] + 2 * mt * t * cx + t * t * to[0];
        const y = mt * mt * from[1] + 2 * mt * t * cy + t * t * to[1];
        heartTo([x, y], ` rotate(${(Math.sin(t * Math.PI * 2) * 14).toFixed(1)})`);
        const s = lerp(1, 0.78, Math.sin(t * Math.PI));
        heartShape(s, s);
      }, { easing: ease.inOut, check });
      heartTo(to);
      heartShape(0.85, 0.85);
      // 悬停时轻轻跳两下，等着落进字里
      await tween(700, (t) => {
        const beat = Math.sin(t * Math.PI * 2) * 0.1;
        heartShape(0.85 + beat, 0.85 + beat * 1.3);
      }, { check });
      heartShape(0.85, 0.85);
    },

    // 写竖心旁的两个点：心朝落笔的那一边轻轻跳一下
    async heartThump(dir, check) {
      const at = heartAt();
      await tween(360, (t) => {
        const k = Math.sin(t * Math.PI);
        heartTo([at[0] + dir * 16 * k, at[1] - 6 * k]);
        heartShape(0.85 + 0.12 * k, 0.85 + 0.16 * k);
      }, { check });
      heartTo(at);
      heartShape(0.85, 0.85);
    },

    // 写竖的时候：心收窄、拉长，轻轻贴到竖笔上，隐进去（心站直了）
    async heartSqueeze(to, check) {
      const from = heartAt();
      await tween(800, (t) => {
        heartTo([lerp(from[0], to[0], t), lerp(from[1], to[1], t)]);
        heartShape(lerp(0.85, 0.4, t), lerp(0.85, 2.1, t));
        heartG.setAttribute('opacity', String(1 - t * t));
      }, { easing: ease.inOut, check });
      heartG.setAttribute('opacity', '0');
    },

    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity') ?? 1);
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },

    // 字写好了：小朋友一笔一笔快速长回来，心从半空轻轻落回手心，
    // 又怦怦地跳、冒出小心心，最后整幅淡成一层暖暖的影子衬着字
    async finale(check) {
      root.setAttribute('opacity', 1);
      buildScenery();
      tween(1400, (t) => scenery.setAttribute('opacity', String(t * 0.9)), { check }).catch(() => {});
      // reset 后孩子是收起的状态：像被重新写出来一样快速长一遍
      kidG.setAttribute('opacity', '1');
      const reveal = async () => {
        await tween(360, (t) => shadow.setAttribute('opacity', String(t * 0.3)), { check });
        await Promise.all([
          tween(420, (t) => scaleAt(torsoG, TORSO_BOX, t), { easing: ease.bloom, check }),
          tween(380, (t) => headC.setAttribute('r', (36 * t).toFixed(1)), { easing: ease.bloom, check }),
        ]);
        await Promise.all([
          tween(260, (t) => face.setAttribute('opacity', String(t)), { check }),
          tween(320, (t) => {
            legG.setAttribute('opacity', '1');
            legP.setAttribute('stroke-dasharray', '1 1');
            legP.setAttribute('stroke-dashoffset', String(1 - t));
          }, { check }),
          tween(320, (t) => armStroke(armL, t), { check }),
          tween(320, (t) => armStroke(armR, t), { check }),
        ]);
        handL.setAttribute('opacity', '1');
        handR.setAttribute('opacity', '1');
        kidG.classList.add('qingxin-breathing');
      };
      // 心从上方轻轻落回掌心（和孩子长出来同时进行）
      const drop = (async () => {
        await wait(500, check);
        heartShape(0.85, 0.85);
        heartTo([HEART_AT[0], HEART_AT[1] - 300]);
        heartG.setAttribute('opacity', '1');
        await tween(850, (t) => {
          const dropT = t * t;
          heartTo([HEART_AT[0], HEART_AT[1] - 300 + 300 * dropT]);
          const s = 0.85 + Math.sin(t * Math.PI) * 0.08;
          heartShape(s, s);
        }, { easing: ease.out, check });
        // 落定的欢喜：跳一下、扁一下（squash）
        await tween(420, (t) => {
          const k = Math.sin(t * Math.PI);
          heartShape(0.85 + k * 0.16, 0.85 - k * 0.1 + k * k * 0.24);
        }, { check });
        heartShape(1, 1);
        heartTo(HEART_AT);
        beatG.classList.add('qingxin-beating');
      })();
      await Promise.all([reveal(), drop]);
      await Promise.all([popHearts(HEART_AT, 2, check), tween(900, (t) => root.setAttribute('opacity', lerp(1, 0.3, t)), { check })]);
    },

    reset() {
      pulseToken++;
      fx.replaceChildren();
      kidG.setAttribute('opacity', '1');
      kidG.classList.remove('qingxin-breathing');
      rotateAt(kidG, SIT_AXLE, 0);
      shadow.setAttribute('opacity', 0);
      legG.setAttribute('opacity', 0);
      legP.removeAttribute('stroke-dasharray');
      legP.removeAttribute('stroke-dashoffset');
      scaleAt(torsoG, TORSO_BOX, 0);
      headC.setAttribute('r', '0');
      face.setAttribute('opacity', 0);
      rotateAt(armLG, SHOULDER_L, 0);
      rotateAt(armRG, SHOULDER_R, 0);
      [armL, armR].forEach((p) => {
        p.removeAttribute('stroke-dasharray');
        p.removeAttribute('stroke-dashoffset');
      });
      handL.setAttribute('opacity', 0);
      handR.setAttribute('opacity', 0);
      heartG.setAttribute('opacity', '0');
      heartTo(HEART_AT);
      heartShape(1, 1);
      halo.setAttribute('opacity', '1');
      beatG.classList.remove('qingxin-beating');
      root.setAttribute('opacity', 0);
      sceneryLayer.replaceChildren();
      scenery = null;
    },
  };
}
