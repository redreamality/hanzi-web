// 水墨夜空里的一弯月亮：外弧是月亮的背，内弧是它的怀抱，两端收成尖角。
// 「盈」由内弧圆心的偏移 dx 控制：appear 时从一钩瘦月牙慢慢盈起来，像月亮从云后露脸。
import { svg, tween, ease, lerp } from '../../util.js';

export const CENTER = [507, 486];
const GEO = { R: 256, r: 208, dx: 96, rot: (-12 * Math.PI) / 180 };
const THIN = 50; // 起笔时的月牙：厚度只有 4 的细钩（dx 必须大于 R - r = 48 两圆才相交）

// 两段圆弧相交出月牙，返回背（外弧）和怀抱（内弧）的点列，都从上尖走到下尖
export function crescentEdges({ R = GEO.R, r = GEO.r, dx = GEO.dx, rot = GEO.rot } = {}) {
  const x0 = (dx * dx + R * R - r * r) / (2 * dx);
  const y0 = Math.sqrt(Math.max(1, R * R - x0 * x0));
  const arc = (rad, ox, from, to, n) =>
    Array.from({ length: n }, (_, i) => {
      const a = lerp(from, to, i / (n - 1));
      const px = ox + rad * Math.cos(a);
      const py = rad * Math.sin(a);
      return [
        CENTER[0] + px * Math.cos(rot) - py * Math.sin(rot),
        CENTER[1] + px * Math.sin(rot) + py * Math.cos(rot),
      ];
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

// 月牙轮廓 path（背去、怀抱回），k 是绕月心 的整体缩放
function moonD({ R = GEO.R, r = GEO.r, dx = GEO.dx, rot = GEO.rot } = {}, k = 1) {
  const { back, arm } = crescentEdges({ R: R * k, r: r * k, dx: dx * k, rot });
  return (
    [...back, ...[...arm].reverse()]
      .map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`)
      .join('') + 'Z'
  );
}

export function createMoon(layer) {
  const root = svg('g', { class: 'moon', opacity: 0 }, layer);
  const scaler = svg('g', {}, root);
  const body = svg('g', { class: 'moon-body breathing' }, scaler);

  const defs = svg('defs', {}, body);
  const grad = svg('radialGradient', { id: 'yue-moon-core', cx: '.42', cy: '.38', r: '.8' }, defs);
  svg('stop', { offset: '0', 'stop-color': '#f6e7b8' }, grad);
  svg('stop', { offset: '.6', 'stop-color': '#e8cd86' }, grad);
  svg('stop', { offset: '1', 'stop-color': '#cda150' }, grad);

  // 月晕、月牙、贴着背的一条高光、干后的边缘积色
  const halo = svg('path', { fill: '#e6cf8f', opacity: 0.22, filter: 'url(#glow)' }, body);
  const core = svg('path', { fill: 'url(#yue-moon-core)', opacity: 0.92, filter: 'url(#wash1)' }, body);
  const hi = svg('path', { fill: '#f8eec8', opacity: 0.34, filter: 'url(#wash2)' }, body);
  const rim = svg('path', { fill: 'none', stroke: '#b08c3a', 'stroke-width': 6, 'stroke-linejoin': 'round', opacity: 0.32, filter: 'url(#wash1)' }, body);

  let dx = THIN;
  const paint = () => {
    const d = moonD({ dx });
    core.setAttribute('d', d);
    rim.setAttribute('d', d);
    halo.setAttribute('d', moonD({ dx }, 1.34));
    // 高光只留贴着背的一条窄边，像月光落在月牙的背上
    hi.setAttribute('d', moonD({ dx, R: GEO.R - 6, r: GEO.R + 50 }));
  };
  paint();

  const setScale = (s) => scaler.setAttribute('transform', `translate(${CENTER[0]} ${CENTER[1]}) scale(${s}) translate(${-CENTER[0]} ${-CENTER[1]})`);

  return {
    root,
    body,
    // 一钩瘦月牙慢慢盈起来，月色跟着洇开
    async appear(check) {
      await tween(
        2800,
        (t) => {
          dx = lerp(THIN, GEO.dx, t);
          paint();
          setScale(lerp(0.92, 1, t));
          root.setAttribute('opacity', Math.min(1, t * 1.7));
        },
        { easing: ease.bloom, check },
      );
    },
    // 点一下：轻轻一缩一弹，荡开一圈月光
    async pulse() {
      const ring = svg('path', { fill: 'none', stroke: '#e2c377', 'stroke-width': 9, filter: 'url(#wash2)' }, root);
      await tween(
        900,
        (t) => {
          setScale(1 - 0.07 * Math.sin(t * Math.PI));
          ring.setAttribute('d', moonD({}, lerp(1.2, 1.95, t)));
          ring.setAttribute('opacity', 0.55 * (1 - t));
        },
        { easing: ease.out },
      );
      ring.remove();
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity'));
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },
    reset() {
      dx = GEO.dx;
      paint();
      setScale(1);
      root.setAttribute('opacity', 0);
    },
  };
}

// 夜色和星星，落在 backdrop 的 #scenery 里：宣纸化作温柔的夜空，远山在月色里隐着
export function createNight(layer) {
  // [x, y, 半径, 是否闪烁]，横竖屏都露得出的范围里撒开，月亮身后留空
  const STARS = [
    [556, 132, 3.8, 1], [642, 302, 2.8, 0], [702, 88, 3.2, 1], [762, 212, 5, 1],
    [832, 62, 3, 0], [884, 332, 3.4, 1], [942, 152, 4.2, 1], [1008, 78, 2.8, 0],
    [1042, 382, 3.2, 1], [1092, 190, 4.6, 1], [1132, 322, 2.8, 0], [598, 472, 3, 1],
    [1152, 92, 3.6, 1], [982, 502, 2.8, 0], [892, 552, 3.2, 1], [678, 592, 2.8, 0],
  ];
  let root = null;
  let tint = null;
  let starG = null;

  const build = () => {
    root = svg('g', { class: 'yue-night' }, layer);
    const defs = svg('defs', {}, root);
    const grad = svg('linearGradient', { id: 'yue-night-grad', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
    svg('stop', { offset: '0', 'stop-color': '#232940', 'stop-opacity': '0.88' }, grad);
    svg('stop', { offset: '.55', 'stop-color': '#2b3350', 'stop-opacity': '0.52' }, grad);
    svg('stop', { offset: '1', 'stop-color': '#333b52', 'stop-opacity': '0' }, grad);
    // 夜色和星星分开淡入：星星不跟着夜色一起变暗，不然就看不清了
    tint = svg('g', { opacity: 0 }, root);
    svg('rect', { x: 0, y: 0, width: 1600, height: 1000, fill: 'url(#yue-night-grad)' }, tint);
    starG = svg('g', { opacity: 0 }, root);
    // 两颗亮一点的星带一点微光
    svg('circle', { cx: 1092, cy: 190, r: 11, fill: '#f0e6c4', opacity: 0.3, filter: 'url(#glow)' }, starG);
    svg('circle', { cx: 762, cy: 212, r: 9.5, fill: '#f0e6c4', opacity: 0.24, filter: 'url(#glow)' }, starG);
    STARS.forEach(([x, y, r, tw], i) => {
      const star = svg('circle', { cx: x, cy: y, r, fill: '#f0e8ca' }, starG);
      if (tw) {
        star.setAttribute('class', 'yue-star');
        star.style.setProperty('--d', `${(2.4 + (i % 5) * 0.9).toFixed(1)}s`);
        star.style.setProperty('--o', `${((i % 7) * 0.45).toFixed(1)}s`);
      }
    });
  };

  // 夜色到 v，星星比夜色亮一档（封顶 1）
  const fadeTo = (to, ms, check) => {
    const from = Number(tint.getAttribute('opacity'));
    const fromStar = Number(starG.getAttribute('opacity'));
    return tween(
      ms,
      (t) => {
        tint.setAttribute('opacity', lerp(from, to, t));
        starG.setAttribute('opacity', lerp(fromStar, Math.min(1, to * 1.6), t));
      },
      { check },
    );
  };

  return {
    // 月亮升起，夜色落下来
    rise: (check) => (build(), fadeTo(0.66, 2800, check)),
    // 要看清笔画了，夜色退成薄薄一层
    soften: (check) => fadeTo(0.16, 2400, check),
    fadeTo: (v, ms, check) => (root ? fadeTo(v, ms, check) : Promise.resolve()),
    // 字写好了，夜色轻轻回来
    return: (check) => (root || build(), fadeTo(0.5, 2000, check)),
    reset() {
      layer.replaceChildren();
      root = null;
    },
  };
}
