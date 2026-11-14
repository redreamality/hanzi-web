// 通用小工具：建 SVG 元素、补间动画、可取消的流程。
// ?fast 让所有动画和语音几乎瞬间结束，供 e2e 测试使用。
export const FAST = new URLSearchParams(location.search).has('fast');
const SPEED = FAST ? 0.02 : 1;

const NS = 'http://www.w3.org/2000/svg';
export function svg(tag, attrs = {}, parent) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (parent) parent.appendChild(el);
  return el;
}

export const ease = {
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  out: (t) => 1 - (1 - t) ** 3,
  // 墨滴落纸：先快后慢，略微冲过头再回来
  bloom: (t) => 1 - (1 - t) ** 4 * Math.cos(t * 4.2),
};

export const lerp = (a, b, t) => a + (b - a) * t;

// 一次「播放」对应一个 run；换场景时旧 run 作废，等待中的步骤抛出 Cancelled
export class Cancelled extends Error {}
let current = 0;
export function newRun() {
  const id = ++current;
  return () => {
    if (id !== current) throw new Cancelled();
  };
}

export function wait(ms, check) {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      try {
        check?.();
        resolve();
      } catch (e) {
        reject(e);
      }
    }, ms * SPEED),
  );
}

// 每帧调用 onFrame(进度 0..1)；run 作废时停在原处
export function tween(ms, onFrame, { easing = ease.inOut, check } = {}) {
  return new Promise((resolve, reject) => {
    const dur = Math.max(1, ms * SPEED);
    const t0 = performance.now();
    const frame = (now) => {
      try {
        check?.();
      } catch (e) {
        return reject(e);
      }
      const p = Math.min(1, (now - t0) / dur);
      onFrame(easing(p), p);
      if (p < 1) requestAnimationFrame(frame);
      else resolve();
    };
    requestAnimationFrame(frame);
  });
}
