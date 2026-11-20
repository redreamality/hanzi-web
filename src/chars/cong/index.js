// 「从」：大人牵着孩子一前一后朝左走 → 甲骨文（两人同向相随，赭石刀刻）
// → 小篆（两个窄长的拱，一前一后）→ 楷书「从」（左边一个人，右边一个人）。
// 接口说明见 src/chars/README.md。
import { createFollow } from './follow.js';
import { createMorph } from './morph.js';

export function createLesson({ layers }) {
  const follow = createFollow(layers.picture);
  const morph = createMorph(layers.morph);

  return {
    picture: follow,
    async toForm(name, check) {
      if (name === 'oracle') {
        // 字形从两个人身上起笔（同一形状，看起来没有切换），
        // 画面淡出的同时，赭石的甲骨文一刀一刀刻出来
        const from = follow.form();
        await Promise.all([follow.fadeTo(0, 400, check), morph.drawOracle(from, check)]);
      } else {
        await morph.to(name, name === 'seal' ? 2800 : 2400, check);
      }
    },
    fadeForms: (opacity, ms, check) => morph.fadeTo(opacity, ms, check),
    // 字写好了：两个人牵着手走到字的右下角，还是一前一后跟着走
    async finale(check) {
      follow.setPlaced({ scale: 0.42, cx: 690, cy: 855 });
      await follow.appear(check);
      await follow.pulse();
    },
    reset() {
      follow.reset();
      morph.reset();
    },
  };
}
