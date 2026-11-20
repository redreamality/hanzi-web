// 「火」从火苗到楷书的字形变形。
// 四条笔画（左火星、右火星、主焰、右焰臂）在每个字形下都存在，只是锚点和宽度不同；
// 变形 = 等弧长重采样后逐点插值，火苗就连续地变成了字，不是两张图切换。
// 楷书的中心线直接取自笔画数据的中线，所以最后一步和笔顺动画严丝合缝。
import { svg, tween, lerp } from '../../util.js';
import { makeStroke, mixStroke, strokePath } from './ribbon.js';
import { PARTS, FLAME, ORACLE, SEAL, KAISHU, INK, CRIMSON, FLAME_RED } from './forms.js';

const colorOf = (rgb) => `rgb(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0})`;

export function createMorph(layer) {
  const strokesOf = (defs) => Object.fromEntries(PARTS.map((p) => [p, makeStroke(defs[p])]));
  const FORMS = { flame: strokesOf(FLAME), oracle: strokesOf(ORACLE), seal: strokesOf(SEAL), kaishu: strokesOf(KAISHU) };

  const root = svg('g', { class: 'morph', 'data-testid': 'morph', opacity: 0 }, layer);
  const paths = {};
  for (const p of PARTS) paths[p] = svg('path', { fill: colorOf(INK), 'data-part': p }, root);

  let state = FORMS.flame;
  const render = () => {
    for (const p of PARTS) paths[p].setAttribute('d', strokePath(state[p]));
  };
  const setColor = (rgb) => {
    for (const p of PARTS) paths[p].setAttribute('fill', colorOf(rgb));
  };

  return {
    root,
    // 从画面里火苗当前的样子（和火苗重合）起笔，带着焰色长出刀刻的颤动，变成甲骨文；
    // 颜色从焰橙转入火族绛红，再慢慢沉成墨。
    async drawOracle(check) {
      state = FORMS.flame;
      render();
      root.setAttribute('opacity', 1);
      const to = FORMS.oracle;
      await tween(2200, (t) => {
        state = Object.fromEntries(PARTS.map((p) => [p, mixStroke(FORMS.flame[p], to[p], t)]));
        render();
        setColor(FLAME_RED.map((v, i) => lerp(v, CRIMSON[i], t)));
      }, { check });
      state = to;
      setColor(CRIMSON);
      await tween(1000, (t) => setColor(CRIMSON.map((v, i) => lerp(v, INK[i], t))), { check });
      setColor(INK);
    },
    // 对锚点、宽度、刀刻颤动一起插值，四条笔画同时连续地变形
    async to(name, ms, check) {
      const from = state;
      const to = FORMS[name];
      await tween(
        ms,
        (t) => {
          state = Object.fromEntries(PARTS.map((p) => [p, mixStroke(from[p], to[p], t)]));
          render();
        },
        { check },
      );
      state = to;
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity') ?? 1);
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },
    reset() {
      state = FORMS.flame;
      setColor(INK);
      render();
      root.setAttribute('opacity', 0);
    },
  };
}
