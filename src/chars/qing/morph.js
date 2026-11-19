// 「青」从远山到楷书的字形变形。
// 小篆形对照汉典「说文小篆」拓片（swxz/9751.svg，字头「靑」）：上部「生」是草芽般的
// 屮形三叉（窄聚中央）配三道横，中竖贯通；下部是窄高的开口框，框内两道横（上短下长）。
// 楷书青：上部三横一竖，下部月形框内两横。
// 八条笔画一一对应做点插值：草芽的三叉慢慢躺平成顶横，
// 窄框慢慢放宽成月，框内的两道横慢慢移位成月肚里的两横。
// 楷书端点直接取自笔画数据的中线首尾，接笔顺动画时不跳。
import { svg, tween, wait, lerp } from '../../util.js';

const K = 8; // 每条笔画统一重采样成 8 个控制点，插值时逐点对应

function pathLen(pts) {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return s;
}

// 按弧长均匀重采样成 n 个点（只为变形时点与点对应）
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

// Catmull-Rom 样条：少控制点的折线也画得圆转流畅，正是小篆的笔意
function cr(a, b, c, d, t) {
  return b + 0.5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)));
}
function smooth(pts, seg = 10) {
  const n = pts.length;
  const out = [];
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const [p1, p2] = [pts[i], pts[i + 1]];
    const p3 = pts[Math.min(n - 1, i + 2)];
    for (let s = 0; s < seg; s++) {
      const t = s / seg;
      out.push([cr(p0[0], p1[0], p2[0], p3[0], t), cr(p0[1], p1[1], p2[1], p3[1], t)]);
    }
  }
  out.push([...pts[n - 1]]);
  return out;
}

const strokeD = (pts) => 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L');

// 小篆青，对照汉典「说文小篆」拓片（img.zdic.net/swxz/9751.svg，《说文》字头「靑」）：
// 上部「生」= 草芽三叉（中竖 + 两侧短斜笔向内收，窄聚中央）+ 三道横（屮底弧、中横、底长横），中竖贯通；
// 下部 = 窄高的开口框（宽约字宽四成，左右竖平行）+ 框内两道横（上短下长，即楷书月部两横的前身）。
// 先给少控制点的折线，resample + smooth 后自然圆转匀称（屏幕坐标）。
const SEAL_RAW = [
  // 一笔画「左斜笔 + 屮底弧 + 右斜笔」：两头翘起的草芽叉，窄窄一簇
  [[444, 158], [452, 294], [528, 308], [604, 294], [612, 158]],
  // 生中部的一短横
  [[352, 378], [512, 368], [688, 378]],
  // 中竖贯通到底部长横
  [[508, 150], [508, 290], [508, 450]],
  // 生的底部长横，全字最宽
  [[300, 455], [512, 443], [724, 455]],
  // 框的左竖，竖直
  [[437, 480], [437, 655], [437, 830]],
  // 框的顶横接右竖，一笔连成；框底开口
  [[437, 480], [587, 480], [587, 655], [587, 830]],
  // 框内偏上的一道短横
  [[466, 600], [512, 594], [558, 600]],
  // 框内偏下的一道长横，几乎顶到两边
  [[440, 652], [512, 646], [584, 652]],
];

// 楷书：手定控制点，首尾与笔画数据的中线首尾完全一致
const KAISHU_RAW = [
  [[334, 190], [358, 198], [412, 196], [494, 185], [566, 170], [628, 156], [676, 150], [701, 154]],
  [[344, 307], [396, 310], [462, 298], [528, 286], [584, 277], [632, 272], [664, 272], [679, 274]],
  [[469, 69], [490, 84], [506, 103], [512, 140], [512, 240], [511, 330], [505, 368], [493, 393]],
  [[127, 454], [190, 467], [320, 448], [512, 423], [700, 381], [810, 373], [873, 377], [929, 396]],
  [[348, 512], [368, 527], [379, 548], [381, 600], [377, 680], [365, 770], [352, 846], [339, 900]],
  [[402, 525], [512, 518], [614, 514], [648, 560], [655, 700], [654, 818], [612, 905], [530, 869]],
  [[401, 647], [429, 641], [464, 634], [498, 628], [531, 624], [551, 622], [560, 623], [563, 623]],
  [[394, 743], [423, 738], [462, 731], [501, 725], [537, 720], [559, 720], [568, 721], [571, 722]],
];

const SEAL = SEAL_RAW.map((p) => resample(p, K));
const KAISHU = KAISHU_RAW.map((p) => resample(p, K));

const FORMS = { seal: SEAL, kaishu: KAISHU };
// 线宽：小篆匀称细线；楷书按笔画实际粗细，月肚里两横最细
const WIDTHS = {
  seal: [26, 26, 28, 28, 26, 26, 26, 26],
  kaishu: [88, 86, 96, 92, 88, 92, 58, 58],
};
const INK = [34, 29, 26];
// 起笔用青黛色——远山的颜色，最后慢慢沉成墨
const AZURE = [47, 110, 94];

export function createMorph(layer, data) {
  const root = svg('g', { class: 'morph', 'data-testid': 'morph', opacity: 0 }, layer);
  const paths = [];
  for (let i = 0; i < 8; i++) {
    paths.push(svg('path', {
      fill: 'none',
      stroke: 'black',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      pathLength: 1,
    }, root));
  }

  const drawPart = (i, pts, ink, w) => {
    paths[i].setAttribute('d', strokeD(smooth(pts)));
    paths[i].setAttribute('stroke', `rgb(${ink[0] | 0},${ink[1] | 0},${ink[2] | 0})`);
    paths[i].setAttribute('stroke-width', w.toFixed(1));
  };

  const render = (form, kind, ink) => {
    for (let i = 0; i < 8; i++) drawPart(i, form[i], ink, WIDTHS[kind][i]);
  };

  const setDraw = (i, t) => {
    paths[i].setAttribute('stroke-dasharray', '1 1');
    paths[i].setAttribute('stroke-dashoffset', String(1 - t));
  };

  let kind = 'seal';

  return {
    root,
    // 用青黛色按笔顺一笔一笔写出小篆，颜色再慢慢沉成墨
    async drawSeal(check) {
      kind = 'seal';
      root.setAttribute('opacity', 1);
      render(SEAL, 'seal', AZURE);
      for (let i = 0; i < 8; i++) setDraw(i, 0);
      for (let i = 0; i < 8; i++) {
        await tween(330, (t) => setDraw(i, t), { check });
        await wait(90, check);
      }
      await tween(
        1100,
        (t) => render(SEAL, 'seal', AZURE.map((v, j) => lerp(v, INK[j], t))),
        { check },
      );
    },
    // 八条笔画同时插值：草芽躺平成横，丹框收底成钩，一点化成两横
    async to(name, ms, check) {
      const from = FORMS[kind];
      const to = FORMS[name];
      const fromKind = kind;
      await tween(
        ms,
        (t) => {
          for (let i = 0; i < 8; i++) {
            const pts = from[i].map((q, j) => [lerp(q[0], to[i][j][0], t), lerp(q[1], to[i][j][1], t)]);
            drawPart(i, pts, INK, lerp(WIDTHS[fromKind][i], WIDTHS[name][i], t));
          }
        },
        { check },
      );
      kind = name;
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity') ?? 1);
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },
    reset() {
      kind = 'seal';
      root.setAttribute('opacity', 0);
      for (let i = 0; i < 8; i++) {
        paths[i].removeAttribute('stroke-dasharray');
        paths[i].removeAttribute('stroke-dashoffset');
      }
      render(SEAL, 'seal', INK);
    },
  };
}
