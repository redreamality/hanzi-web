// 手指描红：按笔顺一笔一笔写，写对的那一笔会变成漂亮的楷书墨迹。
import { svg, tween, lerp } from './util.js';
import { judgeStroke } from './strokes.js';

// 屏幕坐标 → 舞台坐标（y 朝下）→ 笔画数据坐标（y 朝上）
export function clientToData(stage, x, y) {
  const p = new DOMPoint(x, y).matrixTransform(stage.getScreenCTM().inverse());
  return [p.x, 900 - p.y];
}
export function dataToClient(stage, x, y) {
  const p = new DOMPoint(x, 900 - y).matrixTransform(stage.getScreenCTM());
  return [p.x, p.y];
}

export function startTrace({ stage, traceLayer, hintLayer, kaishu, data, onStroke, onMiss, onDone }) {
  let index = 0;
  let misses = 0;
  let points = null;
  let line = null;
  let guideAnim = 0;

  const hint = svg('g', { 'data-testid': 'hint' }, hintLayer);

  const showHint = () => {
    hint.replaceChildren();
    if (index >= data.medians.length) return;
    const m = data.medians[index];
    // 一条淡红虚线标出走向，起点一个跳动的小红点
    svg('path', {
      d: m.map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${900 - y}`).join(''),
      fill: 'none',
      stroke: '#c0392b',
      'stroke-width': 6,
      'stroke-dasharray': '4 22',
      'stroke-linecap': 'round',
      opacity: 0.6,
    }, hint);
    svg('circle', { cx: m[0][0], cy: 900 - m[0][1], r: 30, fill: '#c0392b', class: 'start-dot', 'data-testid': 'start-dot' }, hint);
    document.body.dataset.strokeIndex = String(index);
  };

  // 写错两次后：一个小墨点沿着这一笔慢慢走一遍，示范给孩子看
  const demo = async () => {
    const id = ++guideAnim;
    const m = data.medians[index];
    const dot = svg('circle', { r: 22, fill: '#221d1a', opacity: 0.8 }, hint);
    const segs = m.length - 1;
    await tween(1600, (t) => {
      if (id !== guideAnim) return;
      const f = t * segs;
      const i = Math.min(segs - 1, Math.floor(f));
      const k = f - i;
      dot.setAttribute('cx', lerp(m[i][0], m[i + 1][0], k));
      dot.setAttribute('cy', 900 - lerp(m[i][1], m[i + 1][1], k));
    });
    dot.remove();
  };

  const toStage = (e) => {
    const [x, y] = clientToData(stage, e.clientX, e.clientY);
    return [x, y];
  };

  const down = (e) => {
    if (index >= data.medians.length) return;
    e.preventDefault();
    stage.setPointerCapture?.(e.pointerId);
    points = [toStage(e)];
    line = svg('path', {
      fill: 'none',
      stroke: '#221d1a',
      'stroke-width': 46,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      opacity: 0.85,
    }, traceLayer);
  };

  const move = (e) => {
    if (!points) return;
    points.push(toStage(e));
    line.setAttribute('d', points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${(900 - y).toFixed(1)}`).join(''));
  };

  const up = async () => {
    if (!points) return;
    const pts = points;
    const drawn = line;
    points = null;
    line = null;
    const result = judgeStroke(pts, data.medians[index]);
    if (result.ok) {
      guideAnim++;
      drawn.remove();
      const i = index++;
      misses = 0;
      showHint();
      onStroke?.(i);
      await kaishu.writeStroke(i);
      if (index === data.medians.length) {
        hint.replaceChildren();
        onDone?.();
      }
    } else {
      misses++;
      onMiss?.(misses, result.reason);
      await tween(450, (t) => drawn.setAttribute('opacity', 0.85 * (1 - t)));
      drawn.remove();
      if (misses >= 2) demo();
    }
  };

  stage.addEventListener('pointerdown', down);
  stage.addEventListener('pointermove', move);
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
  kaishu.clear();
  showHint();

  return function stop() {
    guideAnim++;
    stage.removeEventListener('pointerdown', down);
    stage.removeEventListener('pointermove', move);
    stage.removeEventListener('pointerup', up);
    stage.removeEventListener('pointercancel', up);
    hint.remove();
    traceLayer.replaceChildren();
    delete document.body.dataset.strokeIndex;
  };
}
