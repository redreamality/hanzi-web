// 「休」：一棵水墨大树，小人走累了走进来坐下歇脚 → 甲骨文（人侧立于木旁，刀刻）
// → 小篆（人旁圆转、树枝树根弯成弧线）→ 楷书「休」（左边是人，右边是木）。
// 接口说明见 src/chars/README.md。
import { createRest } from './rest.js';
import { createMorph } from './morph.js';

export function createLesson({ layers, data }) {
  const rest = createRest(layers.picture, layers.scenery);
  const morph = createMorph(layers.morph, data);

  return {
    picture: rest,
    async toForm(name, check) {
      if (name === 'oracle') {
        // 画面淡成一层影子的同时，甲骨文的骨架用赭石一刀一刀刻出来
        await Promise.all([
          morph.drawOracle(check),
          rest.fadeTo(0.1, 1600, check),
        ]);
      } else {
        await morph.to(name, name === 'seal' ? 2800 : 2400, check);
      }
    },
    fadeForms: (opacity, ms, check) => morph.fadeTo(opacity, ms, check),
    // 字写好了：树影重新长出来，小人还坐在树下歇脚，枝头冒出几片新叶
    async finale(check) {
      await rest.finale(check);
    },
    reset() {
      rest.reset();
      morph.reset();
    },
  };
}
