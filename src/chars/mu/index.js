// 「木」：一棵水墨大树 → 甲骨文（枝上分叉、根下分叉的直线骨架）→ 小篆（对称弧线的树）
// → 楷书「木」（横是树枝，竖是树干，撇捺是树根）。
// 接口说明见 src/chars/README.md。
import { createTree } from './tree.js';
import { createMorph } from './morph.js';

export function createLesson({ layers, data }) {
  const tree = createTree(layers.picture, layers.scenery);
  const morph = createMorph(layers.morph, data);

  return {
    picture: tree,
    async toForm(name, check) {
      if (name === 'oracle') {
        // 骨架先一笔笔刻出来，真树再慢慢隐去，只留一层淡淡的树影衬着字
        await morph.drawOracle(check);
        await tree.fadeTo(0.12, 1600, check);
      } else {
        await morph.to(name, name === 'seal' ? 2800 : 2400, check);
      }
    },
    fadeForms: (opacity, ms, check) => morph.fadeTo(opacity, ms, check),
    // 字写好了：树影在字后面重新长出来，枝头冒出几片新叶
    async finale(check) {
      await tree.appear(check, { fast: true });
      await tree.fadeTo(0.32, 900, check);
      await tree.sprout(check);
    },
    reset() {
      tree.reset();
      morph.reset();
    },
  };
}
