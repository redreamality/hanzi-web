// 「日」：朱砂太阳 → 甲骨文（圈里一点）→ 小篆（竖长圆框加短横）→ 楷书方框。
// 接口说明见 src/chars/README.md。
import { createSun } from './sun.js';
import { createMorph } from './morph.js';

export function createLesson({ layers }) {
  const sun = createSun(layers.picture);
  const morph = createMorph(layers.morph);

  return {
    picture: sun,
    async toForm(name, check) {
      if (name === 'oracle') {
        await morph.drawOracle(check);
        await sun.fadeTo(0.1, 1600, check);
      } else {
        await morph.to(name, name === 'seal' ? 2800 : 2400, check);
      }
    },
    fadeForms: (opacity, ms, check) => morph.fadeTo(opacity, ms, check),
    // 字写好了，太阳在字后面重新洇开
    async finale(check) {
      await sun.appear(check);
      await sun.fadeTo(0.4, 900, check);
    },
    reset() {
      sun.reset();
      morph.reset();
    },
  };
}
