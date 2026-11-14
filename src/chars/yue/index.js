// 「月」：夜空里的一弯月亮 → 甲骨文（竖长弯月加一短笔）→ 小篆（匀称弯月加两横）→ 楷书「月」。
// 太阳总是圆的，月亮却常常是弯的——所以古人把「月」画成一弯月牙，好和「日」分开。
// 接口说明见 src/chars/README.md。
import { wait } from '../../util.js';
import { createMoon, createNight } from './moon.js';
import { createMorph } from './morph.js';

export function createLesson({ layers, data }) {
  const moon = createMoon(layers.picture);
  const night = createNight(layers.scenery);
  const morph = createMorph(layers.morph, data);

  const picture = {
    root: moon.root,
    body: moon.body,
    // 月亮升起，夜色也一起落下来
    async appear(check) {
      await Promise.all([moon.appear(check), night.rise(check)]);
    },
    pulse: () => moon.pulse(),
  };

  return {
    picture,
    async toForm(name, check) {
      if (name === 'oracle') {
        // 先沿着月亮描出月牙，月牙再慢慢变成龟甲上的样子；天上的月亮同步隐去
        await Promise.all([
          morph.drawOracle(check),
          wait(3200, check).then(() => moon.fadeTo(0.12, 1800, check)),
        ]);
      } else {
        await morph.to(name, name === 'seal' ? 3000 : 2800, check);
        // 要看清笔画了，夜色退成薄薄一层
        if (name === 'kaishu') await night.soften(check);
      }
    },
    // 笔顺动画开始前把字形压淡（0.12）、结束后淡出（0）；夜色也跟着收
    fadeForms: (opacity, ms, check) =>
      Promise.all([morph.fadeTo(opacity, ms, check), night.fadeTo(opacity * 0.5, ms, check)]),
    // 字写好了：夜色轻轻回来，月亮在字的后面又亮起来
    async finale(check) {
      await Promise.all([moon.appear(check), night.return(check)]);
      await moon.fadeTo(0.38, 900, check);
    },
    reset() {
      moon.reset();
      night.reset();
      morph.reset();
    },
  };
}
