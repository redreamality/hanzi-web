// 「心」的实物画面：一个深墨剪影的小朋友，双手捧在胸前，
// 胸口一颗胭脂暖的心怦怦跳（怦——怦怦的双跳节奏），身子轻轻呼吸。
// 摸一下：心快快地跳几下，荡开一圈暖光，孩子轻轻晃一晃。
// 胸口的暖心是孩子认识的「心」的样子；古文字的心廓以拓片为准，由字形变形去画——
// 实物层不作字源主张。
import { svg, tween, wait, lerp, ease } from '../../util.js';

// 沿点列的锥形闭合路径：像一笔写出的肢体，根粗梢细
function pathLen(pts) {
  let s = 0;
  for (let i = 1; i < pts.length; i++) s += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return s;
}
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
function taperD(pts, w0, w1) {
  const dense = smooth(pts);
  const total = pathLen(dense);
  const left = [];
  const right = [];
  let acc = 0;
  for (let i = 0; i < dense.length; i++) {
    if (i) acc += Math.hypot(dense[i][0] - dense[i - 1][0], dense[i][1] - dense[i - 1][1]);
    const j = Math.min(dense.length - 1, i + 1);
    const [dx, dy] = [dense[j][0] - dense[i][0], dense[j][1] - dense[i][1]];
    const l = Math.hypot(dx, dy) || 1;
    const w = lerp(w0, w1, acc / total) / 2;
    left.push([dense[i][0] + (-dy / l) * w, dense[i][1] + (dx / l) * w]);
    right.push([dense[i][0] - (-dy / l) * w, dense[i][1] - (dx / l) * w]);
  }
  return 'M' + left.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')
    + 'L' + right.reverse().map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + 'Z';
}

const INK_BODY = '#2a241e';
// 心族色系（etymology.md 色系表）：胭脂主色 / 紫胭深色 / 暖粉晕
const HEART_AT = [512, 458];   // 胸口心的中心（和后面字形变形的位置对上）
const LEAN_AT = [512, 824];    // 摸一下时晃动的轴（脚底）

// 一颗心的轮廓（以中心为原点，上凹下尖）
const HEART_D = 'M 0 -14 C -10 -34 -44 -36 -56 -14 C -68 8 -46 34 0 62 C 46 34 68 8 56 -14 C 44 -36 10 -34 0 -14 Z';

export function createChild(pictureLayer, sceneryLayer) {
  const root = svg('g', { class: 'xin-kid', opacity: 0 }, pictureLayer);

  // 本字专属渐变（id 一律带 xin- 前缀）：胸口的暖心从暖红洇向紫胭
  const defs = svg('defs', {}, root);
  const grad = svg('linearGradient', { id: 'xin-heart-grad', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
  svg('stop', { offset: 0, 'stop-color': '#d8636f' }, grad);
  svg('stop', { offset: 1, 'stop-color': '#a83850' }, grad);

  // 胸口后面一层很淡的暖光：让「心在发光」这件事有呼吸的纸面
  const halo = svg('circle', { cx: HEART_AT[0], cy: HEART_AT[1], r: 420, fill: '#f2c1bd', opacity: 0, filter: 'url(#glow)' }, root);

  // 脚边的极淡短影（只做局部，不横贯画面）
  const shadow = svg('ellipse', { cx: 512, cy: 838, rx: 126, ry: 13, fill: '#4a423a', opacity: 0, filter: 'url(#wash2)' }, root);

  // lean 一层专门给「摸一下时轻轻晃」的 JS transform；
  // 里面的 figure 才挂 CSS 呼吸——CSS 动画会盖掉同层的 transform 属性，两层互不打架
  const lean = svg('g', { class: 'xin-lean' }, root);
  const kid = svg('g', { class: 'xin-figure breathing', opacity: 0 }, lean);

  // 两条腿（远侧那条淡一点点）
  svg('path', { d: taperD([[532, 556], [538, 690], [543, 812]], 34, 24), fill: INK_BODY, 'fill-opacity': 0.86, filter: 'url(#ink)' }, kid);
  svg('path', { d: taperD([[492, 556], [486, 690], [481, 812]], 34, 24), fill: INK_BODY, filter: 'url(#ink)' }, kid);

  // 躯干（圆肩的小身子）
  svg('path', {
    d: 'M452 322 C 446 392 446 468 456 534 C 464 566 560 566 568 534 C 578 468 578 392 572 322 C 538 302 486 302 452 322 Z',
    fill: INK_BODY, filter: 'url(#ink)',
  }, kid);

  // 圆脑袋＋一撮小呆毛
  svg('circle', { cx: 512, cy: 262, r: 44, fill: INK_BODY, filter: 'url(#ink)' }, kid);
  svg('path', { d: 'M512 220 q 3 -16 21 -23', fill: 'none', stroke: INK_BODY, 'stroke-width': 7, 'stroke-linecap': 'round', filter: 'url(#ink)' }, kid);

  // 胸口的心：JS 的 pulse 叠在外层 wrap 上，CSS 的怦怦跳在里层，互不打架
  const heartWrap = svg('g', { class: 'xin-heart-wrap' }, kid);
  const heartG = svg('g', { class: 'xin-heart beating' }, heartWrap);
  const at = `translate(${HEART_AT[0]} ${HEART_AT[1]})`;
  svg('circle', { cx: HEART_AT[0], cy: HEART_AT[1], r: 128, fill: '#f2c1bd', opacity: 0.5, filter: 'url(#glow)' }, heartG);
  svg('path', { d: HEART_D, fill: '#e89aa4', opacity: 0.3, filter: 'url(#wash2)', transform: `${at} scale(1.12)` }, heartG);
  svg('path', { d: HEART_D, fill: '#c2455c', opacity: 0.42, filter: 'url(#wash1)', transform: at }, heartG);
  svg('path', { d: HEART_D, fill: 'url(#xin-heart-grad)', opacity: 0.66, transform: at }, heartG);
  svg('path', { d: HEART_D, fill: 'none', stroke: '#8e2f4a', 'stroke-width': 5, opacity: 0.36, filter: 'url(#wash1)', transform: `${at} scale(0.94)` }, heartG);
  const setHeartScale = (s) => heartWrap.setAttribute('transform', `translate(${HEART_AT[0]} ${HEART_AT[1]}) scale(${s}) translate(${-HEART_AT[0]} ${-HEART_AT[1]})`);

  // 两条手臂从肩上弯下来，手捧在心的下面（画在心之后：捧在心前面）
  svg('path', { d: taperD([[566, 338], [594, 410], [576, 478], [550, 522]], 30, 16), fill: INK_BODY, filter: 'url(#ink)' }, kid);
  svg('path', { d: taperD([[458, 338], [430, 410], [448, 478], [474, 522]], 30, 16), fill: INK_BODY, filter: 'url(#ink)' }, kid);
  svg('circle', { cx: 547, cy: 533, r: 16, fill: INK_BODY, filter: 'url(#ink)' }, kid);
  svg('circle', { cx: 477, cy: 533, r: 16, fill: INK_BODY, filter: 'url(#ink)' }, kid);

  // 透明命中罩：必须画在实物层最上层——所有视觉元素之后，
  // 罩住整个孩子和心，摸哪儿都算摸到（fill-opacity 0 仍接收点击）
  const body = svg('g', { class: 'xin-hit' }, root);
  svg('ellipse', { cx: 512, cy: 300, rx: 150, ry: 128, fill: '#000', 'fill-opacity': 0 }, body);
  svg('ellipse', { cx: 512, cy: 520, rx: 170, ry: 120, fill: '#000', 'fill-opacity': 0 }, body);
  svg('rect', { x: 428, y: 600, width: 172, height: 240, rx: 80, fill: '#000', 'fill-opacity': 0 }, body);

  // 收尾时飘起来的小心心：独立在 root 外，保持鲜亮（root 会整体压淡）
  const floats = svg('g', { class: 'xin-floats', opacity: 0 }, pictureLayer);

  // 远处两抹极淡的暖云（背景层，1600×1000 坐标）
  let scenery = null;
  const buildScenery = () => {
    sceneryLayer.replaceChildren();
    scenery = svg('g', { opacity: 0 }, sceneryLayer);
    const wash = svg('g', { filter: 'url(#mist-wash)', fill: '#e8c7c2' }, scenery);
    svg('ellipse', { cx: 420, cy: 300, rx: 300, ry: 60, opacity: 0.16 }, wash);
    svg('ellipse', { cx: 1180, cy: 240, rx: 260, ry: 52, opacity: 0.13 }, wash);
    svg('ellipse', { cx: 860, cy: 420, rx: 360, ry: 70, opacity: 0.1 }, wash);
  };

  // 初始都收着
  setHeartScale(0.25);
  let pulseToken = 0;
  let floatToken = 0;

  return {
    root,
    body,
    // 孩子从纸面洇出来，胸口的暖心最后「怦」地亮起
    async appear(check) {
      root.setAttribute('opacity', 1);
      buildScenery();
      tween(2000, (t) => scenery.setAttribute('opacity', t * 0.8), { check }).catch(() => {});
      await tween(700, (t) => halo.setAttribute('opacity', (t * 0.2).toFixed(2)), { check });
      kid.setAttribute('opacity', 1);
      await tween(1300, (t) => {
        kid.setAttribute('opacity', (0.3 + t * 0.7).toFixed(2));
        shadow.setAttribute('opacity', (t * 0.16).toFixed(2));
      }, { check });
      // 心从一小点绽开，暖光跟着洇出来
      await tween(850, (t) => {
        setHeartScale(lerp(0.25, 1, t));
        halo.setAttribute('opacity', (0.2 + 0.08 * Math.sin(t * Math.PI)).toFixed(2));
      }, { easing: ease.bloom, check });
      halo.setAttribute('opacity', 0.26);
    },
    // 字形阶段：孩子退干净（心在字形正后方，留影子会压住字），不留透叠
    async fadeOutForForms(check) {
      await tween(1700, (t) => {
        root.setAttribute('opacity', (1 - t).toFixed(3));
        halo.setAttribute('opacity', (0.26 * (1 - t)).toFixed(3));
      }, { check });
      root.setAttribute('opacity', 0);
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity'));
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t).toFixed(3)), { check });
    },
    // 摸一下：心怦怦快跳几下，暖光荡开一圈，孩子轻轻晃一晃
    async pulse() {
      const token = ++pulseToken;
      const alive = () => token === pulseToken;
      const ring = svg('circle', { cx: HEART_AT[0], cy: HEART_AT[1], r: 120, fill: 'none', stroke: '#e89aa4', 'stroke-width': 12, opacity: 0.5, filter: 'url(#wash2)' }, root);
      await tween(
        1000,
        (t) => {
          if (!alive()) return;
          setHeartScale(1 + 0.15 * Math.sin(t * Math.PI * 4) * (1 - t));
          ring.setAttribute('r', lerp(120, 300, t).toFixed(1));
          ring.setAttribute('opacity', (0.5 * (1 - t)).toFixed(2));
          const sway = Math.sin(t * Math.PI * 2.5) * (1 - t);
          lean.setAttribute('transform', `rotate(${(1.6 * sway).toFixed(2)} ${LEAN_AT[0]} ${LEAN_AT[1]})`);
        },
        { easing: ease.out },
      );
      ring.remove();
      if (!alive()) return;
      setHeartScale(1);
      lean.setAttribute('transform', '');
    },
    // 写完字：孩子和心回到字后面淡淡的，再从心口飘起几颗小心心（呼应「心能组成别的字」的钩子）
    async finale(check) {
      const token = ++floatToken;
      root.setAttribute('opacity', 1);
      kid.setAttribute('opacity', 1);
      shadow.setAttribute('opacity', 0.16);
      buildScenery();
      tween(900, (t) => scenery.setAttribute('opacity', t * 0.7), { check }).catch(() => {});
      await tween(650, (t) => {
        setHeartScale(lerp(0.25, 1, t));
        halo.setAttribute('opacity', (t * 0.3).toFixed(2));
      }, { easing: ease.bloom, check });
      await tween(900, (t) => root.setAttribute('opacity', lerp(1, 0.34, t).toFixed(3)), { check });
      // 三颗小心心依次「怦」地飘起来，又轻轻散掉（动画结束就移除，零残留）
      floats.setAttribute('opacity', 1);
      const spots = [[432, 330, -14], [512, 300, 10], [592, 336, -8]];
      await Promise.all(
        spots.map(([x, y, rot], i) =>
          wait(i * 320, check).then(async () => {
            if (token !== floatToken) return;
            const g = svg('g', { opacity: 0 }, floats);
            svg('path', { d: HEART_D, fill: '#d0606f', opacity: 0.9, transform: `scale(0.5)` }, g);
            svg('path', { d: HEART_D, fill: '#f2c1bd', opacity: 0.5, transform: `scale(0.8)` }, g);
            await tween(
              1700,
              (t) => {
                if (token !== floatToken) return;
                const rise = 200 * t;
                const drift = 26 * Math.sin(t * Math.PI * 2 + i) * (1 - t * 0.4);
                const s = t < 0.25 ? lerp(0.2, 0.62, t / 0.25) : lerp(0.62, 0.5, (t - 0.25) / 0.75);
                const fade = Math.min(1, t * 5) * (1 - Math.max(0, t - 0.72) / 0.28);
                g.setAttribute('transform', `translate(${(x + drift).toFixed(1)} ${(y - rise).toFixed(1)}) rotate(${rot * (1 - t)}) scale(${s.toFixed(2)})`);
                g.setAttribute('opacity', fade.toFixed(2));
              },
              { check },
            );
            g.remove();
          }),
        ),
      );
      floats.setAttribute('opacity', 0);
      floats.replaceChildren();
    },
    reset() {
      pulseToken++;
      floatToken++;
      root.setAttribute('opacity', 0);
      kid.setAttribute('opacity', 0);
      lean.setAttribute('transform', '');
      setHeartScale(0.25);
      halo.setAttribute('opacity', 0);
      shadow.setAttribute('opacity', 0);
      floats.setAttribute('opacity', 0);
      floats.replaceChildren();
      sceneryLayer.replaceChildren();
      scenery = null;
    },
  };
}
