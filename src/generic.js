// 通用课：没有定制画面的字走这里（main.js 在 src/chars/<id>/ 不存在时引入）。
// 流程：词卡（meaning + 拼音，水彩晕染打底）→ 楷书（笔画数据原样放大，
// 和描红底稿同一份轮廓，切到笔顺动画不会跳）→ 引擎接管笔顺和描红 →
// 完成：写好的字上方浮一圈淡彩光，词卡回到字下面。
// 数据格式见 data/chars/ 里通用字的 json（forms 固定为 kaishu 一项）。
import { svg, tween, ease, lerp } from './util.js';

const PALETTE = ['#c98a8a', '#d9a066', '#a8b5a0', '#7a9e9f', '#8e9ec9', '#c9b28a'];
const KAITI = 'STKaiti, KaiTi, Kaiti SC, serif';
const FLIP = 'translate(0 900) scale(1 -1)';

// 每个字固定一个淡彩色相，同一字每次打开颜色一致
function hue(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function createLesson({ layers, data }) {
  const color = hue(data.id);
  const chars = [...data.meaning];
  const size = Math.min(230, Math.round(760 / Math.max(2, chars.length)));
  const rx = Math.max(300, Math.min(420, size * chars.length * 0.62 + 50));

  // ---- 词卡（picture 层）。root 的 opacity 会被引擎读，保持 1；显隐用 pos ----
  const root = svg('g', { opacity: 1 }, layers.picture);
  const pos = svg('g', { transform: 'translate(512 470) scale(0.82)', opacity: 0 }, root);
  const breathe = svg('g', { class: 'hz-word-breath' }, pos);
  const pulseG = svg('g', {}, breathe);
  const halo = svg('ellipse', { cx: 0, cy: 20, rx: 520, ry: 380, fill: color, opacity: 0, filter: 'url(#glow)' }, pulseG);
  const card = svg('g', {}, pulseG);
  svg('ellipse', { cx: 0, cy: 6, rx, ry: rx * 0.72, fill: color, opacity: 0.3, filter: 'url(#wash1)' }, card);
  svg('ellipse', { cx: -rx * 0.2, cy: -rx * 0.14, rx: rx * 0.6, ry: rx * 0.44, fill: color, opacity: 0.24, filter: 'url(#wash2)' }, card);
  const word = svg('text', {
    x: 0, y: size * 0.35, 'text-anchor': 'middle',
    'font-size': size, 'font-family': KAITI, fill: '#2b2724',
  }, card);
  // 本字在词里用朱红标出，孩子先在词里看到它
  for (const c of chars) {
    const ts = svg('tspan', c === data.char ? { fill: '#b8352a' } : {}, word);
    ts.textContent = c;
  }
  const pinyin = svg('text', {
    x: 0, y: size * 0.92, 'text-anchor': 'middle',
    'font-size': Math.round(size * 0.32), 'font-family': 'Georgia, serif', fill: '#6b5a4c',
  }, card);
  pinyin.textContent = data.pinyin;

  const setPos = (y, s) => pos.setAttribute('transform', `translate(512 ${y}) scale(${s})`);

  // ---- 楷书字形（morph 层）：和引擎笔顺动画用的同一份笔画数据 ----
  const glyphRoot = svg('g', { opacity: 0 }, layers.morph);
  const glyphFlip = svg('g', { transform: FLIP }, glyphRoot);
  const glyphInner = svg('g', { transform: 'translate(512 512) scale(0.7) translate(-512 -512)' }, glyphFlip);
  for (const d of data.strokes) svg('path', { d, fill: '#221d1a' }, glyphInner);
  const setGlyph = (s) => glyphInner.setAttribute('transform', `translate(512 512) scale(${s}) translate(-512 -512)`);

  // 字形最低点（屏幕坐标）：完成后词卡放在它下面
  let glyphBottom = 860;
  for (const m of data.medians) for (const [, y] of m) glyphBottom = Math.max(glyphBottom, Math.min(890, 900 - y + 90));

  async function appear(check) {
    await tween(
      1500,
      (t) => {
        pos.setAttribute('opacity', Math.min(1, t * 1.8));
        setPos(470, lerp(0.82, 1, t));
      },
      { easing: ease.bloom, check },
    );
  }

  let pulsing = false;
  async function pulse() {
    if (pulsing) return;
    pulsing = true;
    const ring = svg('ellipse', {
      cx: 0, cy: 6, rx, ry: rx * 0.72, fill: 'none', stroke: color,
      'stroke-width': 10, opacity: 0.55, filter: 'url(#wash2)',
    }, pulseG);
    try {
      await tween(
        750,
        (t) => {
          pulseG.setAttribute('transform', `scale(${1 - 0.06 * Math.sin(t * Math.PI)})`);
          ring.setAttribute('rx', lerp(rx, rx * 1.4, t));
          ring.setAttribute('ry', lerp(rx * 0.72, rx * 1.05, t));
          ring.setAttribute('opacity', 0.55 * (1 - t));
        },
        { easing: ease.out },
      );
    } finally {
      ring.remove();
      pulseG.setAttribute('transform', '');
      pulsing = false;
    }
  }

  async function toForm(formId, check) {
    if (formId !== 'kaishu') throw new Error(`通用课不认识字形 ${formId}`);
    await Promise.all([
      tween(
        950,
        (t) => {
          pos.setAttribute('opacity', 1 - t);
          setPos(lerp(470, 380, t), lerp(1, 0.72, t));
        },
        { check },
      ),
      tween(
        1150,
        (t) => {
          glyphRoot.setAttribute('opacity', Math.min(1, t * 1.5));
          setGlyph(lerp(0.7, 1, t));
        },
        { easing: ease.bloom, check },
      ),
    ]);
  }

  async function fadeForms(to, ms, check) {
    const from = Number(glyphRoot.getAttribute('opacity'));
    await tween(ms, (t) => glyphRoot.setAttribute('opacity', lerp(from, to, t)), { check });
  }

  async function finale(check) {
    const wordY = Math.min(880, glyphBottom + 80);
    await Promise.all([
      tween(
        800,
        (t) => {
          pos.setAttribute('opacity', lerp(0, 0.95, t));
          setPos(lerp(380, wordY, t), lerp(0.72, 0.6, t));
        },
        { easing: ease.inOut, check },
      ),
      tween(1000, (t) => halo.setAttribute('opacity', 0.3 * t), { check }),
    ]);
  }

  function reset() {
    pos.setAttribute('opacity', 0);
    setPos(470, 0.82);
    pulseG.setAttribute('transform', '');
    halo.setAttribute('opacity', 0);
    glyphRoot.setAttribute('opacity', 0);
    setGlyph(0.7);
  }
  reset();

  return {
    picture: { root, body: card, appear, pulse },
    toForm,
    fadeForms,
    finale,
    reset,
  };
}
