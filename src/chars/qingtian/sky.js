// 「晴」的雨后天空：乌云压着灰蒙蒙的天，太阳从云缝里探出头，云缝里斜下几道金光。
// 组字时雨收云散——云朵各自飘出画面，天色从雨灰放成青蓝（远山显出青色），
// 太阳挪到左边字位凝成「日」，青天的颜色聚到右边凝成「青」。
// 收尾：天大放晴，太阳回到高处，云缝金光洒满，远山处升起一道淡淡的彩虹。
import { svg, tween, wait, ease, lerp } from '../../util.js';

// 太阳升在画面中上偏左，云带在它脚前横亘——太阳上半露出，下半还给云
const SUN_AT = [356, 292];
const SUN_R = 92;
// 组字时太阳挪到「日」独体位的中心（与 morph.js 里 ZUHE_RI 的落位一致）
export const RI_SPOT = [190, 478];

// 四团云：at 中心、puffs 椭圆束 [dx, dy, rx, ry]、dir 飘散方向、drift 是 CSS 动画名；
// 小云不给暗层（云太小，灰调压上去会显脏）
const CLOUDS = [
  {
    at: [452, 352], dir: [1, -0.4], drift: 'a', delay: 0, dark: true,
    puffs: [[0, 0, 150, 64], [-98, 16, 92, 46], [98, 12, 98, 48], [-46, -40, 84, 40], [52, -44, 72, 36], [138, -14, 58, 30]],
  },
  {
    at: [122, 470], dir: [-1, -0.12], drift: 'b', delay: 520, dark: true,
    puffs: [[0, 0, 118, 52], [-72, 14, 72, 36], [72, 10, 76, 38], [-28, -32, 64, 30]],
  },
  {
    at: [760, 300], dir: [1, -0.28], drift: 'c', delay: 300, dark: true,
    puffs: [[0, 0, 128, 56], [-82, 12, 80, 40], [84, 10, 82, 40], [-16, -36, 70, 32]],
  },
  {
    at: [648, 540], dir: [-0.6, 0.38], drift: 'd', delay: 820, dark: false,
    puffs: [[0, 0, 84, 36], [-52, 10, 52, 26], [52, 8, 54, 26]],
  },
];

// 云缝里斜下的金光（跟着云一起散）：细长利落，从云缝斜贯到画底
const RAYS = [
  { d: 'M400 332 L434 326 L648 806 L552 806 Z', op: 0.14 },
  { d: 'M470 342 L494 338 L700 790 L632 790 Z', op: 0.1 },
  { d: 'M348 356 L368 352 L472 690 L400 690 Z', op: 0.07 },
];

// 收尾的彩虹：七色都压得极淡，像宣纸上洇开的一痕
const BOW = ['#c98d8d', '#d9b077', '#e2d18e', '#a9c69a', '#8fb6c9', '#9a9ec2', '#c39ec0'];

// 一缕青色从远山流向字位（组字时「青」的来处）
const AZURE_FLOW = 'M992 264 C 852 296 762 372 690 450';

const place = (el, from, at, s) =>
  el.setAttribute('transform', `translate(${at[0].toFixed(1)} ${at[1].toFixed(1)}) scale(${s.toFixed(3)}) translate(${-from[0]} ${-from[1]})`);

export function createSky(pictureLayer, sceneryLayer) {
  const root = svg('g', { class: 'qingtian-sky', opacity: 0 }, pictureLayer);

  // —— 金光（最底）：细长光柱，wash2 留一点水墨的边缘 ——
  const rays = svg('g', { opacity: 0 }, root);
  RAYS.forEach((r) =>
    svg('path', { d: r.d, fill: '#f0d288', opacity: r.op, filter: 'url(#wash2)' }, rays)
  );

  // —— 太阳（雨后的暖金，藏在主云后面）——
  const sunG = svg('g', { opacity: 0 }, root);
  const sunScaler = svg('g', {}, sunG);
  const sunBody = svg('g', { class: 'qingtian-sun-body breathing' }, sunScaler);
  const sdefs = svg('defs', {}, sunBody);
  const core = svg('radialGradient', { id: 'qingtian-sun-core', cx: '.45', cy: '.4', r: '.65' }, sdefs);
  svg('stop', { offset: '0', 'stop-color': '#f8dca4' }, core);
  svg('stop', { offset: '.6', 'stop-color': '#eebd6f' }, core);
  svg('stop', { offset: '1', 'stop-color': '#dba24f' }, core);
  const [sx, sy] = SUN_AT;
  svg('circle', { cx: sx, cy: sy, r: SUN_R * 1.45, fill: '#f2c988', opacity: 0.2, filter: 'url(#glow)' }, sunBody);
  svg('circle', { cx: sx, cy: sy, r: SUN_R * 1.03, fill: '#eec27e', opacity: 0.24, filter: 'url(#wash2)' }, sunBody);
  svg('circle', { cx: sx, cy: sy, r: SUN_R, fill: 'url(#qingtian-sun-core)', opacity: 0.9, filter: 'url(#wash1)' }, sunBody);
  svg('circle', { cx: sx - 14, cy: sy - 16, r: SUN_R * 0.62, fill: '#fae7bd', opacity: 0.35, filter: 'url(#wash2)' }, sunBody);
  svg('circle', { cx: sx, cy: sy, r: SUN_R * 0.97, fill: 'none', stroke: '#c98f3e', 'stroke-width': 6, opacity: 0.3, filter: 'url(#wash1)' }, sunBody);
  svg('circle', { cx: sx, cy: sy, r: SUN_R * 1.3, fill: '#000', 'fill-opacity': 0 }, sunG); // 摸得到太阳

  // —— 太阳的位置状态：会「挪窝」（组字时挪到字位，收尾时挪回天上） ——
  const sun = { at: [...SUN_AT], s: 1 };
  const setSun = () => place(sunScaler, SUN_AT, sun.at, sun.s);
  setSun();

  // —— 乌云：外层 g 归 JS 管（洇出、飘散），内层 drift 归 CSS 管（慢慢游），互不打架 ——
  const clouds = CLOUDS.map((c) => {
    const outer = svg('g', { class: 'qingtian-cloud', opacity: 0 }, root);
    const drift = svg('g', { class: `qingtian-drift qingtian-drift-${c.drift}` }, outer);
    const [cx, cy] = c.at;
    // 云的体积：灰底、雨云的暗调、被天光照亮的云顶
    if (c.dark) {
      for (const [dx, dy, rx, ry] of c.puffs) {
        svg('ellipse', { cx: cx + dx, cy: cy + dy + 6, rx, ry, fill: '#a9a598', opacity: 0.16, filter: 'url(#wash2)' }, drift);
      }
    }
    for (const [dx, dy, rx, ry] of c.puffs) {
      svg('ellipse', { cx: cx + dx, cy: cy + dy, rx, ry, fill: '#d9d3c4', opacity: 0.88, filter: 'url(#wash1)' }, drift);
    }
    for (const [dx, dy, rx, ry] of c.puffs.slice(1)) {
      svg('ellipse', { cx: cx + dx, cy: cy + dy - 14, rx: rx * 0.82, ry: ry * 0.8, fill: '#efe9da', opacity: 0.5, filter: 'url(#wash1)' }, drift);
    }
    return { c, outer, at: [...c.at], s: 1, op: 0 };
  });
  const setCloud = (cl) => place(cl.outer, cl.c.at, cl.at, cl.s);

  // —— 云上的金雾：太阳脚前的云面被照透的一层漫射，柔化日与云的交界 ——
  const haze = svg('ellipse', {
    cx: 396, cy: 352, rx: 150, ry: 46, fill: '#f2d488', opacity: 0, filter: 'url(#wash2)',
  }, root);

  // —— 青色流带（组字时「青」从远山流过来）——
  const flow = svg('path', {
    d: AZURE_FLOW, fill: 'none', stroke: '#4d8f7c', 'stroke-width': 64,
    'stroke-linecap': 'round', opacity: 0, filter: 'url(#wash2)',
  }, root);

  // —— 彩虹（收尾才现身）——
  const rainbow = svg('g', { class: 'qingtian-rainbow', opacity: 0 }, root);
  BOW.forEach((color, i) => {
    const r = 724 - i * 20;
    svg('path', {
      d: `M${512 - r} 1160 A ${r} ${r} 0 0 1 ${512 + r} 1160`,
      fill: 'none', stroke: color, 'stroke-width': 17, opacity: 0.16, filter: 'url(#wash1)',
    }, rainbow);
  });

  // —— 摸哪儿都算：罩住云群和太阳的透明大椭圆 ——
  const body = svg('g', { class: 'qingtian-bodies' }, root);
  svg('ellipse', { cx: 500, cy: 420, rx: 470, ry: 320, fill: '#000', 'fill-opacity': 0 }, body);

  // —— 背景点缀（1600×1000）：雨灰的天色、放晴的青空、青色远山、暖光 ——
  let scenery = null;
  let rainTint = null;
  let clearTint = null;
  let hills = null;
  let warm = null;
  function buildScenery() {
    sceneryLayer.replaceChildren();
    scenery = svg('g', { class: 'qingtian-scenery' }, sceneryLayer);
    const defs = svg('defs', {}, scenery);
    const rainGrad = svg('linearGradient', { id: 'qingtian-rain-grad', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
    svg('stop', { offset: '0', 'stop-color': '#8d97a2', 'stop-opacity': '.55' }, rainGrad);
    svg('stop', { offset: '.55', 'stop-color': '#9aa39e', 'stop-opacity': '.2' }, rainGrad);
    svg('stop', { offset: '1', 'stop-color': '#9aa39e', 'stop-opacity': '0' }, rainGrad);
    const clearGrad = svg('linearGradient', { id: 'qingtian-clear-grad', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
    svg('stop', { offset: '0', 'stop-color': '#86b7c9', 'stop-opacity': '.5' }, clearGrad);
    svg('stop', { offset: '.5', 'stop-color': '#a9cfd0', 'stop-opacity': '.22' }, clearGrad);
    svg('stop', { offset: '1', 'stop-color': '#a9cfd0', 'stop-opacity': '0' }, clearGrad);
    const warmGrad = svg('linearGradient', { id: 'qingtian-warm-grad', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
    svg('stop', { offset: '0', 'stop-color': '#f6dca4', 'stop-opacity': '0' }, warmGrad);
    svg('stop', { offset: '.55', 'stop-color': '#f4cf8e', 'stop-opacity': '.22' }, warmGrad);
    svg('stop', { offset: '1', 'stop-color': '#f2c179', 'stop-opacity': '.4' }, warmGrad);

    rainTint = svg('g', { opacity: 0 }, scenery);
    svg('rect', { x: 0, y: 0, width: 1600, height: 1000, fill: 'url(#qingtian-rain-grad)' }, rainTint);
    clearTint = svg('g', { opacity: 0 }, scenery);
    svg('rect', { x: 0, y: 0, width: 1600, height: 1000, fill: 'url(#qingtian-clear-grad)' }, clearTint);
    hills = svg('g', { opacity: 0 }, scenery);
    svg('path', {
      d: 'M-60 690 C 200 610 380 660 560 630 C 760 598 900 660 1080 636 C 1280 610 1440 664 1660 630 L1660 850 L-60 850 Z',
      fill: '#7fa08f', opacity: 0.13, filter: 'url(#mist-wash)',
    }, hills);
    svg('path', {
      d: 'M-60 800 C 260 740 420 800 640 772 C 880 742 1040 806 1260 780 C 1440 758 1560 800 1660 782 L1660 900 L-60 900 Z',
      fill: '#6f9585', opacity: 0.16, filter: 'url(#mist-wash)',
    }, hills);
    warm = svg('g', { opacity: 0 }, scenery);
    svg('rect', { x: 0, y: 0, width: 1600, height: 1000, fill: 'url(#qingtian-warm-grad)' }, warm);
    svg('ellipse', { cx: 770, cy: 520, rx: 460, ry: 320, fill: '#f6dda6', opacity: 0.28, filter: 'url(#glow)' }, warm);
  }

  // 天色一起变：雨灰和青空两张色互相让位
  const skyFade = (rainTo, clearTo, ms, check) => {
    const fr = Number(rainTint.getAttribute('opacity'));
    const fc = Number(clearTint.getAttribute('opacity'));
    return tween(
      ms,
      (t) => {
        rainTint.setAttribute('opacity', lerp(fr, rainTo, t));
        clearTint.setAttribute('opacity', lerp(fc, clearTo, t));
      },
      { check },
    );
  };

  const glide = (st, set, to, s, ms, check) => {
    const from = { at: [...st.at], s: st.s };
    return tween(
      ms,
      (t) => {
        st.at = [lerp(from.at[0], to[0], t), lerp(from.at[1], to[1], t)];
        st.s = lerp(from.s, s, t);
        set();
      },
      { check },
    );
  };

  return {
    root,
    body,
    // 雨刚停：天色灰下来，云一朵朵洇出来压住半空，太阳从云缝里探出头，云缝漏下金光
    async appear(check) {
      root.setAttribute('opacity', 1);
      buildScenery();
      const skyP = tween(2400, (t) => rainTint.setAttribute('opacity', (0.42 * t).toFixed(3)), { check });
      const cloudP = clouds.map((cl) =>
        wait(cl.c.delay, check).then(() => {
          cl.op = 1;
          return tween(
            950,
            (t) => {
              cl.s = lerp(0.92, 1, t);
              cl.outer.setAttribute('opacity', t.toFixed(3));
              setCloud(cl);
            },
            { easing: ease.bloom, check },
          );
        }),
      );
      const sunP = wait(650, check).then(() => {
        const from = { at: [SUN_AT[0], SUN_AT[1] + 44], s: 0.9 };
        return tween(
          2200,
          (t) => {
            sunG.setAttribute('opacity', Math.min(1, t * 1.4).toFixed(3));
            sun.at = [from.at[0], lerp(from.at[1], SUN_AT[1], t)];
            sun.s = lerp(from.s, 1, t);
            setSun();
          },
          { easing: ease.bloom, check },
        );
      });
      const rayP = wait(1500, check).then(() =>
        tween(1400, (t) => {
          rays.setAttribute('opacity', t.toFixed(3));
          haze.setAttribute('opacity', (0.14 * t).toFixed(3));
        }, { check }),
      );
      await Promise.all([skyP, ...cloudP, sunP, rayP]);
    },
    // 摸一下：云往四下轻轻让开，太阳探一探，金光一亮，荡开一圈日晕
    async pulse() {
      const ring = svg('circle', { cx: SUN_AT[0], cy: SUN_AT[1], r: SUN_R, fill: 'none', stroke: '#eebd6f', 'stroke-width': 9, filter: 'url(#wash2)', opacity: 0 }, root);
      await tween(
        900,
        (t) => {
          const kick = Math.sin(t * Math.PI);
          for (const cl of clouds) {
            cl.at = [cl.c.at[0] + cl.c.dir[0] * 14 * kick, cl.c.at[1] + cl.c.dir[1] * 14 * kick];
            cl.s = 1 + 0.02 * kick;
            setCloud(cl);
          }
          rays.setAttribute('opacity', (1 + 0.7 * kick).toFixed(3));
          haze.setAttribute('opacity', (0.14 * (1 + kick)).toFixed(3));
          ring.setAttribute('r', SUN_R * lerp(1, 1.9, t));
          ring.setAttribute('opacity', (0.5 * (1 - t)).toFixed(3));
        },
        { easing: ease.out },
      );
      ring.remove();
      rays.setAttribute('opacity', '1');
      for (const cl of clouds) {
        cl.at = [...cl.c.at];
        cl.s = 1;
        setCloud(cl);
      }
    },
    // 雨收云散：云各自飘出画面，金光跟着收
    async cloudsOut(check) {
      const parts = clouds.map((cl, i) =>
        wait(i * 150, check).then(() =>
          tween(
            1900,
            (t) => {
              cl.at = [cl.c.at[0] + cl.c.dir[0] * 340 * t, cl.c.at[1] + cl.c.dir[1] * 340 * t];
              cl.s = lerp(1, 1.12, t);
              cl.outer.setAttribute('opacity', (1 - t).toFixed(3));
              setCloud(cl);
            },
            { easing: ease.inOut, check },
          ),
        ),
      );
      parts.push(tween(900, (t) => {
        rays.setAttribute('opacity', (1 - t).toFixed(3));
        haze.setAttribute('opacity', (0.14 * (1 - t)).toFixed(3));
      }, { check }));
      await Promise.all(parts);
    },
    // 天放晴：雨灰让位给青空，远山显出青色
    skyClear: (check) => skyFade(0.1, 0.5, 2200, check),
    // 组字：太阳挪到「日」的位子
    sunToGlyph: (check) => glide(sun, setSun, RI_SPOT, 1.12, 1700, check),
    // 青色聚过来：远山青一脉，一缕青色流向字位
    async hillsGlow(check) {
      const f = Number(hills.getAttribute('opacity'));
      await tween(
        900,
        (t) => hills.setAttribute('opacity', lerp(f, 0.3, Math.sin(t * Math.PI)).toFixed(3)),
        { check },
      );
      hills.setAttribute('opacity', f.toFixed(3));
      await tween(650, (t) => flow.setAttribute('opacity', (0.2 * Math.sin(t * Math.PI)).toFixed(3)), { check });
      flow.setAttribute('opacity', '0');
    },
    // 字形刻好了，太阳隐成淡淡的影子衬在字后
    fadePics(opacity, ms, check) {
      const f = Number(sunG.getAttribute('opacity'));
      return tween(ms, (t) => sunG.setAttribute('opacity', lerp(f, opacity, t).toFixed(3)), { check });
    },
    // 要看清笔画了，天色退成薄薄一层
    soften: (check) => skyFade(0.06, 0.22, 2400, check),
    // 笔顺动画前后字形压淡时，天色也跟着收
    tintFade(v, ms, check) {
      return skyFade(v, v * 2, ms, check);
    },
    // 字写好了：天大放晴——太阳回到高处更亮，暖光满屏，远山升起一道淡淡的彩虹
    async finale(check) {
      if (!scenery) buildScenery();
      const f = Number(sunG.getAttribute('opacity'));
      const from = { at: [...sun.at], s: sun.s };
      await Promise.all([
        tween(
          2000,
          (t) => {
            sun.at = [lerp(from.at[0], 440, t), lerp(from.at[1], 248, t)];
            sun.s = lerp(from.s, 1.3, t);
            setSun();
            sunG.setAttribute('opacity', lerp(f, 1, t).toFixed(3));
          },
          { easing: ease.bloom, check },
        ),
        tween(2200, (t) => {
          clearTint.setAttribute('opacity', (0.5 * t).toFixed(3));
          warm.setAttribute('opacity', t.toFixed(3));
          hills.setAttribute('opacity', lerp(0.22, 0.26, t).toFixed(3));
        }, { check }),
        wait(500, check).then(() => tween(1700, (t) => rainbow.setAttribute('opacity', t.toFixed(3)), { check })),
        wait(300, check).then(() => tween(1200, (t) => rays.setAttribute('opacity', (0.8 * t).toFixed(3)), { check })),
      ]);
    },
    reset() {
      root.setAttribute('opacity', 0);
      rays.setAttribute('opacity', 0);
      haze.setAttribute('opacity', 0);
      sunG.setAttribute('opacity', 0);
      flow.setAttribute('opacity', 0);
      rainbow.setAttribute('opacity', 0);
      sun.at = [...SUN_AT];
      sun.s = 1;
      setSun();
      for (const cl of clouds) {
        cl.at = [...cl.c.at];
        cl.s = 1;
        cl.op = 0;
        cl.outer.setAttribute('opacity', 0);
        setCloud(cl);
      }
      sceneryLayer.replaceChildren();
      scenery = rainTint = clearTint = hills = warm = null;
    },
  };
}
