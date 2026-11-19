// 「清」：清亮见底的溪水 → 组字（远山的青 + 三颗小水滴落成三点水）→ 楷书「清」。
// 形声字：氵表意，青表音——台词点出「清里面藏着一个青，读音和青好像」。
// 接口说明见 src/chars/README.md。
import { wait } from '../../util.js';
import { createStream } from './stream.js';
import { createMorph } from './morph.js';

export function createLesson({ layers, data }) {
  const stream = createStream(layers.picture, layers.scenery);
  const morph = createMorph(layers.morph, data);

  return {
    picture: stream,

    async toForm(name, check) {
      if (name === 'zu') {
        // 远山的青先一笔笔写出来；小水滴再从溪里飞上来，挨着青落成三点水；
        // 水光一闪，溪水更清亮了，整条溪慢慢淡成一层水影，衬着刚组好的字
        await wait(500, check);
        const qingPart = morph.drawQingPart(check);
        await wait(1000, check);
        const land = async (i) => {
          const target = morph.markMid(i);
          await stream.flyDrop(i, target, check);
          await Promise.all([morph.drawShuiStroke(i, 260, check), stream.bloom(target)]);
        };
        const a = land(0);
        await wait(300, check);
        const b = land(1);
        await wait(300, check);
        // 第三滴不落点：贴着水面向上滑，滑出一道提；出发时在水里荡开一圈水纹
        const c = (async () => {
          const path = morph.streakPath();
          await stream.flyDrop(2, path[0], check, { ms: 520, rise: 70 });
          stream.ripple(path[0]);
          await Promise.all([morph.drawShuiStroke(2, 900, check), stream.streakDrop(path, check)]);
        })();
        await Promise.all([qingPart, a, b, c]);
        await stream.brighten(check);
        await stream.fadeTo(0.12, 1600, check);
      } else {
        // 定形：三点水滑正、拉长，水色和青黛一起沉成墨，就是今天写的清
        await morph.to('kaishu', 2600, check);
      }
    },

    // 笔顺动画开始前把字形压淡（0.12）、结束后淡出（0）；溪水也跟着收
    fadeForms: (opacity, ms, check) =>
      Promise.all([morph.fadeTo(opacity, ms, check), stream.fadeTo(opacity === 0 ? 0 : 0.08, ms, check)]),

    // 字写好了：清亮的溪水又流回来，水光扫过一遍，一颗小水滴落回溪里
    async finale(check) {
      await stream.appear(check, { fast: true });
      await stream.fadeTo(0.3, 900, check);
      await stream.brighten(check);
      await stream.rainBack(check);
    },

    reset() {
      stream.reset();
      morph.reset();
    },
  };
}

