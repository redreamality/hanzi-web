// 「明」：夜窗与窗外月 → 甲骨文（囧、月并置）→ 小篆（囧左月右）→ 楷书「明」。
// 组字是这一课的重头戏：夜里的窗子和窗外的月亮在这里汇聚——
// 窗子挪到左边凝成方格窗「囧」（赭石起笔），月牙挪到右边凝成弯月（月光金起笔），屋里亮了，就是明。
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
        // 窗先来：窗子挪到字位，赭石色把囧的外框描出来
        await Promise.all([morph.drawWindow(check), sky.windowToGlyph(check)]);
        // 月跟上：月牙挪过来，月光金把弯月描出来
        await Promise.all([morph.drawMoon(check), sky.moonToGlyph(check)]);
        // 窗格和月牙里的小笔长出来、颜色沉成墨；实物隐成淡淡的影子；夜更深了，星星退了
        await Promise.all([
          morph.settle(check),
          wait(700, check).then(() => sky.fadePics(0.1, 1500, check)),
          wait(400, check).then(() => sky.starsOut(check)),
        ]);
      } else if (name === 'seal') {
        await Promise.all([morph.to('seal', 2800, check), sky.nightFade(0.34, 2400, check)]);
      } else {
        // 要看清笔画了，夜色退成薄薄一层
        await Promise.all([morph.to('kaishu', 2600, check), sky.soften(check)]);
      }
    },
    // 笔顺动画开始前把字形压淡（0.12）、结束后淡出（0）；夜色也跟着收
    fadeForms: (opacity, ms, check) =>
      Promise.all([morph.fadeTo(opacity, ms, check), sky.nightFade(opacity * 0.5, ms, check)]),
    // 字写好了：月光照进屋里，暖光满开，窗子亮回原位，月亮淡淡挂回窗外
    async finale(check) {
      await Promise.all([sky.warmGlow(check), sky.windowReturn(check), sky.moonReturn(check)]);
    },
    reset() {
      sky.reset();
      morph.reset();
    },
  };
}
