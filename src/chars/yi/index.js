// 「一」：跨小溪的独木桥 → 桥拓成墨线、躺平浮起 → 楷书一横。
// 接口说明见 src/chars/README.md。
import { createScene } from './scene.js';
import { createMorph } from './morph.js';

export function createLesson({ layers, data }) {
  const scene = createScene(layers.picture, layers.scenery);
  const morph = createMorph(layers.morph, data);

  return {
    picture: scene,
    // 「一」只有楷书一步：小鸭过桥，桥被踩得轻轻一颤，
    // 赭线把桥拓进纸里（木桥同时退场），溪与鸭压淡避开字的躯干，
    // 墨线躺平、浮起，变成楷书的一横。
    async toForm(name, check) {
      await scene.crossBridge(check);
      await scene.quiver(check);
      await Promise.all([morph.printFromBridge(check), scene.fadeBridge(0, 900, check)]);
      await Promise.all([scene.fadeScene(0.12, 1300, check), morph.toKaishu(2200, check)]);
    },
    fadeForms: (opacity, ms, check) => morph.fadeTo(opacity, ms, check),
    // 写好啦：小溪回来，鸭群从这一横下面游过去——它又架在了小溪上
    async finale(check) {
      await scene.returnHome(check);
    },
    reset() {
      scene.reset();
      morph.reset();
    },
  };
}
