// 「天」：草地上一个小朋友仰头看天，手臂张得开开的（就是「大」的姿势）
// → 组字（刚学的「大」用赭石一笔一笔写出来，一横带着天青色从高天落下、停在头顶）
// → 楷书（笔宽加粗、颜色纯墨）。
// 组字是这一课的重头戏：天，就是大头顶上加一横（说文「颠也……从一大」）。
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
      if (name === 'zu') {
        // 「大」先一笔一笔写出来（赭石），一横再从天上落下、停在头顶，颜色沉成墨；
        // 小朋友淡去——她张开的身体留在了「大」里；天色亮一层
        await Promise.all([
          (async () => {
            await morph.drawDa(check);
            await morph.dropBar(check);
            await morph.settle(check);
          })(),
          wait(500, check).then(() => sky.fadeTo(0, 1800, check)),
          wait(400, check).then(() => sky.brighten(0.5, 2000, check)),
        ]);
      } else {
        // 要看清笔画了：几何不动，笔宽加粗、颜色纯墨，天更亮
        await Promise.all([morph.to(name, 2400, check), sky.brighten(0.9, 2400, check)]);
      }
    },
    fadeForms: (opacity, ms, check) => morph.fadeTo(opacity, ms, check),
    // 字写好了：天大亮，小朋友又被写出来，继续仰头看天，一朵小白云从字顶飘过
    finale: (check) => sky.finale(check),
    reset() {
      sky.reset();
      morph.reset();
    },
  };
}
