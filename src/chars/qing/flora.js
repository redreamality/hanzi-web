// 前景草木与雨珠：右下一大簇青草叶、左下一小簇，雨后叶尖滚落的雨珠和水面涟漪。
import { svg, tween, wait, lerp, ease } from '../../util.js';

// 一片细长的草叶：根在原点，向上生长，带一点天然的弧
function bladePath(len, w, curve) {
  const tipX = curve * len * 0.28;
  return `M0 0
    C ${w} ${-len * 0.3} ${w * 0.9 + curve * len * 0.2} ${-len * 0.72} ${tipX} ${-len}
    C ${-w * 0.7 + curve * len * 0.16} ${-len * 0.7} ${-w * 0.5} ${-len * 0.28} 0 0 Z`;
}

const LEAF_INKS = [
  { fill: '#5d8a67', op: 0.66 },
  { fill: '#487457', op: 0.72 },
  { fill: '#3c6449', op: 0.6 },
];

// 一簇草叶：几片不同角度、长短、弧度的叶，从同一点呈扇形展开
function cluster(parent, [cx, cy], spec, { flip = 1 } = {}) {
  const g = svg('g', { transform: `translate(${cx} ${cy})`, opacity: 0 }, parent);
  const blades = spec.map(([deg, len, w, curve], i) => {
    const b = svg('g', {}, g);
    const ink = LEAF_INKS[i % LEAF_INKS.length];
    svg('path', { d: bladePath(len, w, curve), fill: ink.fill, opacity: ink.op, filter: 'url(#wash1)' }, b);
    b.setAttribute('transform', `rotate(${deg * flip}) scale(${flip} 1)`);
    return { b, deg };
  });
  return {
    g,
    // 绽出：叶子一片片从根部抽出来
    async bloom(check, { fast = false } = {}) {
      const f = fast ? 0.4 : 1;
      g.setAttribute('opacity', 1);
      await Promise.all(
        blades.map(({ b }, i) =>
          wait(i * 110 * f, check).then(() =>
            tween(560 * f, (t) => {
              const tr = b.getAttribute('transform').replace(/scale\(-?[\d.]+ -?[\d.]+\)/, `scale(${flip * t} ${t})`);
              b.setAttribute('transform', tr);
            }, { easing: ease.bloom, check }),
          ),
        ),
      );
    },
    // 风过：整簇轻轻摇一下
    async sway() {
      await tween(1000, (t) => {
        const swing = Math.sin(t * Math.PI * 2.2) * (1 - t) * 3.2;
        g.setAttribute('transform', `translate(${cx} ${cy}) rotate(${swing})`);
      }, { easing: ease.out });
      g.setAttribute('transform', `translate(${cx} ${cy})`);
    },
    fold() {
      g.setAttribute('opacity', 0);
      for (const { b } of blades) {
        b.setAttribute('transform', b.getAttribute('transform').replace(/scale\(([\d.-]+) ([\d.]+)\)/, 'scale(0 0)'));
      }
    },
  };
}

// 右下角的大簇：向左上方展开
const BIG = [[-64, 190, 15, 0.5], [-38, 225, 17, -0.3], [-12, 205, 15, 0.2], [14, 172, 13, -0.5], [40, 148, 12, 0.4]];
// 左下角的小簇：向右上方展开
const SMALL = [[52, 148, 12, -0.4], [24, 122, 11, 0.3], [-4, 160, 13, -0.2]];

export function createFlora(pictureLayer) {
  const layer = svg('g', {}, pictureLayer);
  const right = cluster(layer, [942, 1014], BIG);
  const left = cluster(layer, [86, 1018], SMALL, { flip: -1 });
  right.fold();
  left.fold();

  // 雨珠：挂在右边大簇的叶尖上
  let drop = null;
  let falling = false;
  const hangDrop = () => {
    drop?.remove();
    drop = svg('g', { transform: 'translate(838 858)', opacity: 0 }, layer);
    svg('ellipse', { cx: 0, cy: 0, rx: 6.5, ry: 9.5, fill: '#d8e9de', opacity: 0.9 }, drop);
    svg('circle', { cx: -2, cy: -3, r: 2.2, fill: '#f4faf5', opacity: 0.9 }, drop);
  };

  return {
    async bloom(check, { fast = false } = {}) {
      await Promise.all([
        right.bloom(check, { fast }),
        wait(240 * (fast ? 0.4 : 1), check).then(() => left.bloom(check, { fast })),
      ]);
    },
    // 一滴雨珠从叶尖加速落下，落进水面，荡开一圈小小的涟漪
    async rainDrop(check) {
      if (falling) return;
      falling = true;
      hangDrop();
      drop.setAttribute('opacity', 1);
      await tween(300, (t) => drop.setAttribute('transform', `translate(838 ${lerp(858, 872, t)})`), { check });
      await tween(
        520,
        (t) => drop.setAttribute('transform', `translate(${lerp(838, 818, t)} ${lerp(872, 952, t * t)})`),
        { check },
      );
      drop.remove();
      drop = null;
      const ring = svg('ellipse', { cx: 818, cy: 954, rx: 7, ry: 2.5, fill: 'none', stroke: '#e8f2ea', 'stroke-width': 3, opacity: 0.75, filter: 'url(#wash2)' }, layer);
      await tween(760, (t) => {
        ring.setAttribute('rx', lerp(7, 44, t));
        ring.setAttribute('ry', lerp(2.5, 11, t));
        ring.setAttribute('opacity', String(0.75 * (1 - t)));
      }, { easing: ease.out, check });
      ring.remove();
      falling = false;
    },
    sway: () => Promise.all([right.sway(), left.sway()]),
    reset() {
      right.fold();
      left.fold();
      drop?.remove();
      drop = null;
      falling = false;
      layer.replaceChildren();
      layer.appendChild(right.g);
      layer.appendChild(left.g);
    },
  };
}
