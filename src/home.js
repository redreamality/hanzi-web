// 首页：一张宣纸上摆着学过的字，点哪个字就读一声、进哪一课；还没做的字淡淡地排在后面。
// 孩子不认字，所以每张字卡只有字本身和拼音，写会了的盖一个小红印。
import { svg, FAST } from './util.js';
import { say } from './audio.js';
import { doneSet } from './progress.js';

const FLIP = 'translate(0 900) scale(1 -1)';

export const lessonUrl = (id) => `?c=${id}${FAST ? '&fast' : ''}`;

async function loadTile(id) {
  const [info, strokes] = await Promise.all(
    [`data/chars/${id}.json`, `data/chars/${id}.strokes.json`].map((u) => fetch(u).then((r) => r.json())),
  );
  return { ...info, ...strokes };
}

// 田字格里的楷书：直接用笔画轮廓，和课里写出来的字一模一样
function glyph(parent, data) {
  const s = svg('svg', { viewBox: '0 0 1024 1024', class: 'glyph', 'aria-hidden': 'true' }, parent);
  const grid = svg('g', { stroke: '#c0392b', fill: 'none', opacity: 0.35 }, s);
  svg('rect', { x: 40, y: 40, width: 944, height: 944, 'stroke-width': 8 }, grid);
  for (const d of ['M512 40V984', 'M40 512H984']) svg('path', { d, 'stroke-width': 5, 'stroke-dasharray': '22 18' }, grid);
  const ink = svg('g', { transform: FLIP, fill: '#221d1a', filter: 'url(#ink)' }, s);
  data.strokes.forEach((d) => svg('path', { d }, ink));
}

// 按可用宽高自适应列数与卡宽：11+ 张字卡也要一屏装下、不用滚动（横竖屏都算）
function fitShelf(shelf, n) {
  const home = document.getElementById('home');
  const title = home.querySelector('.title');
  const soon = home.querySelector('.soon-row');
  const gap = 24; // 卡片间距（与 CSS clamp 的常用值一致即可，这里只是布局估算）
  const availW = home.clientWidth - 96;
  if (availW <= 0 || home.clientHeight <= 0) return; // 还没显示（display:none），保持 CSS 默认
  const availH =
    home.clientHeight - title.offsetHeight - 96 -
    (soon.children.length ? soon.offsetHeight + 40 : 0);
  let best = { cols: n, tile: 0 };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const tile = Math.min(
      (availW - gap * (cols - 1)) / cols,
      (availH - gap * (rows - 1)) / rows / 1.22,
    );
    if (tile > best.tile) best = { cols, tile };
  }
  const tile = Math.max(96, Math.min(200, Math.floor(best.tile)));
  shelf.style.setProperty('--tile', `${tile}px`);
  shelf.style.gridTemplateColumns = `repeat(${best.cols}, var(--tile))`;
}

export async function showHome(lessons) {
  document.title = '交互式汉字';
  // 数据还没造好的字（注册了但 data/chars/<id>.json 缺失）不炸首页：降级留在「即将学」一排
  const settled = await Promise.allSettled(lessons.map(loadTile));
  const tiles = settled.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const built = new Set(tiles.map((t) => t.char));
  const upcoming = await fetch('data/upcoming.json').then((r) => r.json());
  const done = doneSet();

  const home = document.getElementById('home');
  const shelf = home.querySelector('.shelf');
  for (const data of tiles) {
    const b = Object.assign(document.createElement('button'), { className: 'tile' });
    b.dataset.testid = 'tile';
    b.dataset.char = data.id;
    b.setAttribute('aria-label', `${data.char}，${data.meaning}`);
    glyph(b, data);
    b.append(Object.assign(document.createElement('span'), { className: 'pinyin', textContent: data.pinyin }));
    if (done.has(data.id)) {
      b.dataset.done = '';
      b.append(Object.assign(document.createElement('span'), { className: 'seal', textContent: '会' }));
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
  for (const char of upcoming.filter((c) => !built.has(c))) {
    const s = Object.assign(document.createElement('span'), { className: 'soon', textContent: char });
    s.dataset.testid = 'tile-soon';
    s.setAttribute('aria-hidden', 'true');
    home.querySelector('.soon-row').append(s);
  }
  document.body.dataset.scene = 'home';
  fitShelf(shelf, tiles.length);
  onResize(shelf, tiles.length);
}

// 平板旋转时重排
function onResize(shelf, n) {
  if (onResize.bound) return;
  onResize.bound = () => fitShelf(shelf, n);
  window.addEventListener('resize', onResize.bound);
}
