// 「日」的完整一课：太阳 → 甲骨文 → 小篆 → 楷书 → 笔顺 → 描红。
// 当前场景写在 body[data-scene] 上，CSS 和 e2e 测试都靠它。
import { svg, tween, wait, newRun, Cancelled, lerp } from './util.js';
import { say, stopVoice, chime, softKnock, unlockAudio } from './audio.js';
import { createSun } from './sun.js';
import { createMorph } from './morph.js';
import { createKaishu, createGhost } from './strokes.js';
import { startTrace, dataToClient } from './trace.js';

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const layers = Object.fromEntries(
  ['sun', 'grid', 'ghost', 'morph', 'kaishu', 'trace', 'hint', 'stamp'].map((k) => [k, $(`${k}-layer`)]),
);

async function loadChar(id) {
  const [info, strokes] = await Promise.all(
    [`data/chars/${id}.json`, `data/chars/${id}.strokes.json`].map((u) => fetch(u).then((r) => r.json())),
  );
  return { ...info, ...strokes };
}

const data = await loadChar('ri');
const sun = createSun(layers.sun);
const morph = createMorph(layers.morph);
const kaishu = createKaishu(layers.kaishu, data);
const ghost = createGhost(layers.grid, layers.ghost, data);

const setScene = (name) => (document.body.dataset.scene = name);
const NOTES = [523, 587, 659, 784, 880];

// ---- 朱红印章：竖排标出当前是哪种字体 ----
async function stamp(label) {
  const old = [...layers.stamp.children];
  old.forEach((el) => tween(400, (t) => el.setAttribute('opacity', 1 - t)).then(() => el.remove()));
  const chars = [...label];
  const h = chars.length * 64 + 24;
  const g = svg('g', { opacity: 0, transform: 'translate(842 150) rotate(-3)', 'data-testid': 'stamp', 'data-label': label }, layers.stamp);
  svg('rect', { x: 0, y: 0, width: 84, height: h, rx: 8, fill: '#b8352a', filter: 'url(#ink)' }, g);
  chars.forEach((c, i) => {
    const t = svg('text', {
      x: 42, y: 70 + i * 64, 'text-anchor': 'middle', 'font-size': 52, fill: '#f6eddc',
      'font-family': 'STKaiti, KaiTi, Kaiti SC, serif',
    }, g);
    t.textContent = c;
  });
  await tween(500, (t) => {
    g.setAttribute('opacity', t);
    g.setAttribute('transform', `translate(842 150) rotate(-3) scale(${lerp(1.25, 1, t)})`);
  });
}

// ---- 太阳可以随时点：说「日」 ----
let onSunTap = null;
// 太阳还在洇开、开场白还没说完时就摸了，也要算数
let earlyTap = false;
sun.body.addEventListener('click', () => {
  const scene = document.body.dataset.scene;
  if (scene !== 'sun' && scene !== 'done') return;
  sun.pulse();
  if (onSunTap) return onSunTap();
  if (scene === 'sun') earlyTap = true;
  say(data.id, 'sound');
});

// 等孩子摸太阳；一直没摸就让太阳轻轻跳一下提醒，两次后自己往下走
async function waitForSunTap(check) {
  if (earlyTap) return say(data.id, 'sound');
  for (let i = 0; i < 3; i++) {
    const tapped = await new Promise((resolve) => {
      onSunTap = () => resolve(true);
      wait(9000).then(() => resolve(false));
    });
    onSunTap = null;
    check();
    if (tapped) return say(data.id, 'sound');
    if (i < 2) sun.pulse();
  }
}

// ---- 流程 ----
let stopTrace = null;

function resetAll() {
  stopTrace?.();
  stopTrace = null;
  onSunTap = null;
  earlyTap = false;
  stopVoice();
  sun.reset();
  morph.reset();
  kaishu.clear();
  ghost.hide(1);
  layers.stamp.replaceChildren();
  layers.trace.replaceChildren();
}

const both = (...ps) => Promise.all(ps);

async function story() {
  const check = newRun();
  resetAll();
  setScene('sun');
  await both(sun.bloom(check), wait(600, check).then(() => say(data.id, 'intro')));
  check();
  await waitForSunTap(check);
  await wait(400, check);

  setScene('oracle');
  stamp('甲骨文');
  await both(say(data.id, 'oracle'), morph.drawOracle(check).then(() => sun.fadeTo(0.1, 1600, check)));
  check();

  setScene('seal');
  stamp('小篆');
  await both(say(data.id, 'seal'), morph.to('seal', 2800, check));
  check();

  setScene('kaishu');
  stamp('楷书');
  await both(say(data.id, 'kaishu'), morph.to('kaishu', 2400, check));
  check();
  await wait(500, check);

  setScene('order');
  await both(
    say(data.id, 'order'),
    (async () => {
      await morph.fadeTo(0.12, 700, check);
      await kaishu.write(check, { speed: 0.9 });
      await morph.fadeTo(0, 700, check);
    })(),
  );
  check();
  await say(data.id, 'sound');
  await wait(1200, check);
  return trace();
}

async function trace() {
  const check = newRun();
  resetAll();
  setScene('trace');
  await ghost.show(900);
  check();
  stopTrace = startTrace({
    stage,
    traceLayer: layers.trace,
    hintLayer: layers.hint,
    kaishu,
    data,
    onStroke: (i) => {
      stopVoice();
      chime(NOTES[i % NOTES.length]);
    },
    onMiss: (n) => {
      softKnock();
      if (n === 2) say(data.id, 'retry');
    },
    onDone: () => finale(check).catch(ignoreCancel),
  });
  say(data.id, 'trace');
}

async function finale(check) {
  stopTrace?.();
  stopTrace = null;
  setScene('done');
  [523, 659, 784].forEach((f, i) => setTimeout(() => chime(f), i * 160));
  await wait(400, check);
  // 字写好了，太阳在字后面重新洇开
  await both(ghost.hide(900), sun.bloom(check).then(() => sun.fadeTo(0.4, 900, check)), say(data.id, 'done'));
}

function ignoreCancel(e) {
  if (!(e instanceof Cancelled)) throw e;
}

// ---- 按钮 ----
$('start').addEventListener('click', () => {
  unlockAudio();
  story().catch(ignoreCancel);
});
$('btn-replay').addEventListener('click', () => story().catch(ignoreCancel));
$('btn-write').addEventListener('click', () => trace().catch(ignoreCancel));
$('btn-sound').addEventListener('click', () => {
  if (Number(sun.root.getAttribute('opacity')) > 0.3) sun.pulse();
  say(data.id, 'sound');
});

// 给 e2e 测试用：把笔画数据坐标换成屏幕坐标
window.hz = { data, dataToClient: (x, y) => dataToClient(stage, x, y) };
setScene('start');
