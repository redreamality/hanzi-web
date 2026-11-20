// 「心」从胸口的心到楷书的字形变形。
// 四条笔画：左点、卧钩、中点、右点——与楷书的四笔一一对应；
// 甲骨文/小篆只有心廓（→卧钩）和内点（→中点）两条，
// 左点和右点是楷书新长出的：古形阶段收成藏在外廓笔身里的小小退化形（看不见），
// 变到楷书时才「怦、怦」地弹出来——正是「三个小点像心怦怦地跳」的形态明喻（不作字源断言）。
// 楷书形态的中心线直接取自笔画数据，所以最后一步和笔顺动画严丝合缝。
// 字形依据：refs/xin/ 拓片（etymology.md「心」行）：甲骨文竖长心廓＋内点；小篆圆转外廓＋内短竖＋心尖微下延。
import { svg, tween, lerp, ease } from '../../util.js';
import { makeStroke, mixStroke, strokePath } from './ribbon.js';

const PARTS = ['dotL', 'hook', 'dotM', 'dotR'];

const INK = [34, 29, 26];
// 开场刻字用的胭脂色：心口的暖红，最后慢慢沉成墨
const ROSE = [194, 69, 92];
const colorOf = (rgb) => `rgb(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0})`;

// 甲骨文（依拓片 42_ECBF～ECCC）：竖长的心廓——顶部开口、两侧各一小撇（心蒂），
// 上段窄、下段鼓圆、底部收成心尖；廓内中央一点。
// 外廓是一条开放线：从左小撇尖起，沿左侧下来、绕过心尖、沿右侧上去，到右小撇尖收。
const ORACLE = {
  hook: {
    anchors: [
      [497, 252], [486, 296], [466, 344], [443, 436], [432, 544], [440, 646],
      [472, 732], [505, 782], [519, 800], [536, 776], [566, 728], [592, 644],
      [601, 540], [590, 434], [568, 342], [552, 296], [540, 252],
    ],
    w: [[0, 24], [0.15, 30], [0.5, 32], [0.85, 30], [1, 22]],
    jitter: 3.2,
  },
  dotM: { anchors: [[516, 492], [516, 548]], w: [[0, 28], [0.5, 34], [1, 30]], jitter: 1.6 },
  // 左右点在古形里不存在：收成藏在外廓笔身内的小短段（同色墨叠在笔身里，看不见）
  dotL: { anchors: [[452, 398], [449, 418]], w: [[0, 9], [1, 9]], jitter: 0 },
  dotR: { anchors: [[580, 396], [583, 416]], w: [[0, 9], [1, 9]], jitter: 0 },
};

// 小篆（依拓片 swxz/5FC3）：外廓更修长圆转，顶部两撇更舒展，
// 底部心尖微微下延一点小尾；廓内中央一短竖。
const SEAL = {
  hook: {
    anchors: [
      [508, 208], [488, 250], [465, 322], [447, 422], [437, 532], [442, 636],
      [470, 728], [506, 792], [520, 814], [530, 846], [543, 800], [570, 724],
      [594, 632], [600, 526], [588, 418], [566, 318], [546, 248], [527, 206],
    ],
    w: [[0, 24], [1, 28]],
    jitter: 0,
  },
  dotM: { anchors: [[517, 470], [517, 610]], w: [[0, 22], [1, 22]], jitter: 0 },
  dotL: { anchors: [[452, 406], [449, 424]], w: [[0, 9], [1, 9]], jitter: 0 },
  dotR: { anchors: [[585, 404], [587, 422]], w: [[0, 9], [1, 9]], jitter: 0 },
};

// 楷书各笔的宽度：沿中线看着笔画数据的轮廓定的（点顿下去的肥瘦）
const KAISHU_W = {
  dotL: [[0, 30], [0.6, 44], [1, 54]],
  hook: [[0, 28], [0.18, 50], [0.55, 66], [0.82, 58], [1, 28]],
  dotM: [[0, 40], [1, 32]],
  dotR: [[0, 36], [1, 34]],
};

function kaishuForm(data) {
  const m = (i) => data.medians[i].map(([x, y]) => [x, 900 - y]);
  return {
    hook: { anchors: m(1), w: KAISHU_W.hook },
    dotM: { anchors: m(2), w: KAISHU_W.dotM },
    dotL: { anchors: m(0), w: KAISHU_W.dotL },
    dotR: { anchors: m(3), w: KAISHU_W.dotR },
  };
}

export function createMorph(layer, data) {
  const strokesOf = (defs) => Object.fromEntries(PARTS.map((p) => [p, makeStroke(defs[p])]));
  const FORMS = {
    oracle: strokesOf(ORACLE),
    seal: strokesOf(SEAL),
    kaishu: strokesOf(kaishuForm(data)),
  };

  const root = svg('g', { class: 'morph', 'data-testid': 'morph', opacity: 0 }, layer);
  const paths = {};
  for (const p of PARTS) paths[p] = svg('path', { fill: colorOf(INK) }, root);

  let state = FORMS.oracle;
  const reveal = Object.fromEntries(PARTS.map((p) => [p, 1]));
  const render = () => {
    for (const p of PARTS) paths[p].setAttribute('d', strokePath(state[p], reveal[p]));
  };
  const setColor = (rgb) => {
    for (const p of PARTS) paths[p].setAttribute('fill', colorOf(rgb));
  };

  return {
    root,
    // 甲骨文开场：心廓用胭脂一刀刻出来——从左边的小撇起笔，沿左侧下来，
    // 绕过心尖，沿右侧收上去；中间的点「顿」地一下点出来；颜色再慢慢沉成墨。
    async drawOracle(check) {
      state = FORMS.oracle;
      reveal.hook = 0;
      reveal.dotM = 0;
      render();
      setColor(ROSE);
      root.setAttribute('opacity', 1);
      await tween(1700, (t) => { reveal.hook = t; render(); }, { check });
      await tween(480, (t) => { reveal.dotM = t; render(); }, { check, easing: ease.out });
      await tween(1050, (t) => setColor(ROSE.map((v, i) => lerp(v, INK[i], t))), { check });
    },
    // 对锚点、宽度、刀刻颤动一起插值，四条笔画同时连续地变形。
    // 变到楷书时，左点和右点藏在外廓笔身里的退化形先按兵不动，
    // 等外廓躺平成卧钩、内点走到中央以后，再「怦、怦」地弹出来（ease.bloom 的过冲）。
    async to(name, ms, check) {
      const from = state;
      const to = FORMS[name];
      const lateParts = name === 'kaishu' ? ['dotL', 'dotR'] : [];
      await tween(
        ms,
        (t) => {
          const next = {};
          for (const p of PARTS) {
            let k = t;
            if (lateParts.includes(p)) {
              // 50% 之后起，94% 长满；bloom 的过冲让点「跳」出来又稳住
              const local = Math.min(1, Math.max(0, (t - 0.5) / 0.44));
              k = local === 0 || local === 1 ? local : ease.bloom(local);
            }
            next[p] = mixStroke(from[p], to[p], k);
          }
          state = next;
          render();
        },
        { check },
      );
      state = to;
      render();
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity') ?? 1);
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },
    reset() {
      state = FORMS.oracle;
      for (const p of PARTS) reveal[p] = 1;
      setColor(INK);
      render();
      root.setAttribute('opacity', 0);
    },
  };
}
