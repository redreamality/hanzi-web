// 水墨小人：古画里弯着腰、垂着手臂侧身站立的人。
// 也是两条笔画：一笔从头顿下去，躬着身子，顺势撇出垂下的手臂；
// 一笔是腿，从腰间搭出踩向右下。跟字形的笔画一一对应，变形时无缝衔接。
import { svg, tween, lerp, ease } from '../../util.js';
import { makeStroke, strokePath } from './ribbon.js';

const POSE = {
  body: {
    anchors: [[490, 168], [484, 262], [522, 392], [506, 500], [452, 580], [374, 650], [290, 700]],
    w: [[0, 86], [0.25, 58], [0.5, 46], [0.75, 36], [1, 20]],
  },
  leg: {
    anchors: [[506, 486], [566, 590], [638, 688], [686, 760], [722, 800]],
    w: [[0, 54], [0.5, 44], [0.85, 38], [1, 50]],
  },
};
// 淡墨晕染版：同形放宽，套水彩滤镜
const haloW = (w) => w.map(([s, v]) => [s, v * 1.6]);
const HALO = {
  body: { ...POSE.body, w: haloW(POSE.body.w) },
  leg: { ...POSE.leg, w: haloW(POSE.leg.w) },
};

// 点头鞠躬：上身（含头）向前下方压，手顺势抬起。u 是弧长比例
function nodOffset(u, amp) {
  const bend = amp * Math.min(1, Math.max(0, 1 - u / 0.62)) ** 1.4;
  const nod = amp * 0.9 * Math.max(0, 1 - u / 0.14); // 头多点一下
  const lift = amp * 0.8 * Math.min(1, Math.max(0, (u - 0.68) / 0.2)); // 手上摆
  return [-(bend + nod) * 0.55, bend + nod - lift];
}

export function createPerson(layer) {
  const base = { body: makeStroke(POSE.body), leg: makeStroke(POSE.leg) };
  const haloS = { body: makeStroke(HALO.body), leg: makeStroke(HALO.leg) };
  const groundD = 'M246 834 C 374 848 574 850 770 838';

  const root = svg('g', { class: 'person', opacity: 0 }, layer);
  const scaler = svg('g', {}, root);
  // 透明命中区：孩子戳到小人附近的空白也算摸到了
  const hit = svg('ellipse', { cx: 494, cy: 486, rx: 252, ry: 330, fill: 'transparent' }, scaler);
  hit.style.pointerEvents = 'all';
  const halo = svg('g', { opacity: 0, filter: 'url(#wash2)' }, scaler);
  const haloBody = svg('path', { fill: '#4a423a', opacity: 0.5 }, halo);
  const haloLeg = svg('path', { fill: '#4a423a', opacity: 0.5 }, halo);
  const haloGround = svg('path', { d: groundD, fill: 'none', stroke: '#4a423a', 'stroke-width': 30, 'stroke-linecap': 'round', opacity: 0.4 }, halo);
  const body = svg('g', { class: 'person-inner breathing' }, scaler);
  const ground = svg('path', { d: groundD, fill: 'none', stroke: '#3a332c', 'stroke-width': 16, 'stroke-linecap': 'round', opacity: 0.3 }, body);
  const bodyPath = svg('path', { fill: '#241f1b' }, body);
  const legPath = svg('path', { fill: '#241f1b' }, body);

  const amp = { v: 0 }; // 点头幅度，0 表示站直
  const render = () => {
    for (const [path, s] of [[bodyPath, base.body], [legPath, base.leg]]) {
      path.setAttribute(
        'd',
        strokePath({ ...s, pts: s.pts.map(([x, y], i) => { const [dx, dy] = nodOffset(i / (s.pts.length - 1), amp.v); return [x + dx, y + dy]; }) }),
      );
    }
  };

  const drawInk = (t) => {
    render();
    // 先写身子这一大笔，再写腿，最后抹一笔地面
    if (t < 0.55) {
      bodyPath.setAttribute('d', strokePath(base.body, t / 0.55));
      legPath.setAttribute('d', '');
      ground.setAttribute('opacity', 0);
    } else if (t < 0.85) {
      legPath.setAttribute('d', strokePath(base.leg, (t - 0.55) / 0.3));
      ground.setAttribute('opacity', 0);
    } else {
      ground.setAttribute('opacity', 0.3 * (t - 0.85) / 0.15);
      ground.setAttribute('stroke-dasharray', '520 520');
      ground.setAttribute('stroke-dashoffset', String(520 * (1 - (t - 0.85) / 0.15)));
    }
  };

  const setScale = (s) => scaler.setAttribute('transform', `translate(500 500) scale(${s}) translate(${-500} ${-500})`);

  return {
    root,
    body,
    // 小人当前的几何，给字形变形做起笔
    form: () => base,
    // 像有人在宣纸上作画：一笔一笔写出来，墨色再洇开一点
    async appear(check) {
      root.setAttribute('opacity', 1);
      halo.setAttribute('opacity', 0);
      setScale(1);
      amp.v = 0;
      await tween(2700, drawInk, { check, easing: ease.inOut });
      await tween(600, (t) => halo.setAttribute('opacity', t * 0.5), { check });
    },
    // 摸一下：开心地点点头、弯弯腰，手轻轻抬起来
    async pulse() {
      await tween(1100, (t) => {
        amp.v = Math.sin(t * Math.PI * 2) * (1 - 0.3 * t);
        setScale(1 + 0.012 * Math.sin(t * Math.PI));
        render();
      });
      amp.v = 0;
      render();
      setScale(1);
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity'));
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },
    // 收尾：挪到字旁边缩小站好
    setPlaced({ scale = 1, cx = 500, cy = 500 } = {}) {
      root.setAttribute('transform', `translate(${cx - scale * 500} ${cy - scale * 500}) scale(${scale})`);
    },
    reset() {
      root.setAttribute('transform', '');
      root.setAttribute('opacity', 0);
      halo.setAttribute('opacity', 0);
      amp.v = 0;
      setScale(1);
      drawInk(0);
    },
  };
}
