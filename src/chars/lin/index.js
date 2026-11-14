// 「林」：两棵水墨树挨在一起的小树林 → 甲骨文（两棵刀刻的树）→ 小篆（两棵对称弧线的树）
// → 楷书「林」（左边一棵木，右边一棵木，两棵木靠在一起）。
// 接口说明见 src/chars/README.md。
import { createForest } from './forest.js';
import { createMorph } from './morph.js';

export function createLesson({ layers, data }) {
  const forest = createForest(layers.picture, layers.scenery);
  const morph = createMorph(layers.morph, data);

  return {
    picture: forest,
    async toForm(name, check) {
      if (name === 'oracle') {
        // 两棵树的骨架先一笔笔刻出来，真树林再慢慢隐去，只留一层淡淡的树影衬着字
        await morph.drawOracle(check);
        await forest.fadeTo(0.12, 1600, check);
      } else {
        await morph.to(name, name === 'seal' ? 2800 : 2400, check);
      }
    },
    fadeForms: (opacity, ms, check) => morph.fadeTo(opacity, ms, check),
    // 字写好了：树影在字后面重新长出来，两棵树的枝头再冒出几片嫩绿的新叶
    async finale(check) {
      await forest.appear(check, { fast: true });
      await forest.fadeTo(0.32, 900, check);
      await forest.sprout(check);
    },
    reset() {
      forest.reset();
      morph.reset();
    },
  };
}
