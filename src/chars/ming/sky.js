// 「明」的夜窗：夜里一扇亮着灯的方格小窗，窗外挂着一弯月亮。
// 窗在左、月在右——和「明」字里囧左月右的站位一样；组字时它们各自挪到字位上。
// 月光从窗子照进来，屋里亮亮的，就是明。天色放在背景层（layers.scenery，1600×1000 坐标）。
import { svg, tween, wait, ease, lerp } from '../../util.js';

const WINDOW_AT = [330, 600];
const WIN = { w: 300, h: 360, r: 30 };
const MOON_AT = [700, 258];
const MOON_GEO = { R: 150, r: 122, dx: 66, rot: (-14 * Math.PI) / 180 };

// 组字时实物要挪到的字位（与 morph.js 里囧、月的字位一致）
export const JIONG_SPOT = [271, 406];
export const YUE_SPOT = [640, 484];

// 圆角矩形 path（窗框、窗格底光、光晕圈都用它）
function rrect({ x, y, w, h, r }) {
  return (
    `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 -${r} ${r}` +
    `h${-(w - 2 * r)}a${r} ${r} 0 0 1 -${r} -${r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} -${r}Z`
  );
}
const winBox = (k = 1) => ({ x: WINDOW_AT[0] - (WIN.w * k) / 2, y: WINDOW_AT[1] - (WIN.h * k) / 2, w: WIN.w * k, h: WIN.h * k, r: WIN.r * k });

// 两段圆弧相交出月牙（与「月」一课同款几何，参数自定）：背（外弧）+ 怀抱（内弧）
function crescentEdges({ cx, cy, R, r, dx, rot }) {
  const x0 = (dx * dx + R * R - r * r) / (2 * dx);
  const y0 = Math.sqrt(Math.max(1, R * R - x0 * x0));
  const arc = (rad, ox, from, to, n) =>
    Array.from({ length: n }, (_, i) => {
      const a = lerp(from, to, i / (n - 1));
      const px = ox + rad * Math.cos(a);
      const py = rad * Math.sin(a);
      return [cx + px * Math.cos(rot) - py * Math.sin(rot), cy + px * Math.sin(rot) + py * Math.cos(rot)];
    });
  // 屏幕坐标 y 朝下：角度从上尖递减、经过 π（左侧），就沿背走一圈
  let a1 = Math.atan2(-y0, x0);
  let a2 = Math.atan2(y0, x0);
  if (a2 > a1) a2 -= Math.PI * 2;
  let b1 = Math.atan2(-y0, x0 - dx);
  let b2 = Math.atan2(y0, x0 - dx);
  if (b2 > b1) b2 -= Math.PI * 2;
  return { back: arc(R, 0, a1, a2, 26), arm: arc(r, dx, b1, b2, 26) };
}

// 月牙轮廓 path（背去、怀抱回）；k 是绕月心的整体缩放，geo 可换成描高光用的窄带
function moonD({ cx, cy }, k = 1, geo = MOON_GEO) {
  const { back, arm } = crescentEdges({ cx, cy, R: geo.R * k, r: geo.r * k, dx: geo.dx * k, rot: geo.rot });
  return (
    [...back, ...[...arm].reverse()]
      .map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
      .join('') + 'Z'
  );
}

// 晨星（背景坐标）：撒在上半空，避开月亮一带；[x, y, 半径, 是否闪烁]
const STARS = [
  [262, 128, 3.6, 1], [386, 238, 2.6, 0], [524, 96, 3.1, 1], [644, 290, 2.6, 0],
  [176, 344, 3.2, 1], [436, 392, 2.8, 1], [92, 206, 2.7, 0], [1224, 108, 3.4, 1],
  [1362, 214, 4.0, 1], [1448, 88, 3.0, 0], [1512, 304, 3.2, 1], [1246, 396, 2.6, 0],
  [1400, 414, 3.0, 1], [958, 470, 2.6, 0],
];

export function createSky(pictureLayer, sceneryLayer) {
  const root = svg('g', { class: 'ming-sky', opacity: 0 }, pictureLayer);
  // 实物的身体：太阳和月亮都在里面，摸到哪一个都算摸到。
  // 再垫一片罩住整片晨空的透明椭圆——日月之间的空档也算摸到（包围盒中心就落在那儿）。
  const body = svg('g', { class: 'ming-bodies' }, root);
  svg('ellipse', { cx: 505, cy: 470, rx: 340, ry: 390, fill: '#000', 'fill-opacity': 0 }, body);

  // —— 左边一扇亮着灯的小窗（夜里屋里透出的暖光） ——
  const winG = svg('g', { opacity: 0 }, body);
  const winScaler = svg('g', {}, winG);
  const winBody = svg('g', { class: 'ming-win-body breathing' }, winScaler);
  const wdefs = svg('defs', {}, winBody);
  const wcore = svg('radialGradient', { id: 'ming-win-core', cx: '.5', cy: '.42', r: '.75' }, wdefs);
  svg('stop', { offset: '0', 'stop-color': '#f8e7bd' }, wcore);
  svg('stop', { offset: '.55', 'stop-color': '#f0d49a' }, wcore);
  svg('stop', { offset: '1', 'stop-color': '#dcb672' }, wcore);
  const [wx, wy] = WINDOW_AT;
  // 暖光先铺满窗洞（窗格后面的光），边上一圈更亮的水彩积色
  svg('path', { d: rrect(winBox(1.12)), fill: '#f2dca4', opacity: 0.2, filter: 'url(#glow)' }, winBody);
  const panes = svg('path', { d: rrect(winBox(0.94)), fill: 'url(#ming-win-core)', opacity: 0.8, filter: 'url(#wash1)' }, winBody);
  svg('path', { d: rrect(winBox(0.94)), fill: 'none', stroke: '#c99b4e', 'stroke-width': 5, opacity: 0.3, filter: 'url(#wash1)' }, winBody);
  // 木窗棂：外框两圈（深木色勾边＋淡的水彩边），中间一根竖棂、一根横棂——和囧的窗格一样
  svg('path', { d: rrect(winBox()), fill: 'none', stroke: '#3e2f20', 'stroke-width': 24, 'stroke-linejoin': 'round', opacity: 0.22, filter: 'url(#wash2)' }, winBody);
  const frame = svg('path', { d: rrect(winBox()), fill: 'none', stroke: '#5b4630', 'stroke-width': 16, 'stroke-linejoin': 'round', opacity: 0.92, filter: 'url(#wash1)' }, winBody);
  const mullV = svg('line', { x1: wx, y1: wy - WIN.h / 2 + 8, x2: wx, y2: wy + WIN.h / 2 - 8, stroke: '#5b4630', 'stroke-width': 12, 'stroke-linecap': 'round', opacity: 0.9, filter: 'url(#wash1)' }, winBody);
  const mullH = svg('line', { x1: wx - WIN.w / 2 + 8, y1: wy, x2: wx + WIN.w / 2 - 8, y2: wy, stroke: '#5b4630', 'stroke-width': 12, 'stroke-linecap': 'round', opacity: 0.9, filter: 'url(#wash1)' }, winBody);
  svg('path', { d: rrect(winBox(1.18)), fill: '#000', 'fill-opacity': 0 }, winG); // 摸得到窗子

  // —— 西边淡淡的月牙 ——
  const moonG = svg('g', { opacity: 0 }, body);
  const moonScaler = svg('g', {}, moonG);
  const moonBody = svg('g', { class: 'ming-moon-body breathing' }, moonScaler);
  const mdefs = svg('defs', {}, moonBody);
  const mcore = svg('radialGradient', { id: 'ming-moon-core', cx: '.42', cy: '.38', r: '.8' }, mdefs);
  svg('stop', { offset: '0', 'stop-color': '#f6ecd4' }, mcore);
  svg('stop', { offset: '.6', 'stop-color': '#e6d3a6' }, mcore);
  svg('stop', { offset: '1', 'stop-color': '#cdb273' }, mcore);
  const [mx, my] = MOON_AT;
  const halo = svg('path', { fill: '#e9d8a6', opacity: 0.16, filter: 'url(#glow)' }, moonBody);
  const core = svg('path', { fill: 'url(#ming-moon-core)', opacity: 0.88, filter: 'url(#wash1)' }, moonBody);
  const hi = svg('path', { fill: '#f8f0d8', opacity: 0.3, filter: 'url(#wash2)' }, moonBody);
  const rim = svg('path', { fill: 'none', stroke: '#a98a45', 'stroke-width': 5, 'stroke-linejoin': 'round', opacity: 0.28, filter: 'url(#wash1)' }, moonBody);
  const paintMoon = () => {
    core.setAttribute('d', moonD({ cx: mx, cy: my }));
    rim.setAttribute('d', moonD({ cx: mx, cy: my }));
    halo.setAttribute('d', moonD({ cx: mx, cy: my }, 1.34));
    // 高光只留贴着背的一条窄边，像晨光落在月牙的背上
    hi.setAttribute('d', moonD({ cx: mx, cy: my }, 1, { ...MOON_GEO, R: MOON_GEO.R - 6, r: MOON_GEO.R + 42 }));
  };
  paintMoon();
  svg('ellipse', { cx: 676, cy: 258, rx: 108, ry: 148, fill: '#000', 'fill-opacity': 0 }, moonG); // 摸得到月亮

  // —— 位置状态：窗子、月亮都会「挪窝」（组字时挪到字位，收尾时挪回原位） ——
  const place = (el, from, at, s) =>
    el.setAttribute('transform', `translate(${at[0].toFixed(1)} ${at[1].toFixed(1)}) scale(${s.toFixed(3)}) translate(${-from[0]} ${-from[1]})`);
  const win = { at: [...WINDOW_AT], s: 1 };
  const moon = { at: [...MOON_AT], s: 1 };
  const setWin = () => place(winScaler, WINDOW_AT, win.at, win.s);
  const setMoon = () => place(moonScaler, MOON_AT, moon.at, moon.s);

  // —— 背景：夜色、星星、屋里亮起的暖光 ——
  let scenery = null;
  let tint = null;
  let stars = null;
  let warm = null;
  function buildScenery() {
    sceneryLayer.replaceChildren();
    scenery = svg('g', { class: 'ming-scenery' }, sceneryLayer);
    const defs = svg('defs', {}, scenery);
    const night = svg('linearGradient', { id: 'ming-night-grad', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
    svg('stop', { offset: '0', 'stop-color': '#10162b', 'stop-opacity': '.9' }, night);
    svg('stop', { offset: '.45', 'stop-color': '#232a4d', 'stop-opacity': '.55' }, night);
    svg('stop', { offset: '.78', 'stop-color': '#3d3a58', 'stop-opacity': '.3' }, night);
    svg('stop', { offset: '1', 'stop-color': '#4a4157', 'stop-opacity': '0' }, night);
    tint = svg('g', { opacity: 0 }, scenery);
    svg('rect', { x: 0, y: 0, width: 1600, height: 1000, fill: 'url(#ming-night-grad)' }, tint);
    // 星星不跟着夜色一起变淡，所以单独一组
    stars = svg('g', { opacity: 0 }, scenery);
    svg('circle', { cx: 262, cy: 128, r: 10, fill: '#f2e9cd', opacity: 0.24, filter: 'url(#glow)' }, stars);
    svg('circle', { cx: 1362, cy: 214, r: 9, fill: '#f2e9cd', opacity: 0.2, filter: 'url(#glow)' }, stars);
    STARS.forEach(([x, y, r, tw], i) => {
      const star = svg('circle', { cx: x, cy: y, r, fill: '#f0e8ca' }, stars);
      if (tw) {
        star.setAttribute('class', 'ming-star');
        star.style.setProperty('--d', `${(2.6 + (i % 5) * 0.8).toFixed(1)}s`);
        star.style.setProperty('--o', `${((i % 7) * 0.4).toFixed(1)}s`);
      }
    });
    warm = svg('g', { opacity: 0 }, scenery);
    const warmg = svg('linearGradient', { id: 'ming-warm-grad', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
    svg('stop', { offset: '0', 'stop-color': '#f6dca4', 'stop-opacity': '0' }, warmg);
    svg('stop', { offset: '.55', 'stop-color': '#f4cf8e', 'stop-opacity': '.26' }, warmg);
    svg('stop', { offset: '1', 'stop-color': '#f2c179', 'stop-opacity': '.42' }, warmg);
    svg('rect', { x: 0, y: 0, width: 1600, height: 1000, fill: 'url(#ming-warm-grad)' }, warm);
    // 字写好了：月光照进屋里，一团暖光从字后面满开来
    svg('ellipse', { cx: 770, cy: 460, rx: 430, ry: 300, fill: '#f6dda6', opacity: 0.28, filter: 'url(#glow)' }, warm);
  }

  const skyFade = (tintTo, starTo, ms, check) => {
    const f = Number(tint.getAttribute('opacity'));
    const fs = Number(stars.getAttribute('opacity'));
    return tween(
      ms,
      (t) => {
        tint.setAttribute('opacity', lerp(f, tintTo, t));
        stars.setAttribute('opacity', lerp(fs, starTo, t));
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
    // 夜色落下来，星星眨着眼；窗子里的灯亮起来，窗外慢慢显出一弯月亮
    async appear(check) {
      root.setAttribute('opacity', 1);
      buildScenery();
      const skyP = tween(
        2600,
        (t) => {
          tint.setAttribute('opacity', (0.5 * t).toFixed(3));
          stars.setAttribute('opacity', (0.85 * t).toFixed(3));
        },
        { check },
      );
      const winP = tween(
        2400,
        (t) => {
          winG.setAttribute('opacity', Math.min(1, t * 1.6));
          win.s = lerp(0.2, 1, t);
          win.at = [WINDOW_AT[0], lerp(WINDOW_AT[1] - 46, WINDOW_AT[1], t)];
          setWin();
        },
        { easing: ease.bloom, check },
      );
      const moonP = wait(600, check).then(() =>
        tween(
          2000,
          (t) => {
            moonG.setAttribute('opacity', Math.min(1, t * 1.7));
            moon.s = lerp(0.85, 1, t);
            setMoon();
          },
          { check },
        ),
      );
      await Promise.all([skyP, winP, moonP]);
    },
    // 摸一下：窗里的灯轻轻一亮，月牙一缩一弹，各荡开一圈光晕
    async pulse() {
      const wring = svg('path', { fill: 'none', stroke: '#e8c88a', 'stroke-width': 9, filter: 'url(#wash2)', opacity: 0 }, root);
      const mring = svg('path', { fill: 'none', stroke: '#e3cd8f', 'stroke-width': 8, filter: 'url(#wash2)', opacity: 0 }, root);
      await tween(
        900,
        (t) => {
          place(winScaler, WINDOW_AT, win.at, win.s * (1 - 0.07 * Math.sin(t * Math.PI)));
          place(moonScaler, MOON_AT, moon.at, moon.s * (1 - 0.06 * Math.sin(t * Math.PI)));
          const k = lerp(1.02, 1.5, t);
          wring.setAttribute('d', rrect({ x: win.at[0] - (WIN.w * k) / 2, y: win.at[1] - (WIN.h * k) / 2, w: WIN.w * k, h: WIN.h * k, r: WIN.r * k }));
          wring.setAttribute('opacity', 0.5 * (1 - t));
          mring.setAttribute('d', moonD({ cx: moon.at[0], cy: moon.at[1] }, lerp(1.15, 1.9, t)));
          mring.setAttribute('opacity', 0.5 * (1 - t));
        },
        { easing: ease.out },
      );
      wring.remove();
      mring.remove();
      setWin();
      setMoon();
    },
    // 组字：窗子、月牙各自挪到字位上（尺寸也凑成字形的大小）
    windowToGlyph: (check) => glide(win, setWin, JIONG_SPOT, 0.75, 1600, check),
    moonToGlyph: (check) => glide(moon, setMoon, YUE_SPOT, 1.72, 1600, check),
    // 字形刻好了，实物隐成淡淡的影子衬在字后
    fadePics(opacity, ms, check) {
      const f1 = Number(winG.getAttribute('opacity'));
      const f2 = Number(moonG.getAttribute('opacity'));
      return tween(
        ms,
        (t) => {
          winG.setAttribute('opacity', lerp(f1, opacity, t));
          moonG.setAttribute('opacity', lerp(f2, opacity, t));
        },
        { check },
      );
    },
    // 夜更深了：星星先退了
    starsOut: (check) => skyFade(Number(tint.getAttribute('opacity')), 0, 1400, check),
    nightFade: (v, ms, check) => skyFade(v, 0, ms, check),
    // 要看清笔画了，夜色退成薄薄一层
    soften: (check) => skyFade(0.13, 0, 2400, check),
    // 字写好了：夜色散尽，屋里亮了——月光照进来的暖光满开。
    // 描红前 reset 会把背景清掉，所以先看情况重建（与「月」的夜色 return 同款）
    warmGlow(check) {
      if (!scenery) buildScenery();
      const f = Number(tint.getAttribute('opacity'));
      const fm = Number(warm.getAttribute('opacity'));
      return tween(
        2400,
        (t) => {
          tint.setAttribute('opacity', lerp(f, 0, t));
          warm.setAttribute('opacity', lerp(fm, 1, t));
        },
        { check },
      );
    },
    // 收尾：窗子回到原位，灯更亮了；月亮淡淡挂回窗外
    async windowReturn(check) {
      const f = Number(winG.getAttribute('opacity'));
      const from = { at: [...win.at], s: win.s };
      await tween(
        1900,
        (t) => {
          win.at = [lerp(from.at[0], WINDOW_AT[0], t), lerp(from.at[1], WINDOW_AT[1], t)];
          win.s = lerp(from.s, 1.06, t);
          setWin();
          winG.setAttribute('opacity', lerp(f, 1, t));
          panes.setAttribute('opacity', (0.8 + 0.15 * t).toFixed(3));
        },
        { easing: ease.bloom, check },
      );
    },
    async moonReturn(check) {
      const f = Number(moonG.getAttribute('opacity'));
      const from = { at: [...moon.at], s: moon.s };
      await tween(
        2100,
        (t) => {
          moon.at = [lerp(from.at[0], MOON_AT[0], t), lerp(from.at[1], MOON_AT[1], t)];
          moon.s = lerp(from.s, 1, t);
          setMoon();
          moonG.setAttribute('opacity', lerp(f, 0.42, t));
        },
        { easing: ease.bloom, check },
      );
    },
    reset() {
      win.at = [...WINDOW_AT];
      win.s = 1;
      setWin();
      panes.setAttribute('opacity', 0.8);
      moon.at = [...MOON_AT];
      moon.s = 1;
      setMoon();
      winG.setAttribute('opacity', 0);
      moonG.setAttribute('opacity', 0);
      root.setAttribute('opacity', 0);
      sceneryLayer.replaceChildren();
      scenery = tint = stars = warm = null;
    },
  };
}
