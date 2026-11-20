// 首页：学过的字排成字卡（最新的在最后），下一课的字卡亮着等孩子来点，
// 再往后要学的字淡淡排成一排。字卡先用楷体大字显示，滚进视野后再换成
// 和课里写出来一模一样的笔画字形（按需拉 strokes.json，首屏只请求 index 一个文件）。
// 孩子不认字，所以每张字卡只有字本身和拼音，写会了的盖一个小红印。
import { svg, FAST } from './util.js';
import { say } from './audio.js';
import { doneSet } from './progress.js';

const FLIP = 'translate(0 900) scale(1 -1)';
const MAX_DONE_TILES = 16;
const MAX_SOON = 16;

export const lessonUrl = (id) => `?c=${id}${FAST ? '&fast' : ''}`;

// 田字格 + 大字。先放楷体字，有需要再换成笔画轮廓
function makeGlyph(parent, data) {
  const s = svg('svg', { viewBox: '0 0 1024 1024', class: 'glyph', 'aria-hidden': 'true' }, parent);
  const grid = svg('g', { stroke: '#c0392b', fill: 'none', opacity: 0.35 }, s);
  svg('rect', { x: 40, y: 40, width: 944, height: 944, 'stroke-width': 8 }, grid);
  for (const d of ['M512 40V984', 'M40 512H984']) svg('path', { d, 'stroke-width': 5, 'stroke-dasharray': '22 18' }, grid);
  const holder = svg('g', {}, s);
  const t = svg('text', {
    x: 512, y: 742, 'text-anchor': 'middle', 'font-size': 660,
    'font-family': 'STKaiti, KaiTi, Kaiti SC, serif', fill: '#221d1a',
  }, holder);
  t.textContent = data.char;
  let upgraded = false;
  return {
    el: s,
    async upgrade() {
      if (upgraded) return;
      upgraded = true;
      try {
        const { strokes } = await fetch(`data/chars/${data.id}.strokes.json`).then((r) => r.json());
        holder.replaceChildren();
        const ink = svg('g', { transform: FLIP, fill: '#221d1a', filter: 'url(#ink)' }, holder);
        for (const d of strokes) svg('path', { d }, ink);
      } catch {
        upgraded = false; // 网络抖动就下次再试，楷体字也够用
      }
    },
  };
}

// 字卡大小随数量自适应：一屏放下，不用滚动
function fitShelf(shelf, n) {
  if (!n) return;
  const home = document.getElementById('home');
  const availW = (shelf.clientWidth || home.clientWidth * 0.94) - 8;
  const availH = home.clientHeight * 0.52;
  let tile = 76;
  for (let t = 210; t >= 76; t -= 2) {
    const cols = Math.max(1, Math.floor(availW / (t + 16)));
    const rows = Math.ceil(n / cols);
    if (rows * (t * 1.24 + 16) <= availH) {
      tile = t;
      break;
    }
  }
  shelf.style.setProperty('--tile', `${tile}px`);
}

export async function showHome(lessons) {
  void lessons; // 兼容旧签名；现在一律从 index.json 读
  document.title = '交互式汉字';
  const [index, upcoming] = await Promise.all([
    fetch('data/index.json').then((r) => r.json()),
    fetch('data/upcoming.json').then((r) => r.json()),
  ]);
  const done = doneSet();
  const known = index.filter((x) => done.has(x.id));
  const nextIdx = index.findIndex((x) => !done.has(x.id));
  const next = nextIdx >= 0 ? index[nextIdx] : null;

  const home = document.getElementById('home');
  const shelf = home.querySelector('.shelf');
  shelf.replaceChildren();
  const glyphs = [];
  const tiles = [...known.slice(-MAX_DONE_TILES)];
  if (next) tiles.push(next);
  for (const data of tiles) {
    const isNext = data === next;
    const b = Object.assign(document.createElement('button'), { className: `tile${isNext ? ' next' : ''}` });
    b.dataset.testid = 'tile';
    b.dataset.char = data.id;
    b.setAttribute('aria-label', `${isNext ? '下一课：' : ''}${data.char}，${data.meaning}`);
    glyphs.push({ glyph: makeGlyph(b, data), el: b });
    b.append(Object.assign(document.createElement('span'), { className: 'pinyin', textContent: data.pinyin }));
    if (!isNext) {
      b.dataset.done = '';
      b.append(Object.assign(document.createElement('span'), { className: 'seal', textContent: '会' }));
    } else {
      b.append(Object.assign(document.createElement('span'), { className: 'tag', textContent: '下一课' }));
    }
    b.addEventListener('click', async () => {
      if (home.dataset.leaving) return;
      home.dataset.leaving = data.id;
      b.classList.add('picked');
      await say(data.id, 'sound');
      location.href = lessonUrl(data.id);
    });
    shelf.append(b);
  }

  const soonRow = home.querySelector('.soon-row');
  soonRow.replaceChildren();
  const soonChars = next
    ? [...index.slice(nextIdx + 1).map((x) => x.char), ...upcoming].slice(0, MAX_SOON)
    : upcoming.slice(0, MAX_SOON);
  for (const char of soonChars) {
    const s = Object.assign(document.createElement('span'), { className: 'soon', textContent: char });
    s.dataset.testid = 'tile-soon';
    s.setAttribute('aria-hidden', 'true');
    soonRow.append(s);
  }

  document.body.dataset.scene = 'home';
  fitShelf(shelf, tiles.length);
  const refit = () => fitShelf(shelf, tiles.length);
  window.addEventListener('resize', refit);

  // 进视野的字卡才换笔画字形，一次最多补几张，首页始终秒开
  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      io.unobserve(en.target);
      const g = glyphs.find((x) => x.el === en.target);
      g?.glyph.upgrade();
    }
  }, { root: home, rootMargin: '120px' });
  for (const { el } of glyphs) io.observe(el);
}
