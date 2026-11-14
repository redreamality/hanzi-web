// 旁白播放（预生成的 mp3）和用 WebAudio 合成的提示音。
import { FAST } from './util.js';

// 全程复用同一个 <audio>：iOS 只要它在第一次点击里播过，之后就能自动播放
const voice = new Audio();
let pending = null;

export function stopVoice() {
  voice.pause();
  pending?.();
  pending = null;
}

// 播放 audio/<字id>/<键>.mp3，播完（或失败、被打断）后 resolve
export function say(charId, key) {
  stopVoice();
  document.body.dataset.lastAudio = key;
  if (FAST) return Promise.resolve();
  return new Promise((resolve) => {
    const finish = () => {
      if (pending === finish) pending = null;
      resolve();
    };
    pending = finish;
    voice.onended = finish;
    voice.onerror = finish;
    voice.src = `audio/${charId}/${key}.mp3`;
    voice.play().catch(finish);
  });
}

let ctx;
function audioCtx() {
  ctx ??= new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// 像敲一下小磬：基音加两个泛音，快速衰减
export function chime(base = 660) {
  if (FAST) return;
  const ac = audioCtx();
  const t = ac.currentTime;
  for (const [mult, gain, decay] of [[1, 0.22, 1.6], [2.76, 0.07, 0.8], [5.4, 0.03, 0.4]]) {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.frequency.value = base * mult;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(g).connect(ac.destination);
    osc.start(t);
    osc.stop(t + decay);
  }
}

// 轻柔的「嗯？」：没写对时不批评，只是一个低低的木鱼声
export function softKnock() {
  if (FAST) return;
  const ac = audioCtx();
  const t = ac.currentTime;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(320, t);
  osc.frequency.exponentialRampToValueAtTime(180, t + 0.15);
  g.gain.setValueAtTime(0.18, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
  osc.connect(g).connect(ac.destination);
  osc.start(t);
  osc.stop(t + 0.3);
}

// 必须在用户手势里调用一次，iOS Safari 才允许之后出声
export function unlockAudio() {
  if (!FAST) audioCtx();
}
