// 通用的一课流程：实物 → 各个古文字字形 → 楷书 → 笔顺 → 描红。
// 字由 ?c=<id> 选（src/app.js 已确认它在 data/lessons.json 里），每个字的画面在 src/chars/<id>/，接口见 src/chars/README.md。
// 当前场景写在 body[data-scene] 上，CSS 和 e2e 测试都靠它。
import { svg, tween, wait, newRun, Cancelled, lerp, FAST } from './util.js';
import { say, stopVoice, chime, softKnock, unlockAudio } from './audio.js';
import { createKaishu, createGhost } from './strokes.js';
import { startTrace, dataToClient } from './trace.js';
import { markDone } from './progress.js';

const $ = (id) => document.getElementById(id);
const stage = $('stage');
const layers = Object.fromEntries(
  ['picture', 'grid', 'ghost', 'morph', 'kaishu', 'trace', 'hint', 'stamp'].map((k) => [k, $(`${k}-layer`)]),
);
layers.scenery = $('scenery');

async function loadChar(id) {
  const [info, strokes] = await Promise.all(
    [`data/chars/${id}.json`, `data/chars/${id}.strokes.json`].map((u) => fetch(u).then((r) => r.json())),
  );
  return { ...info, ...strokes };
}

const id = new URLSearchParams(location.search).get('c');

const data = await loadChar(id);
document.title = `${data.char} · 交互式汉字`;
document.body.dataset.char = id;
let createLesson;
const css = (href) =>
  document.head.append(Object.assign(document.createElement('link'), { rel: 'stylesheet', href }));
// 有定制课目录就用定制画面，否则走通用课（词卡 → 楷书 → 笔顺 → 描红）。
// 先探一下文件，避免直接 import 404 在控制台刷错误。
const bespoke = await fetch(`src/chars/${id}/index.js`, { method: 'HEAD' }).then((r) => r.ok).catch(() => false);
if (bespoke) {
  ({ createLesson } = await import(`./chars/${id}/index.js`));
  css(`src/chars/${id}/style.css`);
} else {
  ({ createLesson } = await import('./generic.js'));
  css('src/generic.css');
}
const kaishu = createKaishu(layers.kaishu, data);
const ghost = createGhost(layers.grid, layers.ghost, data);
const lesson = createLesson({ layers, data, kaishu });
const { picture } = lesson;

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

// ---- 实物可以随时点：读这个字 ----
picture.body.setAttribute('data-testid', 'picture');
let onPictureTap = null;
// 实物还在出现、开场白还没说完时就摸了，也要算数
let earlyTap = false;
picture.body.addEventListener('click', () => {
  const scene = document.body.dataset.scene;
  if (scene !== 'picture' && scene !== 'done') return;
  picture.pulse();
  if (onPictureTap) return onPictureTap();
  if (scene === 'picture') earlyTap = true;
  say(id, 'sound');
});

// 等孩子摸实物；一直没摸就让它轻轻跳一下提醒，两次后自己往下走
async function waitForTap(check) {
  if (earlyTap) return say(id, 'sound');
  for (let i = 0; i < 3; i++) {
    const tapped = await new Promise((resolve) => {
      onPictureTap = () => resolve(true);
      wait(9000).then(() => resolve(false));
    });
    onPictureTap = null;
    check();
    if (tapped) return say(id, 'sound');
    if (i < 2) picture.pulse();
  }
}

// ---- 流程 ----
let stopTrace = null;

function resetAll() {
  stopTrace?.();
  stopTrace = null;
  onPictureTap = null;
  earlyTap = false;
  stopVoice();
  lesson.reset();
  kaishu.clear();
  ghost.hide(1);
  layers.stamp.replaceChildren();
  layers.trace.replaceChildren();
}

const both = (...ps) => Promise.all(ps);

async function story() {
  const check = newRun();
  resetAll();
  setScene('picture');
  await both(picture.appear(check), wait(600, check).then(() => say(id, 'intro')));
  check();
  await waitForTap(check);
  await wait(400, check);

  for (const form of data.forms) {
    setScene(form.id);
    stamp(form.label);
    await both(say(id, form.id), lesson.toForm(form.id, check));
    check();
  }
  await wait(500, check);

  setScene('order');
  await both(
    say(id, 'order'),
    (async () => {
      await lesson.fadeForms(0.12, 700, check);
      await kaishu.write(check, { speed: 0.9 });
      await lesson.fadeForms(0, 700, check);
    })(),
  );
  check();
  await say(id, 'sound');
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
      if (n === 2) say(id, 'retry');
    },
    onDone: () => finale(check).catch(ignoreCancel),
  });
  say(id, 'trace');
}

async function finale(check) {
  stopTrace?.();
  stopTrace = null;
  setScene('done');
  markDone(id);
  [523, 659, 784].forEach((f, i) => setTimeout(() => chime(f), i * 160));
  await wait(400, check);
  await both(ghost.hide(900), lesson.finale(check), say(id, 'done'));
}

function ignoreCancel(e) {
  if (!(e instanceof Cancelled)) throw e;
}

// ---- 按钮 ----
$('start').addEventListener('click', () => {
  unlockAudio();
  story().catch(ignoreCancel);
});
$('btn-home').addEventListener('click', () => {
  stopVoice();
  location.href = FAST ? './?fast' : './';
});
$('btn-replay').addEventListener('click', () => story().catch(ignoreCancel));
$('btn-write').addEventListener('click', () => trace().catch(ignoreCancel));
$('btn-sound').addEventListener('click', () => {
  if (Number(picture.root.getAttribute('opacity')) > 0.3) picture.pulse();
  say(id, 'sound');
});

// 给 e2e 测试用：把笔画数据坐标换成屏幕坐标
window.hz = { data, dataToClient: (x, y) => dataToClient(stage, x, y) };
setScene('start');
