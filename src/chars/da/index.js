// 「大」：大西瓜旁张开手臂的小朋友 → 甲骨文（正面人形，先从「人」的侧立
// 转过来张开手臂——人形族的家族比较环节）→ 小篆（对称弧线）→ 楷书
// （横是手臂、撇连着头和身子、捺是迈开的腿）。
// 接口说明见 src/chars/README.md。
import { createMelon } from './melon.js';
import { createMorph } from './morph.js';

export function createLesson({ layers, data }) {
  const melon = createMelon(layers.picture, layers.scenery);
  const morph = createMorph(layers.morph, data);

  return {
    picture: melon,
    async toForm(name, check) {
      if (name === 'oracle') {
        // 画面淡去的同时，字形从小朋友的手臂几何起笔（重合处开始，没有切换感）：
        // 先收成侧立的「人」，再转过来张开手臂，成为甲骨文的「大」
        await Promise.all([
          morph.drawOracle(melon.form(), check),
          melon.fadeTo(0, 700, check),
        ]);
      } else {
        await morph.to(name, name === 'seal' ? 2800 : 2400, check);
      }
    },
    fadeForms: (opacity, ms, check) => morph.fadeTo(opacity, ms, check),
    // 字写好了：远处浮起大山，西瓜滚回来，小朋友在字旁张开手臂
    async finale(check) {
      await melon.finale(check);
    },
    reset() {
      melon.reset();
      morph.reset();
    },
  };
}
