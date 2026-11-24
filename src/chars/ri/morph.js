// 「日」从太阳到楷书的字形变形。
// 外框用超椭圆 |x/a|^n + |y/b|^n = 1 描述：n=2 是圆，n 越大越方；
// 中间是一条线段，半长为 0 时就是一个点。只要对参数插值，字形就能连续地变过去。
import { svg, tween, lerp } from '../../util.js';
import { CENTER } from './sun.js';

const N = 160;
const [cx, cy] = CENTER;

export const FORMS = {
  // 甲骨文：刀刻在龟甲上，圆圈略扁（拓片 5/5 环 W/H≥1.04），中间一短横（拓片 5/5 是横，中位 0.46 环宽）
  oracle: { a: 214, b: 195, n: 2.1, jitter: 0.06, half: 100, oy: 0, dy: 0, width: 24, inkR: 34, inkG: 29, inkB: 26 },
  // 小篆：线条匀称，竖长的圆角框，中间短短一横
  seal: { a: 160, b: 290, n: 4.2, jitter: 0, half: 70, oy: 6, dy: -10, width: 24, inkR: 34, inkG: 29, inkB: 26 },
  // 楷书：方框，中横贴着两边；尺寸对齐笔画数据里「日」的外框，接笔顺动画时不跳
  kaishu: { a: 205, b: 322, n: 16, jitter: 0, half: 200, oy: 13, dy: -38, width: 40, inkR: 34, inkG: 29, inkB: 26 },
};

// 刀刻的颤动：几个低频正弦叠加，首尾相接
function wobble(t) {
  return (Math.sin(3 * t + 0.7) * 0.6 + Math.sin(5 * t + 2.1) * 0.3 + Math.sin(7 * t + 4.0) * 0.25) / 1.15;
}

export function outlinePath(f) {
  const e = 2 / f.n;
  let d = '';
  for (let i = 0; i < N; i++) {
    const t = -Math.PI / 2 + (2 * Math.PI * i) / N;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const r = 1 + f.jitter * wobble(t);
    const x = cx + f.a * Math.sign(c) * Math.abs(c) ** e * r;
    const y = cy + f.oy + f.b * Math.sign(s) * Math.abs(s) ** e * r;
    d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return d + 'Z';
}

export function innerPath(f) {
  const y = cy + f.oy + f.dy;
  return `M${(cx - f.half).toFixed(1)} ${y.toFixed(1)}L${(cx + f.half).toFixed(1)} ${y.toFixed(1)}`;
}

function mix(f, g, t) {
  const out = {};
  for (const k in f) out[k] = lerp(f[k], g[k], t);
  return out;
}

export function createMorph(layer) {
  const root = svg('g', { class: 'morph', 'data-testid': 'morph' }, layer);
  const outer = svg('path', { fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round', pathLength: 1 }, root);
  const inner = svg('path', { fill: 'none', 'stroke-linecap': 'round', pathLength: 1 }, root);
  let form = FORMS.oracle;

  const render = (f) => {
    form = f;
    const color = `rgb(${f.inkR | 0},${f.inkG | 0},${f.inkB | 0})`;
    outer.setAttribute('d', outlinePath(f));
    inner.setAttribute('d', innerPath(f));
    for (const p of [outer, inner]) {
      p.setAttribute('stroke', color);
      p.setAttribute('stroke-width', f.width.toFixed(1));
    }
  };

  const setDraw = (p, t) => {
    p.setAttribute('stroke-dasharray', '1 1');
    p.setAttribute('stroke-dashoffset', String(1 - t));
  };

  return {
    root,
    // 先用朱砂色沿着太阳画一圈，再画上中间的一横，然后颜色慢慢沉成墨色
    async drawOracle(check) {
      root.setAttribute('opacity', 1);
      const red = { ...FORMS.oracle, inkR: 178, inkG: 52, inkB: 40 };
      render(red);
      setDraw(outer, 0);
      setDraw(inner, 0);
      await tween(2200, (t) => setDraw(outer, t), { check });
      await tween(500, (t) => setDraw(inner, t), { check });
      await tween(1200, (t) => render(mix(red, FORMS.oracle, t)), { check });
    },
    async to(name, ms, check) {
      const from = form;
      const to = FORMS[name];
      await tween(ms, (t) => render(mix(from, to, t)), { check });
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity') ?? 1);
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },
    reset() {
      root.setAttribute('opacity', 0);
      render(FORMS.oracle);
    },
  };
}
