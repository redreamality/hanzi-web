// 水彩太阳：几层带不同噪声的朱红圆片叠在一起，边缘积色，外面一圈暖光。
import { svg, tween, ease, lerp } from '../../util.js';

export const CENTER = [507, 505];
const R = 230;

export function createSun(layer) {
  const [cx, cy] = CENTER;
  const root = svg('g', { class: 'sun', opacity: 0 }, layer);
  const scaler = svg('g', {}, root);
  const body = svg('g', { class: 'sun-body breathing', 'data-testid': 'sun' }, scaler);

  svg('circle', { cx, cy, r: R * 1.45, fill: '#f3a066', opacity: 0.28, filter: 'url(#glow)' }, body);
  svg('circle', { cx, cy, r: R * 1.04, fill: '#e8693c', opacity: 0.35, filter: 'url(#wash2)' }, body);
  svg('circle', { cx, cy, r: R, fill: 'url(#sun-core)', opacity: 0.72, filter: 'url(#wash1)' }, body);
  svg('circle', { cx: cx - 18, cy: cy - 22, r: R * 0.72, fill: '#f6a55e', opacity: 0.35, filter: 'url(#wash2)' }, body);
  // 水彩干了以后，颜料会在边缘积得更深
  svg('circle', { cx, cy, r: R * 0.98, fill: 'none', stroke: '#b8352a', 'stroke-width': 7, opacity: 0.35, filter: 'url(#wash1)' }, body);

  const setScale = (s) => scaler.setAttribute('transform', `translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`);

  return {
    root,
    body,
    // 像一滴朱砂落在湿宣纸上，慢慢洇开
    async appear(check) {
      await tween(
        2600,
        (t) => {
          setScale(lerp(0.15, 1, t));
          root.setAttribute('opacity', Math.min(1, t * 1.6));
        },
        { easing: ease.bloom, check },
      );
    },
    // 点一下：轻轻一缩一弹，再荡开一圈光晕
    async pulse() {
      const ring = svg('circle', { cx, cy, r: R, fill: 'none', stroke: '#e8693c', 'stroke-width': 10, filter: 'url(#wash2)' }, root);
      await tween(
        900,
        (t) => {
          setScale(1 - 0.08 * Math.sin(t * Math.PI));
          ring.setAttribute('r', lerp(R, R * 1.7, t));
          ring.setAttribute('opacity', 0.6 * (1 - t));
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
      setScale(1);
      root.setAttribute('opacity', 0);
    },
  };
}
