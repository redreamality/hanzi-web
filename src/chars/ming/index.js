// 「明」：晨昏天际，日月同空 → 甲骨文（日、月并置）→ 小篆（日左月右）→ 楷书「明」。
// 组字是这一课的重头戏：刚学过的「日」和「月」在这里汇聚——
// 太阳挪到左边凝成圆圈（朱砂起笔），月牙挪到右边凝成弯月（月光金起笔），天色转亮成明。
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
      if (name === 'oracle') {
        // 日先来：太阳挪到字位，朱砂色把圈描出来
        await Promise.all([morph.drawSun(check), sky.sunToGlyph(check)]);
        // 月跟上：月牙挪过来，月光金把弯月描出来
        await Promise.all([morph.drawMoon(check), sky.moonToGlyph(check)]);
        // 中间的小笔长出来、颜色沉成墨；实物隐成淡淡的影子；天更亮了，星星退了
        await Promise.all([
          morph.settle(check),
          wait(700, check).then(() => sky.fadePics(0.1, 1500, check)),
          wait(400, check).then(() => sky.starsOut(check)),
        ]);
      } else if (name === 'seal') {
        await Promise.all([morph.to('seal', 2800, check), sky.dawnFade(0.34, 2400, check)]);
      } else {
        // 要看清笔画了，晨色退成薄薄一层
        await Promise.all([morph.to('kaishu', 2600, check), sky.soften(check)]);
      }
    },
    // 笔顺动画开始前把字形压淡（0.12）、结束后淡出（0）；晨色也跟着收
    fadeForms: (opacity, ms, check) =>
      Promise.all([morph.fadeTo(opacity, ms, check), sky.dawnFade(opacity * 0.5, ms, check)]),
    // 字写好了：天色大亮，太阳回到东边，月亮淡淡挂回西边——就像刚写好的「明」
    async finale(check) {
      await Promise.all([sky.morningGlow(check), sky.sunReturn(check), sky.moonReturn(check)]);
    },
    reset() {
      sky.reset();
      morph.reset();
    },
  };
}
