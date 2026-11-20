// 「众」：放学的操场人群 → 一个人（人）→ 两个人（从）→ 第三个人叠到上面（众，品字）
// → 楷书（上人下从，同「森」上木下林的叠加母题）。
// 接口说明见 src/chars/README.md。
import { createCrowd } from './crowd.js';
import { createMorph } from './morph.js';

export function createLesson({ layers }) {
  const crowd = createCrowd(layers.picture);
  const morph = createMorph(layers.morph);

  return {
    picture: crowd,
    async toForm(name, check) {
      if (name === 'one') {
        // 人群散去，中央写出一个大大的「人」——字形和画面无缝接力
        await Promise.all([crowd.fadeTo(0, 1500, check), morph.drawOne(check)]);
      } else if (name === 'duo') {
        // 再来一个，两个人一左一右站好（「从」的两个人）
        await morph.addSecond(check);
      } else if (name === 'trio') {
        // 第三个长高站到最上面，三个人品字叠立
        await morph.addTop(check);
      } else {
        await morph.toKaishu(2600, check);
      }
    },
    fadeForms: (opacity, ms, check) => morph.fadeTo(opacity, ms, check),
    // 字写好了：人群淡淡地站回大字后面合影，再一起轻轻蹦一下
    async finale(check) {
      await crowd.finaleIn(check);
      await crowd.wave(check);
    },
    reset() {
      crowd.reset();
      morph.reset();
    },
  };
}
