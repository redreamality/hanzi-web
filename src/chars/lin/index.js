// 「林」：两棵水墨大树（一高一矮、姿态不同）→ 甲骨文（两木并立的刻痕）→ 小篆（两棵修长的弯枝树）
// → 楷书「林」（两个木并排站：横是树枝，竖是树干，撇和点/捺是树根）。
// 接口说明见 src/chars/README.md。
import { createTrees } from './trees.js';
import { createMorph } from './morph.js';

export function createLesson({ layers, data }) {
  const trees = createTrees(layers.picture, layers.scenery);
  const morph = createMorph(layers.morph, data);

  return {
    picture: trees,
    async toForm(name, check) {
      if (name === 'oracle') {
        // 先把左边一棵树的骨架刻出来，再刻右边一棵——先画一个木，再画一个木，就是林；
        // 真树再慢慢隐去，只留一层淡淡的树影衬着字
        await morph.drawOracle(check);
        await trees.fadeTo(0.12, 1600, check);
      } else {
        await morph.to(name, name === 'seal' ? 2800 : 2400, check);
      }
    },
    fadeForms: (opacity, ms, check) => morph.fadeTo(opacity, ms, check),
    // 字写好了：树影在字后面重新长出来，两棵大树中间再冒出几棵小树苗——木多了，就是林
    async finale(check) {
      await trees.appear(check, { fast: true });
      await trees.fadeTo(0.3, 900, check);
      await trees.sprout(check);
    },
    reset() {
      trees.reset();
      morph.reset();
    },
  };
}
