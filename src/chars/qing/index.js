// 「青」：雨后远山 → 小篆（青黛色一笔笔写出，上像草芽下像圆盘）→ 楷书「青」。
// 青是蓝绿蓝绿的颜色——草木和远山的颜色，不硬讲从生从丹的字源，
// 只让孩子看见：字是从这片青色里长出来的。接口说明见 src/chars/README.md。
import { createHills } from './hills.js';
import { createMorph } from './morph.js';

export function createLesson({ layers, data }) {
  const hills = createHills(layers.picture, layers.scenery);
  const morph = createMorph(layers.morph, data);

  return {
    picture: hills,
    async toForm(name, check) {
      if (name === 'seal') {
        // 先用青黛色把小篆一笔笔写出来，远山再慢慢隐去，只留一层淡淡的山影衬着字
        await morph.drawSeal(check);
        await hills.fadeTo(0.12, 1600, check);
      } else {
        await morph.to(name, 2800, check);
      }
    },
    fadeForms: (opacity, ms, check) => morph.fadeTo(opacity, ms, check),
    // 字写好了：山影重新洇回来，雾荡开一圈，草木摇着又落下一滴雨珠
    async finale(check) {
      await hills.appear(check, { fast: true });
      await hills.fadeTo(0.3, 900, check);
      await hills.afterRain(check);
    },
    reset() {
      hills.reset();
      morph.reset();
    },
  };
}
