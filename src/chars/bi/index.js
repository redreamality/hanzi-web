// 「比」：两个水墨小朋友肩并肩比身高 → 甲骨文（两人并肩同向，刀刻）
// → 小篆（两人紧挨，四条匀称的长线）→ 楷书「比」（左边一人，右边一人）。
// 形态基准（openspec etymology.md「比」条，已核汉典拓片）：两人并肩同向，不躬身、不前后错开。
// 接口说明见 src/chars/README.md。
import { createPair } from './pair.js';
import { createMorph } from './morph.js';

export function createLesson({ layers }) {
  const pair = createPair(layers.picture, layers.scenery);
  const morph = createMorph(layers.morph);

  return {
    picture: pair,
    async toForm(name, check) {
      if (name === 'oracle') {
        // 字形从两个小朋友身上起笔（同一形状，看起来没有切换）：
        // 小朋友淡出的同时长出刀刻的颤动，变成赭石的甲骨文，再沉成墨
        const from = pair.form();
        await Promise.all([pair.fadeTo(0, 1600, check), morph.drawOracle(from, check)]);
      } else {
        await morph.to(name, name === 'seal' ? 2800 : 2400, check);
      }
    },
    fadeForms: (opacity, ms, check) => morph.fadeTo(opacity, ms, check),
    // 字写好了：两个小朋友在字的正下方重新落笔出现，肩并肩踮踮脚，再比一比
    async finale(check) {
      pair.setPlaced({ scale: 0.34, cx: 450, cy: 742 });
      await pair.appear(check, { fast: true });
      await pair.pulse();
    },
    reset() {
      pair.setPlaced();
      pair.reset();
      morph.reset();
    },
  };
}
