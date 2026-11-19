// 「森」：三棵水墨大树（中间一棵高树、两边两棵大树）→ 甲骨文（三个木品字叠立）→ 小篆（三棵修长的弯枝树）
// → 楷书「森」（上木加下两木：横是树枝，竖是树干，撇和点/捺是树根）。
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
        // 先刻左边的木、再刻右边的木——两个木，是刚学的林；停一拍，
        // 再往林上添一个木——三个木，就是森。真树再慢慢隐去，只留一层淡淡的树影衬着字
        await morph.drawOracle(check);
        await forest.fadeTo(0.12, 1600, check);
      } else {
        await morph.to(name, name === 'seal' ? 2800 : 2400, check);
      }
    },
    fadeForms: (opacity, ms, check) => morph.fadeTo(opacity, ms, check),
    // 字写好了：树影在字后面重新长出来，大树之间再冒出一棵棵小树苗——木越添越多，长成森林
    async finale(check) {
      await forest.appear(check, { fast: true });
      await forest.fadeTo(0.3, 900, check);
      await forest.sprout(check);
    },
    reset() {
      forest.reset();
      morph.reset();
    },
  };
}
