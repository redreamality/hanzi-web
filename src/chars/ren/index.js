// 「人」：水墨小人 → 甲骨文（侧立人形，刀刻）→ 小篆（圆转匀称）→ 楷书（撇捺）。
// 小人和每个字形都是同样的两条笔画，变形一一对应，见 morph.js。
// 接口说明见 src/chars/README.md。
import { createPerson } from './person.js';
import { createMorph } from './morph.js';

export function createLesson({ layers }) {
  const person = createPerson(layers.picture);
  const morph = createMorph(layers.morph);

  return {
    picture: person,
    async toForm(name, check) {
      if (name === 'oracle') {
        // 字形从小人身上起笔（同一形状，看起来没有切换），小人淡出的同时长出刀刻的甲骨文
        const from = person.form();
        await Promise.all([person.fadeTo(0, 400, check), morph.drawOracle(from, check)]);
      } else {
        await morph.to(name, name === 'seal' ? 2800 : 2400, check);
      }
    },
    fadeForms: (opacity, ms, check) => morph.fadeTo(opacity, ms, check),
    // 字写好了：小人在字的旁边重新落笔出现，开心地向孩子点头
    async finale(check) {
      person.setPlaced({ scale: 0.52, cx: 250, cy: 730 });
      await person.appear(check);
      await person.pulse();
    },
    reset() {
      person.setPlaced();
      person.reset();
      morph.reset();
    },
  };
}
