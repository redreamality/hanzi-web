// 「大」的实物画面：一个比小朋友还大的西瓜，咕噜噜从右边滚进来；
// 小朋友一笔一笔写出来，先是手臂垂着，看到这么大的瓜，惊喜地张开手臂——
// 张开手臂的姿势，就是「大」字起笔的样子。
// 摸一下：西瓜轻轻滚一滚，小朋友的手臂欢快地扇一扇。
// 写完字（finale）：远处浮起一座淡淡的大山（呼应「大山」），西瓜和小朋友
// 回到画面里压成一层淡影，小朋友还在字旁张着手臂。
import { svg, tween, lerp, ease } from '../../util.js';
import { makeStroke, mixStroke, strokePath } from './ribbon.js';

const MELON_AT = [430, 608]; // 西瓜中心
const R = 245;
const ROLL_FROM = 560; // 滚入起点的横向偏移
const SHOULDER = [731, 542]; // 小朋友的双肩（两条手臂的根）

// 手臂锚点：从肩出发、指向 dirDeg（一百八十为正左、二百七十为正下）、长 len 的微弯笔画
function armAnchors([sx, sy], dirDeg, len) {
  const rad = (dirDeg * Math.PI) / 180;
  const vx = Math.cos(rad);
  const vy = Math.sin(rad);
  // 微弯：中间点沿垂直方向偏一点，手臂像有一点点肘的弧
  const px = -vy * 0.09 * len;
  const py = vx * 0.09 * len;
  const at = (k) => [sx + vx * len * k, sy + vy * len * k];
  return [
    at(0),
    [at(0.38)[0] + px, at(0.38)[1] + py],
    [at(0.72)[0] + px * 1.35, at(0.72)[1] + py * 1.35],
    at(1),
  ];
}
const ARM_W = [[0, 30], [0.5, 24], [1, 18]];
const armStroke = (dirDeg, len = 150) => makeStroke({ anchors: armAnchors(SHOULDER, dirDeg, len), w: ARM_W });
// 左臂：垂（向下）↔ 张（向左上）↔ 欢呼（再高一点）；右臂镜像
const POSE_L = { droop: armStroke(268), open: armStroke(212), flap: armStroke(200) };
const POSE_R = { droop: armStroke(272), open: armStroke(328), flap: armStroke(340) };

// 头身连着左腿的一笔（起笔的粗圆头就是小朋友的头），右腿另一笔
const BODY = makeStroke({
  anchors: [[738, 428], [735, 486], [732, 542], [730, 590], [722, 642], [710, 696], [700, 748], [692, 794]],
  w: [[0, 96], [0.14, 62], [0.4, 46], [0.75, 38], [1, 32]],
});
const LEG = makeStroke({
  anchors: [[730, 590], [740, 650], [752, 710], [762, 758], [768, 796]],
  w: [[0, 32], [0.5, 28], [1, 30]],
});

export function createMelon(pictureLayer, sceneryLayer) {
  const [cx, cy] = MELON_AT;
  const root = svg('g', { class: 'da-melon-root', opacity: 0 }, pictureLayer);

  // 地面：只在小朋友脚下的一小段淡墨（不横贯画面），西瓜底下是椭圆淡影
  const ground = svg('g', { opacity: 0 }, root);
  const groundLine = svg('path', {
    d: 'M668 812 C 702 806 762 806 808 810',
    fill: 'none', stroke: '#5a5347', 'stroke-width': 6, 'stroke-linecap': 'round',
    opacity: 0.45, filter: 'url(#wash2)', pathLength: 1,
  }, ground);
  const melonShadow = svg('ellipse', { cx, cy: 858, rx: 208, ry: 25, fill: '#4a423a', opacity: 0, filter: 'url(#wash2)' }, root);
  const kidShadow = svg('ellipse', { cx: 734, cy: 806, rx: 64, ry: 12, fill: '#4a423a', opacity: 0, filter: 'url(#wash2)' }, root);

  // ---- 西瓜：几层淡彩的圆叠出体积，深绿条纹像经线，顶上一小卷藤 ----
  const melonG = svg('g', { class: 'da-melon' }, root);
  const defs = svg('defs', {}, melonG);
  const core = svg('radialGradient', { id: 'da-melon-core', cx: '.42', cy: '.36', r: '.75' }, defs);
  svg('stop', { offset: '0', 'stop-color': '#c3d6a0' }, core);
  svg('stop', { offset: '.55', 'stop-color': '#96ba74' }, core);
  svg('stop', { offset: '1', 'stop-color': '#6d9a54' }, core);
  const clipParent = svg('clipPath', { id: 'da-melon-clip' }, defs);
  svg('circle', { cx, cy, r: R - 3 }, clipParent);

  svg('circle', { cx, cy, r: R * 1.34, fill: '#cfe0b0', opacity: 0.24, filter: 'url(#glow)' }, melonG);
  svg('circle', { cx, cy, r: R * 1.03, fill: '#9dbb7e', opacity: 0.35, filter: 'url(#wash2)' }, melonG);
  svg('circle', { cx, cy, r: R, fill: 'url(#da-melon-core)', opacity: 0.88, filter: 'url(#wash1)' }, melonG);
  // 条纹：从顶到底的经线，中间的两条最宽，越靠边越窄
  const stripesG = svg('g', { 'clip-path': 'url(#da-melon-clip)' }, melonG);
  for (const [off, w] of [[-188, 13], [-112, 17], [-38, 22], [38, 21], [112, 17], [188, 13]]) {
    svg('path', {
      d: `M${(cx + off * 0.3).toFixed(0)} ${cy - R + 14} Q ${(cx + off * 1.12).toFixed(0)} ${cy} ${(cx + off * 0.3).toFixed(0)} ${cy + R - 14}`,
      fill: 'none', stroke: '#3c6b45', 'stroke-width': w, 'stroke-linecap': 'round',
      opacity: 0.5, filter: 'url(#wash1)',
    }, stripesG);
  }
  // 水彩干了以后，颜料在边缘积得更深
  svg('circle', { cx, cy, r: R * 0.985, fill: 'none', stroke: '#4a7350', 'stroke-width': 8, opacity: 0.4, filter: 'url(#wash1)' }, melonG);
  // 左上一点淡光
  svg('ellipse', { cx: cx - 92, cy: cy - 122, rx: 88, ry: 58, transform: `rotate(-32 ${cx - 92} ${cy - 122})`, fill: '#f2ecd8', opacity: 0.16 }, melonG);
  // 瓜蒂上一小卷藤和一片小叶
  const vine = svg('g', { class: 'da-vine', opacity: 0 }, melonG);
  svg('path', {
    d: `M${cx - 5} ${cy - R + 10} C ${cx - 30} ${cy - R - 24}, ${cx + 4} ${cy - R - 46}, ${cx + 20} ${cy - R - 30} C ${cx + 33} ${cy - R - 17}, ${cx + 17} ${cy - R - 4}, ${cx + 5} ${cy - R - 12}`,
    fill: 'none', stroke: '#3a332c', 'stroke-width': 6, 'stroke-linecap': 'round', filter: 'url(#ink)',
  }, vine);
  svg('path', {
    d: `M${cx + 22} ${cy - R - 24} q 24 -18 46 -3 q -16 18 -46 3 Z`,
    fill: '#5f7d4d', opacity: 0.85, filter: 'url(#ink)',
  }, vine);

  // ---- 小朋友：头身一笔（粗圆头是头）、右腿一笔、两条手臂 ----
  const kid = svg('g', { class: 'da-kid' }, root);
  const armR = svg('path', { fill: '#2a241e', 'data-part': 'armR' }, kid);
  const legP = svg('path', { fill: '#2a241e', 'data-part': 'leg' }, kid);
  const armL = svg('path', { fill: '#2a241e', 'data-part': 'armL' }, kid);
  const bodyP = svg('path', { fill: '#2a241e', 'data-part': 'body' }, kid);

  // 摸哪儿都算摸到：罩住西瓜和小朋友的透明形状。
  // 放在最上层再显式 pointer-events，不然点击会被瓜和小人自己的形状挡住
  // （先例的命中区建在最底层，真实点击落在主体上时常常无效——见验收报告）。
  const body = svg('g', { 'pointer-events': 'all' }, root);
  svg('ellipse', { cx, cy: cy + 10, rx: R + 52, ry: R + 48, fill: '#000', 'fill-opacity': 0 }, body);
  svg('ellipse', { cx: 736, cy: 626, rx: 176, ry: 252, fill: '#000', 'fill-opacity': 0 }, body);

  let armT = 0; // 手臂张开的程度：零是垂着，一是张开
  const armNow = (side, flap = 0) => mixStroke(mixStroke(side.droop, side.open, armT), side.flap, flap);
  const drawKid = ({ reveal = 1, flap = 0 } = {}) => {
    const rv = (t) => Math.max(0, Math.min(1, (reveal - t) / 0.26));
    bodyP.setAttribute('d', strokePath(BODY, rv(0)));
    legP.setAttribute('d', strokePath(LEG, rv(0.26)));
    armR.setAttribute('d', strokePath(armNow(POSE_R, flap), rv(0.52)));
    armL.setAttribute('d', strokePath(armNow(POSE_L, flap), rv(0.78)));
  };
  const clearKid = () => {
    for (const p of [bodyP, legP, armL, armR]) p.setAttribute('d', '');
  };

  // 滚动：横移 + 绕瓜心的旋转，滚动感来自条纹跟着转
  const roll = (dx, ang, dy = 0) =>
    melonG.setAttribute('transform', `translate(${dx.toFixed(1)} ${dy.toFixed(1)}) rotate(${ang.toFixed(1)} ${cx} ${cy})`);

  // 远处一座淡淡的大山（背景层坐标 1600×1000），finale 时浮现，呼应「大山」
  let scenery = null;
  const buildScenery = () => {
    sceneryLayer.replaceChildren();
    scenery = svg('g', { opacity: 0 }, sceneryLayer);
    const wash = svg('g', { filter: 'url(#mist-wash)', fill: '#3f4b50' }, scenery);
    svg('path', { d: 'M830 900 L 960 690 L 1030 760 L 1150 540 L 1270 740 L 1330 680 L 1450 900 Z', opacity: 0.2 }, wash);
    svg('path', { d: 'M700 900 L 790 780 L 880 900 Z', opacity: 0.12 }, wash);
    svg('path', { d: 'M1310 900 L 1400 800 L 1490 900 Z', opacity: 0.1 }, wash);
  };

  // 初始状态：收着
  roll(ROLL_FROM, 430);
  clearKid();
  let pulseToken = 0;

  return {
    root,
    body,
    // 小朋友当前的手臂几何，给字形变形起笔用（与画面重合，看起来没有切换）
    form: () => ({ armL: armNow(POSE_L), armR: armNow(POSE_R), body: BODY, leg: LEG }),
    // 西瓜滚进来，小朋友写出来，看到大西瓜惊喜地张开手臂
    async appear(check, { fast = false } = {}) {
      const f = fast ? 0.4 : 1;
      root.setAttribute('opacity', 1);
      // 地面和影子先洇开
      ground.setAttribute('opacity', 1);
      groundLine.setAttribute('stroke-dasharray', '1 1');
      groundLine.setAttribute('stroke-dashoffset', 1);
      const inkGround = tween(420 * f, (t) => {
        groundLine.setAttribute('stroke-dashoffset', String(1 - t));
        melonShadow.setAttribute('opacity', (t * 0.26).toFixed(2));
      }, { check });
      // 西瓜咕噜噜滚进来（转两圈多一点），落地轻轻一颠
      await tween(1600 * f, (t) => roll(lerp(ROLL_FROM, 0, t), lerp(430, 0, t)), { check, easing: ease.inOut });
      await Promise.all([
        inkGround,
        tween(300 * f, (t) => roll(0, 0, Math.sin(t * Math.PI) * 9), { check }),
      ]);
      // 瓜蒂的藤钻出来
      await tween(420 * f, (t) => vine.setAttribute('opacity', t.toFixed(2)), { check });
      // 小朋友像被一笔一笔写出来：头和身子、腿，两条垂着的手臂
      kidShadow.setAttribute('opacity', 0.22);
      armT = 0;
      kid.classList.add('breathing');
      await tween(1500 * f, (t) => drawKid({ reveal: t }), { check });
      // 看到这么大的瓜——张开手臂！
      await tween(760 * f, (t) => {
        armT = t;
        drawKid();
      }, { check, easing: ease.bloom });
      armT = 1;
      drawKid();
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity'));
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },
    // 摸一下：西瓜轻轻滚一滚，藤跟着颤，小朋友的手臂欢快地扇一扇
    async pulse() {
      const token = ++pulseToken;
      const alive = () => token === pulseToken;
      await tween(
        1200,
        (t) => {
          if (!alive()) return;
          const swing = Math.sin(t * Math.PI * 3) * (1 - t);
          roll(0, 7 * swing);
          drawKid({ flap: Math.abs(swing) * 0.85 });
        },
        { easing: ease.out },
      );
      if (!alive()) return;
      roll(0, 0);
      drawKid();
    },
    // 写完字：大山浮现在远处，西瓜和小朋友回到画面，压成一层淡影衬着字
    async finale(check) {
      root.setAttribute('opacity', 1);
      buildScenery();
      tween(1600, (t) => scenery.setAttribute('opacity', t), { check }).catch(() => {});
      // 干净地回来：不留地面线，西瓜已在位，小朋友快速重写一遍、张开手臂
      ground.setAttribute('opacity', 0);
      melonShadow.setAttribute('opacity', 0.22);
      kidShadow.setAttribute('opacity', 0.18);
      roll(0, 0);
      vine.setAttribute('opacity', 1);
      armT = 1;
      await tween(900, (t) => drawKid({ reveal: t }), { check });
      drawKid();
      kid.classList.add('breathing');
      await tween(900, (t) => root.setAttribute('opacity', lerp(1, 0.34, t)), { check });
    },
    reset() {
      pulseToken++;
      root.setAttribute('opacity', 0);
      ground.setAttribute('opacity', 0);
      groundLine.removeAttribute('stroke-dasharray');
      groundLine.removeAttribute('stroke-dashoffset');
      melonShadow.setAttribute('opacity', 0);
      kidShadow.setAttribute('opacity', 0);
      vine.setAttribute('opacity', 0);
      roll(ROLL_FROM, 430);
      kid.classList.remove('breathing');
      armT = 0;
      clearKid();
      sceneryLayer.replaceChildren();
      scenery = null;
    },
  };
}
