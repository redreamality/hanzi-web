// 「火」：夜晚篝火（火苗呼吸、火星飘）→ 甲骨文（主焰一笔贯通＋左右两颗火星，
// 刀刻颤动，火族绛红起笔）→ 小篆（中线贯底分叉两尾，左右浮线）→ 楷书。
// 接口说明见 src/chars/README.md。
import { createFire } from './fire.js';
import { createMorph } from './morph.js';

export function createLesson({ layers, data }) {
  const fire = createFire(layers.picture, layers.scenery);
  const morph = createMorph(layers.morph, data);

  return {
    picture: fire,
    async toForm(name, check) {
      if (name === 'oracle') {
        // 刻痕从火苗当前位置起笔（火「结晶」成甲骨文）；
        // 同时水彩火苗压淡成 0.12 的影子，夜幕退去，回到宣纸上看字形演变
        await Promise.all([
          morph.drawOracle(check),
          fire.fadeTo(0.12, 2600, check),
          fire.nightFade(0, 2200, check),
        ]);
      } else {
        await morph.to(name, name === 'seal' ? 2800 : 2400, check);
      }
    },
    fadeForms: (opacity, ms, check) => morph.fadeTo(opacity, ms, check),
    // 字写好了：篝火在字后面重新点起来（薄暮轻轻回来，字还看得清），火星再飘一阵
    async finale(check) {
      await fire.appear(check, { fast: true, night: 0.34 });
      await fire.fadeTo(0.3, 900, check);
      await fire.sparkle(check);
    },
    reset() {
      fire.reset();
      morph.reset();
    },
  };
}
