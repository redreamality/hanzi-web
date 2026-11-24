// 「明」从夜窗到楷书的组字与字形变形。
// 整个字拆成两条部件骨架：囧（左）四笔、月（右）四笔，与楷书的八画一一对应——
// 甲骨文从囧从月（拓片 4/4，从日 0 例）：左边一扇方格小窗，右边一弯月牙。
// 组字是这一课的重头戏，所以起笔先用窗子的暖光描出囧框（赭石起笔）、
// 「月」一课的月光金描月牙，再一起沉成墨。小篆囧左月右、月内一竖笔（拓片 EEF7 系）。
// 楷书的骨架直接取笔画数据的中线，最后一步和真正的笔顺严丝合缝。
import { svg, tween, lerp } from '../../util.js';

const N = 40; // 每条骨架都重采样到同样多的点，插值时一一对应
const INK = { jiong: { r: 34, g: 29, b: 26 }, yue: { r: 34, g: 29, b: 26 } };
// 组字起笔的颜料：囧（窗）用赭石（窗棂木色＋灯下暖光），月用月光金（与「月」一课同色）
const PIGMENT = { jiong: { r: 168, g: 94, b: 50 }, yue: { r: 204, g: 172, b: 100 } };

const KEYS = ['jiongLeft', 'jiongRight', 'jiongMid', 'jiongBot', 'yueBack', 'yueArm', 'yueIn1', 'yueIn2'];
const COMP = Object.fromEntries(KEYS.map((k) => [k, k.startsWith('jiong') ? 'jiong' : 'yue']));

// ---- 采样工具（与 yue/morph.js 同款；共享文件不能动，这里各留一份） ----
function pathLen(pts) {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return s;
}
function resample(pts, n) {
  const total = pathLen(pts);
  if (pts.length < 2 || total === 0) return Array.from({ length: n }, () => [...pts[0]]);
  const out = [];
  let seg = 0;
  let acc = 0;
  for (let k = 0; k < n; k++) {
    const target = (total * k) / (n - 1);
    while (seg < pts.length - 2) {
      const l = Math.hypot(pts[seg + 1][0] - pts[seg][0], pts[seg + 1][1] - pts[seg][1]);
      if (acc + l >= target) break;
      acc += l;
      seg++;
    }
    const [a, b] = [pts[seg], pts[seg + 1]];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const t = Math.min(1, Math.max(0, (target - acc) / l));
    out.push([lerp(a[0], b[0], t), lerp(a[1], b[1], t)]);
  }
  return out;
}
// 刀刻的颤动：低频正弦叠加
const wobble = (u) => (Math.sin(3 * u * Math.PI + 0.7) * 0.6 + Math.sin(5 * u * Math.PI + 2.1) * 0.3) / 0.9;
// 沿法线把点列抖出刀刻的痕迹；首尾两点不动——两半弧要在端点接拢，圈才闭得上
function carve(pts, jitter) {
  if (!jitter) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1];
    const b = pts[i + 1];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const off = jitter * 22 * wobble(i / (pts.length - 1));
    out.push([pts[i][0] - ((b[1] - a[1]) / l) * off, pts[i][1] + ((b[0] - a[0]) / l) * off]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}
const dOf = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join('');

// 超椭圆弧采样：|x/a|^n + |y/b|^n = 1，n=2 是椭圆，n 越大越方（与 ri/morph.js 同一家族）
function ringPts({ cx, cy, a, b, n, from, to, steps = 22 }) {
  const e = 2 / n;
  return Array.from({ length: steps }, (_, i) => {
    const t = ((from + ((to - from) * i) / (steps - 1)) * Math.PI) / 180;
    const c = Math.cos(t);
    const s = Math.sin(t);
    return [cx + a * Math.sign(c) * Math.abs(c) ** e, cy + b * Math.sign(s) * Math.abs(s) ** e];
  });
}

// 囧、月两个部件的字位（屏幕坐标，y 朝下）：各与楷书部件的外框中心对齐
const JIONG_C = { cx: 271, cy: 406 };
const YUE_C = [640, 484];

// 甲骨文：囧是方格窗——外框两半弧合成一圈（超椭圆 n>2 是圆角方），窗格一笔竖、一笔横（拓片 EEF9 横格独立成域），
// 月是肚里一小竖笔的弯月（拓片 EEF7 月内一竖笔）。弯月两缘沿用「月」一课甲骨文的骨架，平移到「明」里月的位置。
const ORACLE = {
  // 外框 n=2.7：拓片（EEF7/EEF9/EEFA）的囧框都是圆角方，2026-11-21 前的 3.2 太方，
  // 加上十字格贴框，整个构件读成「田」（用户终审指出）。
  jiongLeft: ringPts({ ...JIONG_C, a: 100, b: 118, n: 2.7, from: -90, to: -270 }),
  jiongRight: ringPts({ ...JIONG_C, a: 100, b: 118, n: 2.7, from: -90, to: 90 }),
  // 窗格浮在框内、不与框相连。甲骨实证（2026-11-21 二修）：四件拓片没有一件是十字格——
  // EEF6/EEF7 是与框粘连的网纹，EEF9/EEFA 是一根悬空横条。所以甲骨只画**一根浮横条**（循 EEF9/EEFA）；
  // 竖格是零长的点、藏进横条墨里，小篆（swxz_6719 十字格上端悬空）才长出来。
  // 横条中心线离框 42px：框笔半宽 13＋条笔半宽 13，可见空隙约 16px。
  jiongMid: [[271, 406], [271, 406]],
  jiongBot: [[213, 406], [329, 406]],
  yueBack: [[766, 204], [647, 244], [547, 339], [514, 459], [522, 579], [572, 684], [664, 751], [752, 764]],
  yueArm: [[766, 204], [670, 279], [630, 399], [632, 519], [660, 629], [712, 704], [752, 764]],
  // 小竖笔要落在月牙肚里（左缘 x≈514、右缘 x≈632 之间），否则会被右缘线盖住
  yueIn1: [[570, 434], [576, 549]],
  yueIn2: [[573, 491], [573, 491]],
  width: { jiong: 26, yue: 24 },
  jitter: { jiong: 0.3, yue: 0.22 },
};

// 小篆囧（2026-11-22 三修，两件拓片像素剖析推翻「十字」）：竖长圆角框＋**中横棂贴左右框**
// （swxz_6719 y0.35 横棂与框相连）＋**竖棂自横棂垂下、不抵底**（660E 中部浮空竖棂、swxz 下方竖笔）。
// 两件拓片没有一件是四边封的十字——十字读作「田」，是把两件错误合并出来的形。
// 月：拓片笔宽约占月高 6～13%（660E 约 6%），yue 笔宽 25→34（约 5.8%）；月内一竖笔维持（2/2 实证）。
const SEAL = {
  jiongLeft: ringPts({ ...JIONG_C, a: 120, b: 165, n: 3.0, from: -90, to: -270 }),
  jiongRight: ringPts({ ...JIONG_C, a: 120, b: 165, n: 3.0, from: -90, to: 90 }),
  jiongMid: [[271, 356], [271, 480]],
  jiongBot: [[150, 356], [392, 356]],
  yueBack: [[739, 197], [616, 249], [551, 379], [541, 519], [561, 649], [631, 734], [724, 771]],
  yueArm: [[739, 197], [678, 264], [658, 389], [661, 519], [684, 644], [716, 724], [724, 771]],
  // 月肚里一竖笔（拓片 swxz_6719 11×62、xiaozhuan_27_660E 18×89，约 0.36 月高），第二笔还是零长的点
  yueIn1: [[600, 386], [600, 582]],
  yueIn2: [[600, 484], [600, 484]],
  width: { jiong: 24, yue: 34 },
  jitter: { jiong: 0, yue: 0 },
};

// 楷书：八画全部照笔画数据的中线来（y 换成 900 - y）；囧在楷书里已经变成日
function kaishuForm(medians) {
  const flip = (m) => m.map(([x, y]) => [x, 900 - y]);
  return {
    jiongLeft: flip(medians[0]),
    jiongRight: flip(medians[1]),
    jiongMid: flip(medians[2]),
    jiongBot: flip(medians[3]),
    yueBack: flip(medians[4]),
    yueArm: flip(medians[5]),
    yueIn1: flip(medians[6]),
    yueIn2: flip(medians[7]),
    width: { jiong: 40, yue: 44 },
    jitter: { jiong: 0, yue: 0 },
  };
}

// 两个形都是重采样好的 N 点列，逐点插值；线宽、刀刻颤动一起变过去
function mixForm(a, b, t) {
  const mixc = (x, y) => ({ r: lerp(x.r, y.r, t), g: lerp(x.g, y.g, t), b: lerp(x.b, y.b, t) });
  const out = {
    width: { jiong: lerp(a.width.jiong, b.width.jiong, t), yue: lerp(a.width.yue, b.width.yue, t) },
    jitter: { jiong: lerp(a.jitter.jiong, b.jitter.jiong, t), yue: lerp(a.jitter.yue, b.jitter.yue, t) },
    colors: { jiong: mixc(a.colors.jiong, b.colors.jiong), yue: mixc(a.colors.yue, b.colors.yue) },
  };
  for (const k of KEYS) out[k] = a[k].map((p, i) => [lerp(p[0], b[k][i][0], t), lerp(p[1], b[k][i][1], t)]);
  return out;
}

export function createMorph(layer, data) {
  const root = svg('g', { class: 'morph', 'data-testid': 'morph', opacity: 0 }, layer);
  const lines = {};
  for (const k of KEYS) {
    lines[k] = svg('path', {
      fill: 'none',
      stroke: 'black',
      'stroke-linejoin': 'round',
      'stroke-linecap': 'round',
      pathLength: 1,
    }, root);
  }

  const prep = (f) => ({
    ...Object.fromEntries(KEYS.map((k) => [k, resample(f[k], N)])),
    width: f.width,
    jitter: f.jitter,
    colors: INK,
  });
  const FORMS = { oracle: prep(ORACLE), seal: prep(SEAL), kaishu: prep(kaishuForm(data.medians)) };

  let current = FORMS.oracle;
  // colors 可以临时换成组字的颜料（朱砂 / 月光金），几何不变
  function render(f, colors = f.colors) {
    current = f;
    for (const k of KEYS) {
      const c = COMP[k];
      const pts = carve(f[k], f.jitter[c]);
      // 还没长出来的笔画是零长的点，不画
      lines[k].setAttribute('d', pathLen(pts) > 3 ? dOf(pts) : '');
      lines[k].setAttribute('stroke', `rgb(${colors[c].r | 0},${colors[c].g | 0},${colors[c].b | 0})`);
      lines[k].setAttribute('stroke-width', f.width[c].toFixed(1));
    }
  }

  // 记下骨架外框，供测试核对楷书和真正的笔画是否对齐
  const noteBox = () => {
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const k of KEYS)
      for (const [x, y] of current[k]) {
        x1 = Math.min(x1, x); y1 = Math.min(y1, y);
        x2 = Math.max(x2, x); y2 = Math.max(y2, y);
      }
    root.dataset.kaishuBox = `${((x1 + x2) / 2).toFixed(1)},${((y1 + y2) / 2).toFixed(1)},${(x2 - x1).toFixed(1)},${(y2 - y1).toFixed(1)}`;
  };

  const setDraw = (p, t) => {
    p.setAttribute('stroke-dasharray', '1 1');
    p.setAttribute('stroke-dashoffset', String(1 - t));
  };

  return {
    root,
    // 窗先来：夜里的窗子挪到字位的同时，赭石色把囧的外框一笔描出来
    async drawWindow(check) {
      root.setAttribute('opacity', 1);
      render(FORMS.oracle, PIGMENT);
      KEYS.forEach((k) => setDraw(lines[k], 0));
      await tween(1600, (t) => {
        setDraw(lines.jiongLeft, t);
        setDraw(lines.jiongRight, t);
      }, { check });
    },
    // 月跟上：月牙挪过来，月光金把弯月的背和怀抱描出来
    async drawMoon(check) {
      await tween(1600, (t) => {
        setDraw(lines.yueBack, t);
        setDraw(lines.yueArm, t);
      }, { check });
    },
    // 窗格和月牙里的小笔长出来，赭石和月光金慢慢一起沉成墨
    async settle(check) {
      await tween(700, (t) => {
        setDraw(lines.jiongMid, t);
        setDraw(lines.jiongBot, t);
        setDraw(lines.yueIn1, t);
      }, { check });
      const mixc = (x, y, t) => ({ r: lerp(x.r, y.r, t), g: lerp(x.g, y.g, t), b: lerp(x.b, y.b, t) });
      await tween(
        1100,
        (t) => render(FORMS.oracle, { jiong: mixc(PIGMENT.jiong, INK.jiong, t), yue: mixc(PIGMENT.yue, INK.yue, t) }),
        { check },
      );
    },
    async to(name, ms, check) {
      const from = current;
      await tween(ms, (t) => render(mixForm(from, FORMS[name], t)), { check });
      // 变形到位后摘掉描红起手时的隐藏状态——月内第二笔等「从零长出来」的笔画才看得见
      for (const k of KEYS) {
        if (pathLen(current[k]) > 3) {
          lines[k].removeAttribute('stroke-dasharray');
          lines[k].removeAttribute('stroke-dashoffset');
        }
      }
      if (name === 'kaishu') noteBox();
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity') ?? 1);
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },
    reset() {
      root.setAttribute('opacity', 0);
      KEYS.forEach((k) => {
        lines[k].removeAttribute('stroke-dasharray');
        lines[k].removeAttribute('stroke-dashoffset');
      });
      render(FORMS.oracle);
    },
  };
}
