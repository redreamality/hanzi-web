// 「天」的实物画面：一个小朋友站在草地上，仰着头看天，手臂张开——就是「大」的姿势；
// 头顶上好高好高的地方，飘着几朵淡淡的青云。
// 摸一下：小朋友踮起脚尖使劲仰望，云朵轻轻荡开。
// 远处的青云带和高天的光晕放在背景层（layers.scenery，1600×1000 坐标）。
import { svg, tween, wait, lerp, ease } from '../../util.js';
import { makeStroke, strokePath } from './stroke.js';

const FEET = [524, 842]; // 小朋友站的地方

// 仰望的姿势（屏幕坐标）：头偏向右上，两臂斜着张开上举，两腿站开
const POSE = {
  head: [536, 520],
  torso: { a: [[520, 566], [512, 640], [516, 714], [528, 776]], w: [[0, 54], [0.5, 60], [1, 48]] },
  armL: { a: [[514, 592], [456, 566], [398, 530], [350, 494]], w: [[0, 26], [1, 17]] },
  armR: { a: [[522, 590], [582, 566], [642, 534], [690, 498]], w: [[0, 26], [1, 17]] },
  legL: { a: [[518, 772], [488, 806], [452, 828], [430, 842]], w: [[0, 30], [0.5, 24], [1, 21]] },
  legR: { a: [[528, 772], [560, 804], [594, 828], [618, 842]], w: [[0, 30], [0.5, 24], [1, 21]] },
};

// 画面上的朵云：三层大小深浅不同的椭圆叠出水彩的云团
const CLOUD_INKS = [
  { fill: '#e6edef', op: 0.5, filter: 'url(#wash1)', dx: -10, dy: 4, k: 1.12 },
  { fill: '#c3d5dc', op: 0.42, filter: 'url(#wash2)', dx: 8, dy: 0, k: 0.92 },
  { fill: '#a8c0cc', op: 0.36, filter: 'url(#wash1)', dx: 0, dy: -8, k: 0.66 },
];
function cloudBlob(parent, [cx, cy], r, drift) {
  const g = svg('g', { opacity: 0, class: drift ? 'tian-cloud' : '' }, parent);
  for (const { fill, op, filter, dx, dy, k } of CLOUD_INKS) {
    svg('ellipse', { cx: cx + dx * r / 70, cy: cy + dy * r / 70, rx: r * 1.5 * k, ry: r * k, fill, opacity: op, filter }, g);
  }
  const set = (s) => g.setAttribute('transform', `translate(${cx} ${cy}) scale(${s}) translate(${-cx} ${-cy})`);
  set(0);
  return { g, set, async bloom(ms, check) {
    await tween(ms, (t) => {
      set(t);
      g.setAttribute('opacity', Math.min(1, t * 1.8));
    }, { easing: ease.bloom, check });
  } };
}

const scaleAt = (g, [ox, oy], s) => g.setAttribute('transform', `translate(${ox} ${oy}) scale(${s}) translate(${-ox} ${-oy})`);

export function createSky(pictureLayer, sceneryLayer) {
  const root = svg('g', { class: 'tian-sky', opacity: 0 }, pictureLayer);

  // 摸哪儿都算摸到：罩住小朋友和上面的云
  const body = svg('g', {}, root);
  svg('ellipse', { cx: 524, cy: 680, rx: 220, ry: 180, fill: '#000', 'fill-opacity': 0 }, body);
  svg('ellipse', { cx: 730, cy: 200, rx: 300, ry: 140, fill: '#000', 'fill-opacity': 0 }, body);

  // 脚下一小片淡淡的草影（局部短影，不横贯画面）
  const ground = svg('g', { opacity: 0 }, root);
  svg('ellipse', { cx: 524, cy: 840, rx: 120, ry: 14, fill: '#5a5347', opacity: 0.35, filter: 'url(#wash2)' }, ground);
  for (const [gx, gy, f] of [[418, 836, 1], [632, 838, -1]]) {
    svg('path', {
      d: `M${gx} ${gy} q ${6 * f} -14 ${13 * f} -16 M${gx + 5} ${gy} q ${2 * f} -10 ${8 * f} -12`,
      fill: 'none', stroke: '#6b6353', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.5,
    }, ground);
  }

  // 朵云：高高的天上，两大一小的青云
  const cloudsG = svg('g', {}, root);
  const clouds = [
    cloudBlob(cloudsG, [712, 196], 62, true),
    cloudBlob(cloudsG, [912, 132], 44, true),
    cloudBlob(cloudsG, [566, 300], 34, true),
  ];

  // ---- 小朋友：圆头、躯干、张开的两臂、两条腿，深墨勾勒加淡墨晕染 ----
  const personG = svg('g', { class: 'tian-person' }, root);
  const halo = svg('g', { opacity: 0, filter: 'url(#ink)' }, personG);
  const haloHead = svg('circle', { r: 34, fill: '#4a423a', opacity: 0.5 }, halo);
  const haloTorso = svg('path', { fill: '#4a423a', opacity: 0.4 }, halo);
  const shadow = svg('ellipse', { cx: 524, cy: 842, rx: 84, ry: 13, fill: '#4a423a', opacity: 0, filter: 'url(#wash2)' }, personG);
  const legLP = svg('path', { fill: '#2a241e', 'fill-opacity': 0.78 }, personG); // 远侧的腿淡一点
  const legRP = svg('path', { fill: '#2a241e' }, personG);
  const torsoP = svg('path', { fill: '#2a241e' }, personG);
  const armLP = svg('path', { fill: '#2a241e' }, personG);
  const armRP = svg('path', { fill: '#2a241e' }, personG);
  const headC = svg('circle', { r: 30, fill: '#2a241e' }, personG);

  const parts = { torso: makeStroke(POSE.torso), armL: makeStroke(POSE.armL), armR: makeStroke(POSE.armR), legL: makeStroke(POSE.legL), legR: makeStroke(POSE.legR) };
  // 把小朋友画出来：reveal 控制每个部件写出了多少
  const drawPerson = (reveal = 1) => {
    const rv = (k) => (typeof reveal === 'number' ? reveal : reveal[k] ?? 1);
    torsoP.setAttribute('d', strokePath(parts.torso, rv('torso')));
    armLP.setAttribute('d', strokePath(parts.armL, rv('armL')));
    armRP.setAttribute('d', strokePath(parts.armR, rv('armR')));
    legLP.setAttribute('d', strokePath(parts.legL, rv('legL')));
    legRP.setAttribute('d', strokePath(parts.legR, rv('legR')));
    const wide = (stroke, bias, k) => {
      const s = makeStroke({ a: stroke.a.map(([x, y]) => [x + bias, y]), w: stroke.w });
      return { ...s, ws: s.ws.map((v) => v * k) };
    };
    haloTorso.setAttribute('d', strokePath(wide(POSE.torso, -5, 1.3), rv('torso')));
    const hr = rv('head');
    headC.setAttribute('cx', POSE.head[0]);
    headC.setAttribute('cy', POSE.head[1]);
    haloHead.setAttribute('cx', POSE.head[0] - 4);
    haloHead.setAttribute('cy', POSE.head[1]);
    headC.setAttribute('opacity', String(Math.min(1, hr * 2)));
    headC.setAttribute('r', (30 * Math.max(0.3, hr)).toFixed(1));
  };
  drawPerson(0);

  // 远处的青云带和高天的光晕（背景坐标）
  let scenery = null;
  let skyGlow = null;
  let driftWisp = null; // 收尾时飘过的那朵小白云（挂在 pictureLayer 上，reset 时单独清）
  const buildScenery = () => {
    sceneryLayer.replaceChildren();
    const defs = svg('defs', {}, sceneryLayer);
    const grad = svg('radialGradient', { id: 'tian-sky', cx: '.5', cy: '.4', r: '.7' }, defs);
    svg('stop', { offset: 0, 'stop-color': '#e2ecee', 'stop-opacity': 0.9 }, grad);
    svg('stop', { offset: 0.6, 'stop-color': '#c2d6dd', 'stop-opacity': 0.4 }, grad);
    svg('stop', { offset: 1, 'stop-color': '#a8c0cc', 'stop-opacity': 0 }, grad);
    scenery = svg('g', { opacity: 0 }, sceneryLayer);
    const wash = svg('g', { filter: 'url(#mist-wash)', fill: '#7d97a8' }, scenery);
    svg('path', {
      d: 'M150 330 C 330 260 520 285 700 272 C 900 258 1080 292 1240 322 C 1060 352 850 330 660 342 C 480 353 300 356 150 330 Z',
      opacity: 0.16,
    }, wash);
    svg('path', {
      d: 'M320 200 C 470 150 640 172 800 160 C 960 148 1100 168 1230 196 C 1090 226 920 208 760 218 C 600 228 450 230 320 200 Z',
      opacity: 0.11,
    }, wash);
    skyGlow = svg('ellipse', { cx: 800, cy: 260, rx: 660, ry: 240, fill: 'url(#tian-sky)', opacity: 0 }, scenery);
  };

  let pulseToken = 0;

  // 小朋友像被一笔一笔写出来：躯干、头、两臂、两腿
  async function writePerson(check, f = 1) {
    personG.classList.remove('breathing');
    const reveal = { torso: 0, head: 0, armL: 0, armR: 0, legL: 0, legR: 0 };
    await tween(560 * f, (t) => { reveal.torso = t; drawPerson(reveal); }, { check });
    await tween(300 * f, (t) => { reveal.head = t; drawPerson(reveal); }, { check });
    await Promise.all([
      tween(420 * f, (t) => { reveal.armL = t; drawPerson(reveal); }, { check }),
      tween(420 * f, (t) => { reveal.armR = t; drawPerson(reveal); }, { check }),
    ]);
    await Promise.all([
      tween(420 * f, (t) => { reveal.legL = t; drawPerson(reveal); }, { check }),
      tween(420 * f, (t) => { reveal.legR = t; drawPerson(reveal); }, { check }),
    ]);
    drawPerson();
    personG.classList.add('breathing');
    tween(600 * f, (t) => {
      halo.setAttribute('opacity', (t * 0.55).toFixed(2));
      shadow.setAttribute('opacity', (t * 0.3).toFixed(2));
      ground.setAttribute('opacity', String(t));
    }, { check }).catch(() => {});
  }

  return {
    root,
    body,
    // 天空洇开，青云一朵朵绽开，小朋友从脚下被一笔一笔写出来
    async appear(check) {
      root.setAttribute('opacity', 1);
      buildScenery();
      tween(2200, (t) => scenery.setAttribute('opacity', t), { check }).catch(() => {});
      tween(2400, (t) => skyGlow.setAttribute('opacity', (t * 0.4).toFixed(2)), { check }).catch(() => {});
      await Promise.all([
        writePerson(check),
        (async () => {
          for (let i = 0; i < clouds.length; i++) {
            await wait(i * 260, check);
            await clouds[i].bloom(700, check);
          }
        })(),
      ]);
    },
    // 天色亮一层：天青的光晕洇开——组字、变楷书时用它衬「天越来越清楚」
    async brighten(k, ms, check) {
      const from = Number(skyGlow.getAttribute('opacity')) || 0;
      await tween(ms, (t) => skyGlow.setAttribute('opacity', lerp(from, k, t).toFixed(2)), { check });
    },
    async fadeTo(opacity, ms, check) {
      const from = Number(root.getAttribute('opacity'));
      await tween(ms, (t) => root.setAttribute('opacity', lerp(from, opacity, t)), { check });
    },
    // 摸一下：小朋友踮起脚尖使劲往上看，云朵轻轻荡开
    async pulse() {
      const token = ++pulseToken;
      const alive = () => token === pulseToken;
      await tween(
        1000,
        (t) => {
          if (!alive()) return;
          const lift = Math.sin(t * Math.PI);
          personG.setAttribute('transform', `translate(0 ${(-9 * lift).toFixed(1)})`);
          scaleAt(cloudsG, [730, 200], 1 + 0.04 * lift);
        },
        { easing: ease.out },
      );
      if (!alive()) return;
      personG.setAttribute('transform', '');
      scaleAt(cloudsG, [730, 200], 1);
      // 最近的那朵云荡开一圈淡淡的青晕
      const ring = svg('ellipse', { cx: 712, cy: 196, rx: 70, ry: 30, fill: 'none', stroke: '#a8c0cc', 'stroke-width': 10, opacity: 0.5, 'stroke-linecap': 'round' }, root);
      await tween(900, (t) => {
        if (!alive()) return;
        ring.setAttribute('rx', lerp(70, 230, t).toFixed(1));
        ring.setAttribute('ry', lerp(30, 90, t).toFixed(1));
        ring.setAttribute('opacity', (0.5 * (1 - t)).toFixed(3));
      });
      ring.remove();
    },
    // 字写好了：天大亮，高天一片青白，小朋友又被写出来，继续仰头看天；
    // 一朵干净的小白云从写好的「天」头顶上缓缓飘过
    async finale(check) {
      root.setAttribute('opacity', 1);
      buildScenery();
      tween(1000, (t) => scenery.setAttribute('opacity', t * 0.95), { check }).catch(() => {});
      tween(1400, (t) => skyGlow.setAttribute('opacity', (t * 0.75).toFixed(2)), { check }).catch(() => {});
      clouds.forEach((c) => { c.set(1); c.g.setAttribute('opacity', 1); });
      await Promise.all([
        writePerson(check, 0.45),
        clouds[1].bloom(600, check),
      ]);
      await tween(900, (t) => root.setAttribute('opacity', lerp(1, 0.36, t)), { check });
      const wisp = svg('g', { opacity: 0 }, pictureLayer);
      driftWisp = wisp;
      for (const [dx, dy, rx, ry, op] of [[0, 0, 46, 17, 0.85], [30, -4, 30, 13, 0.7], [-28, 3, 26, 11, 0.6]]) {
        svg('ellipse', { cx: 220 + dx, cy: 96 + dy, rx, ry, fill: '#eef4f5', opacity: op }, wisp);
      }
      await tween(
        3600,
        (t) => {
          wisp.setAttribute('opacity', Math.min(1, t * 4) * (1 - Math.max(0, t - 0.85) * 6.6));
          wisp.setAttribute('transform', `translate(${(600 * t).toFixed(1)} ${(-10 * Math.sin(t * Math.PI)).toFixed(1)})`);
        },
        { check },
      );
      wisp.remove();
      if (driftWisp === wisp) driftWisp = null;
    },
    reset() {
      pulseToken++;
      root.setAttribute('opacity', 0);
      driftWisp?.remove();
      driftWisp = null;
      personG.classList.remove('breathing');
      personG.setAttribute('transform', '');
      drawPerson(0);
      halo.setAttribute('opacity', 0);
      shadow.setAttribute('opacity', 0);
      ground.setAttribute('opacity', 0);
      for (const c of clouds) {
        c.set(0);
        c.g.setAttribute('opacity', 0);
      }
      scaleAt(cloudsG, [730, 200], 1);
      sceneryLayer.replaceChildren();
      scenery = null;
      skyGlow = null;
    },
  };
}
