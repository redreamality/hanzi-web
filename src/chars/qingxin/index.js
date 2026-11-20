// 「情」：小朋友捧着自己的一颗心 → 组字（心飘到青的旁边，站成竖心旁）→ 楷书「情」。
// 形声字：心表意，青表音（《说文》：「人之阴气有欲者。从心青声」）——
// 刚学过的「心」在这里站到字的左边（变成竖心旁），和已学的「青」合起来；
// 台词点出「情里也藏着青，和清、晴是一家人」（声旁家族）。
// 沿用清/晴的先例不画古文字：组字就是这一课的重头戏。接口说明见 src/chars/README.md。
import { wait } from '../../util.js';
import { createKid } from './kid.js';
import { createMorph } from './morph.js';

export function createLesson({ layers, data }) {
  const kid = createKid(layers.picture, layers.scenery);
  const morph = createMorph(layers.morph, data);

  return {
    picture: {
      root: kid.root,
      body: kid.body,
      appear: (check) => kid.appear(check),
      pulse: () => kid.pulse(),
    },

    async toForm(name, check) {
      if (name === 'zu') {
        // 远山的青黛先把右边的青一笔一笔写出来；
        // 双臂张开、心脱手，小朋友慢慢隐去，心沿着弧线飞到青的旁边；
        // 胭脂红写下竖心旁的点、点、竖——心跟着一下一下地跳，最后收身站直，化进字里
        await wait(500, check);
        const qingPart = morph.drawQingPart(check);
        await kid.handsOpen(check);
        const gone = kid.fadeAway(check);
        await kid.flyHeart(morph.heartSpot(), check);
        await Promise.all([
          (async () => {
            await morph.drawXinStroke(0, 260, check);
            await kid.heartThump(-1, check);
            await morph.drawXinStroke(1, 260, check);
            await kid.heartThump(1, check);
            await Promise.all([
              morph.drawXinStroke(2, 900, check),
              kid.heartSqueeze(morph.markMid(2), check),
            ]);
          })(),
          gone,
          qingPart,
        ]);
        // 胭脂红和青黛一起沉成墨：心加青，写好了
        await morph.settle(check);
      } else {
        // 定形：竖心旁收拢滑正（心站定了），整字落成今天写的情
        await morph.to('kaishu', 2600, check);
      }
    },

    // 笔顺动画开始前把字形压淡（0.12）、结束后淡出（0）；纸面也收干净
    fadeForms: (opacity, ms, check) =>
      Promise.all([morph.fadeTo(opacity, ms, check), kid.fadeTo(opacity === 0 ? 0 : 0.06, ms, check)]),

    // 字写好了：小朋友回来，心轻轻落回手心，又怦怦地跳、冒出小心心
    finale: (check) => kid.finale(check),

    reset() {
      kid.reset();
      morph.reset();
    },
  };
}
