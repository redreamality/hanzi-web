// 「晴」：雨后天空，太阳从云缝里探出头 → 组字（日 + 青 相遇）→ 楷书「晴」。
// 《说文》未收「晴」，不演古文字：组字就是这一课的重头戏——
// 雨收云散、天放青色，刚学过的「日」和「青」在这里相遇：太阳挪到左边凝成日（朱砂起笔），
// 青天的颜色聚到右边凝成青（青黛起笔），一起沉成墨。「晴里也藏着青，和清是一家人。」
// 接口说明见 src/chars/README.md。
import { wait } from '../../util.js';
import { createSky } from './sky.js';
import { createMorph } from './morph.js';

export function createLesson({ layers, data }) {
  const sky = createSky(layers.picture, layers.scenery);
  const morph = createMorph(layers.morph, data);

  return {
    picture: {
      root: sky.root,
      body: sky.body,
      appear: (check) => sky.appear(check),
      pulse: () => sky.pulse(),
    },
    async toForm(name, check) {
      if (name === 'zuhe') {
        // 雨收云散，天放成青色
        await Promise.all([sky.cloudsOut(check), sky.skyClear(check)]);
        // 太阳挪到左位凝成「日」，朱砂一笔笔描出来
        await Promise.all([morph.drawRi(check), sky.sunToGlyph(check)]);
        // 青色从远山流过来，凝成「青」
        await Promise.all([morph.drawQing(check), sky.hillsGlow(check)]);
        // 颜色一起沉成墨，太阳隐成淡淡的影子
        await Promise.all([
          morph.settle(check),
          wait(700, check).then(() => sky.fadePics(0.1, 1500, check)),
        ]);
      } else {
        // 「日」收身变窄让给「青」，整字落定；要看清笔画了，天色退薄
        await Promise.all([morph.to('kaishu', 2600, check), sky.soften(check)]);
      }
    },
    // 笔顺动画开始前把字形压淡（0.12）、结束后淡出（0）；天色也跟着收
    fadeForms: (opacity, ms, check) =>
      Promise.all([morph.fadeTo(opacity, ms, check), sky.tintFade(opacity * 0.5, ms, check)]),
    // 字写好了：天大放晴——太阳回到高处，暖光满屏，远山升起一道淡淡的彩虹
    finale: (check) => sky.finale(check),
    reset() {
      sky.reset();
      morph.reset();
    },
  };
}
