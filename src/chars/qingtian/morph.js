// 「晴」从雨后晴天到楷书的组字与字形落定。
// 《说文》未收「晴」（后起字，古多作暒，从日青声），没有可靠的小篆可依——
// 所以不画古文字，直接演组字：太阳（朱砂起笔，与「日」一课同色）在左凝成「日」，
// 青天的青色（青黛起笔，与「青」一课同色）在右凝成「青」。
// 组字形态里，「日」还是独体字的宽模样；到楷书它收身变窄，让给右边的「青」——
// 这正是合体字的间架：偏旁要写得谦让。楷书十二笔全部照笔画数据的中线（y 换成 900 - y），
// 最后一步和真正的笔顺严丝合缝。
import { svg, tween, wait, lerp } from '../../util.js';

const N = 14; // 每条笔画统一重采样成 14 个控制点，插值时逐点对应

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

// Catmull-Rom 样条只用来把手定的少控制点画圆转（组字形态的「日」）；
// 笔画数据的中线折线则直译——样条在急转折处会弯出线外，终形会长「毛刺」
function cr(a, b, c, d, t) {
  return b + 0.5 * t * (c - a + t * (2 * a - 5 * b + 4 * c - d + t * (3 * (b - c) + d - a)));
}
function smooth(pts, seg = 8) {
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

// 十二笔：前四笔是「日」，后八笔是「青」（qing 一课的八笔，间架收窄些）
const RI_KEYS = ['riLeft', 'riFold', 'riMid', 'riBot'];
const QING_KEYS = ['qingH1', 'qingH2', 'qingV', 'qingH3', 'yuePi', 'yueFold', 'yueIn1', 'yueIn2'];
const KEYS = [...RI_KEYS, ...QING_KEYS];
const PART = Object.fromEntries(KEYS.map((k) => [k, k.startsWith('ri') ? 'ri' : 'qing']));

// 笔画数据 y 朝上，屏幕 y 朝下
const flip = (m) => m.map(([x, y]) => [x, 900 - y]);

// 组字形态里「日」还是独体字的宽模样：手定的宽版间架（笔画彼此搭牢、不出头不脱节；
// 均匀放大 medians 会把笔画间的间隙也放大，间架就散了）。到楷书它收身变窄成偏旁。
const ZUHE_RI = [
  // 竖：微微内弧
  [[44, 216], [56, 320], [62, 460], [58, 610], [50, 720], [54, 742]],
  // 横折：起笔接在竖顶的右侧，横过去、折下来
  [[76, 224], [150, 210], [244, 206], [306, 214], [322, 250], [326, 420], [322, 590], [318, 716], [314, 740]],
  // 中横
  [[94, 448], [168, 438], [244, 436], [304, 442]],
  // 底横
  [[82, 706], [150, 694], [244, 690], [310, 698]],
];

function zuheForm(medians) {
  return {
    riLeft: ZUHE_RI[0],
    riFold: ZUHE_RI[1],
    riMid: ZUHE_RI[2],
    riBot: ZUHE_RI[3],
    qingH1: flip(medians[4]),
    qingH2: flip(medians[5]),
    qingV: flip(medians[6]),
    qingH3: flip(medians[7]),
    yuePi: flip(medians[8]),
    yueFold: flip(medians[9]),
    yueIn1: flip(medians[10]),
    yueIn2: flip(medians[11]),
  };
}

function kaishuForm(medians) {
  return Object.fromEntries(KEYS.map((k, i) => [k, flip(medians[i])]));
}

// 线宽：组字时「日」独体，笔画饱满；楷书「日」收窄成偏旁，笔画也随之收细
const WIDTHS = {
  zuhe: { ri: [50, 48, 46, 46], qing: [64, 62, 68, 66, 64, 66, 42, 42] },
  kaishu: { ri: [44, 42, 40, 40], qing: [62, 60, 66, 64, 62, 64, 40, 40] },
};

const INK = { ri: { r: 34, g: 29, b: 26 }, qing: { r: 34, g: 29, b: 26 } };
// 组字起笔的颜料：日用朱砂（与「日」「明」一课同色），青用青黛（与「青」一课同色）
const PIGMENT = { ri: { r: 178, g: 52, b: 40 }, qing: { r: 47, g: 110, b: 94 } };

// 两个形都是重采样好的 N 点列，逐点插值；线宽、颜色一起变过去
function mixForm(a, b, t) {
  const mixc = (x, y) => ({ r: lerp(x.r, y.r, t), g: lerp(x.g, y.g, t), b: lerp(x.b, y.b, t) });
  const out = {
    width: {
      ri: a.width.ri.map((v, i) => lerp(v, b.width.ri[i], t)),
      qing: a.width.qing.map((v, i) => lerp(v, b.width.qing[i], t)),
    },
    colors: { ri: mixc(a.colors.ri, b.colors.ri), qing: mixc(a.colors.qing, b.colors.qing) },
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

  const prep = (f, kind) => ({
    ...Object.fromEntries(KEYS.map((k) => [
      k,
      kind === 'zuhe' && PART[k] === 'ri'
        ? resample(smooth(resample(f[k], N * 3), 4), N) // 手定的「日」：先匀密再圆转，末了仍归 N 点
        : resample(f[k], N),
    ])),
    width: WIDTHS[kind],
    colors: INK,
  });
  const FORMS = { zuhe: prep(zuheForm(data.medians), 'zuhe'), kaishu: prep(kaishuForm(data.medians), 'kaishu') };

  const widthOf = (f, k) => f.width[PART[k]][PART[k] === 'ri' ? RI_KEYS.indexOf(k) : QING_KEYS.indexOf(k)];

  function render(f, colors = f.colors) {
    for (const k of KEYS) {
      const c = PART[k];
      // resample 只匀密点列、不改形状；折线直译，急转折处不长毛刺
      lines[k].setAttribute('d', strokeD(f[k]));
      lines[k].setAttribute('stroke', `rgb(${colors[c].r | 0},${colors[c].g | 0},${colors[c].b | 0})`);
      lines[k].setAttribute('stroke-width', widthOf(f, k).toFixed(1));
    }
  }

  // 记下骨架外框，供测试核对楷书和真正的笔画是否对齐
  const noteBox = () => {
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const k of KEYS)
      for (const [x, y] of FORMS.kaishu[k]) {
        x1 = Math.min(x1, x); y1 = Math.min(y1, y);
        x2 = Math.max(x2, x); y2 = Math.max(y2, y);
      }
    root.dataset.kaishuBox = `${((x1 + x2) / 2).toFixed(1)},${((y1 + y2) / 2).toFixed(1)},${(x2 - x1).toFixed(1)},${(y2 - y1).toFixed(1)}`;
  };

  const setDraw = (p, t) => {
    p.setAttribute('stroke-dasharray', '1 1');
    p.setAttribute('stroke-dashoffset', String(1 - t));
  };

  let kind = 'zuhe';

  return {
    root,
    // 太阳挪过来的同时，朱砂把「日」按笔顺一笔一笔描出来
    async drawRi(check) {
      kind = 'zuhe';
      root.setAttribute('opacity', 1);
      render(FORMS.zuhe, PIGMENT);
      KEYS.forEach((k) => setDraw(lines[k], 0));
      for (const k of RI_KEYS) {
        await tween(300, (t) => setDraw(lines[k], t), { check });
        await wait(80, check);
      }
    },
    // 青色聚过来，青黛把「青」一笔一笔写出来
    async drawQing(check) {
      for (const k of QING_KEYS) {
        await tween(300, (t) => setDraw(lines[k], t), { check });
        await wait(80, check);
      }
    },
    // 朱砂和青黛慢慢一起沉成墨
    async settle(check) {
      const mixc = (x, y, t) => ({ r: lerp(x.r, y.r, t), g: lerp(x.g, y.g, t), b: lerp(x.b, y.b, t) });
      await tween(
        1100,
        (t) => render(FORMS.zuhe, { ri: mixc(PIGMENT.ri, INK.ri, t), qing: mixc(PIGMENT.qing, INK.qing, t) }),
        { check },
      );
    },
    // 「日」收身变窄、挪正，让给右边的「青」；笔画粗细也落定
    async to(name, ms, check) {
      const from = FORMS[kind];
      await tween(
        ms,
        (t) => render(mixForm(from, FORMS[name], t)),
        { check },
      );
      kind = name;
      if (name === 'kaishu') noteBox();
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity') ?? 1);
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },
    reset() {
      kind = 'zuhe';
      root.setAttribute('opacity', 0);
      KEYS.forEach((k) => {
        lines[k].removeAttribute('stroke-dasharray');
        lines[k].removeAttribute('stroke-dashoffset');
      });
      render(FORMS.zuhe);
    },
  };
}
