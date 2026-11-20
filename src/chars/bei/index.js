// 「北」：两个背对背赌气的小朋友 → 甲骨文（两人镜像相背，刀刻）
// → 小篆（头横＋双竖的两个人）→ 楷书「北」（左一人右一人，背对背）。
// 形态基准（openspec etymology.md「北」条，已核汉典拓片）：两人镜像相背，
// 左人朝左右人朝右，不并肩、不前后。
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
    // 字写好了：两个小朋友在字的正下方重新落笔出现，还是背对背，气鼓鼓地再蹦一下
    async finale(check) {
      pair.setPlaced({ scale: 0.22, cx: 430, cy: 928 });
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
