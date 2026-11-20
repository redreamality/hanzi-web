// 「心」：孩子捧着胸口怦怦跳的暖心 → 甲骨文（心廓＋内点，刀刻）→ 小篆（圆转外廓＋内短竖）
// → 楷书「心」（卧钩＋三点，三点在变形末尾「怦怦」长出来——形态明喻）。
// 接口说明见 src/chars/README.md。
import { createChild } from './child.js';
import { createMorph } from './morph.js';

export function createLesson({ layers, data }) {
  const kid = createChild(layers.picture, layers.scenery);
  const morph = createMorph(layers.morph, data);

  return {
    picture: kid,
    async toForm(name, check) {
      if (name === 'oracle') {
        // 心跳把字「印」出来：胭色的心廓一刀刀刻出，孩子同时退干净——
        // 心在字形正后方，留影子会压住字的躯干
        await Promise.all([
          morph.drawOracle(check),
          kid.fadeOutForForms(check),
        ]);
      } else {
        await morph.to(name, name === 'seal' ? 2800 : 2400, check);
      }
    },
    fadeForms: (opacity, ms, check) => morph.fadeTo(opacity, ms, check),
    // 字写好了：孩子和心回到字后面淡淡的，心口再飘起几颗小心心
    async finale(check) {
      await kid.finale(check);
    },
    reset() {
      kid.reset();
      morph.reset();
    },
  };
}
