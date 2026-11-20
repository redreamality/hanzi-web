// 生成 1000 字学习计划 data/sources/plan-1000.json。
// 输入：junda 字频表（选字）、cjk-decomp 拆字表（合体字排在部件后面）、
//       data/lessons.json 里已有的定制课（日月木人，保持原有 id 和顺序）。
// 输出条目：{ id, char, reading, pinyin, rank, stage, bespoke }
//   id      = 拼音（小写字母）+ 声调数字（轻声不带数字），重名加 b/c/d…
//   reading = 数字声调形式（如 "di4"、"de"），数据生成时必须照抄
//   pinyin  = 带声调符号（如 "dì"），来自 reading 的机械转换
import { readFileSync, writeFileSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pinyin } from 'pinyin-pro';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOTAL = 1000;
const STAGE = 50;

// 儿童不宜的字（字频表前 1000 里几乎不会出现，保险起见排除）
const EXCLUDE = new Set(['杀', '奸', '赌', '匪']);
// junda 的首选读音不适合 3-8 岁教学、或是错音的字：改成教学读音（2026-11-19
// 由 25 个校对 agent 逐字复核后汇总，都是该字的真实常用读音）。
const READING_OVERRIDE = {
  // 原有判断
  地: 'di4', 着: 'zhe', 漂: 'piao4', 累: 'lei4', 重: 'zhong4',
  // junda 首读音是错音（该字没有这个读法）
  特: 'te4', 与: 'yu3', 只: 'zhi1', 底: 'di3', 从: 'cong2', 读: 'du2',
  胜: 'sheng4', 予: 'yu3', 吗: 'ma', 么: 'me', 委: 'wei3', 说: 'shuo1', 块: 'kuai4',
  那: 'na4', 困: 'kun4',
  // 读音真实，但儿童生活里用的是另一个音
  看: 'kan4', 行: 'xing2', 正: 'zheng4', 提: 'ti2', 几: 'ji3', 论: 'lun4',
  打: 'da3', 更: 'geng4', 石: 'shi2', 约: 'yue1', 号: 'hao4', 尽: 'jin4',
  片: 'pian4', 校: 'xiao4', 区: 'qu1', 据: 'ju4', 单: 'dan1', 罗: 'luo2',
  陆: 'lu4', 要: 'yao4', 散: 'san4', 禁: 'jin4', 合: 'he2',
  // 2026-11-19 二次复核：junda 首读音是低频音，儿童常用另一个音
  称: 'cheng1', 奇: 'qi2', 丽: 'li4', 渐: 'jian4',
  占: 'zhan4', 处: 'chu4', 调: 'tiao2', 落: 'luo4', 弹: 'tan2', 创: 'chuang4',
  吧: 'ba', 啊: 'a',
};

// ---- junda 字频表 ----
const freqRaw = readFileSync(join(root, 'data/sources/frequencyjunda.txt.js'), 'utf8')
  .replace(/^[\s\S]*?module\.exports\s*=\s*`/, ''); // 第一行和声明同行，先剥掉前缀
const freqLines = freqRaw.split('\n').filter((l) => /^\d+\t/.test(l));
const freq = freqLines.map((l) => {
  const [rank, char, , , readings] = l.split('\t');
  return { rank: Number(rank), char, readings: readings.split('/') };
});

// ---- 拆字表：字 -> 直接部件（只认部件本身是字的 a()/d() 行）----
const decompRaw = readFileSync(join(root, 'data/sources/cjk-decomp.txt.js'), 'utf8');
const decomp = new Map();
for (const m of decompRaw.matchAll(/^(\S+):(?:a|d)\(([^)]*)\)$/gm)) {
  const [, key, inner] = m;
  if (!/^[㐀-鿿豈-﫿]$/.test(key)) continue; // 键必须是单个汉字
  const parts = inner.split(',').filter((p) => /^[㐀-鿿豈-﫿]$/.test(p));
  if (parts.length) decomp.set(key, parts);
}

// ---- 已有定制课：保持 id 和顺序 ----
const lessons = JSON.parse(readFileSync(join(root, 'data/lessons.json'), 'utf8'));
const plan = [];
const seen = new Set();
for (const id of lessons) {
  const info = JSON.parse(readFileSync(join(root, 'data/chars', `${id}.json`), 'utf8'));
  plan.push({ id, char: info.char, reading: '', pinyin: info.pinyin, rank: 0, bespoke: true });
  seen.add(info.char);
}

// ---- 按字频选出 TOTAL 个字 ----
const hwzRoot = join(root, 'node_modules/hanzi-writer-data');
for (const { rank, char, readings } of freq) {
  if (plan.length >= TOTAL) break;
  if (seen.has(char) || EXCLUDE.has(char) || !/^[一-鿿]$/.test(char)) continue;
  if (!existsSync(join(hwzRoot, `${char}.json`))) continue; // 没有笔画数据的字做不了课
  const fixReading = (r) => r.replace(/u:/g, 'v').replace(/^([ln])ue(\d?)$/, '$1ve$2'); // ü 的各种写法统一成 v
  plan.push({ rank, char, reading: fixReading(READING_OVERRIDE[char] || readings[0]) });
  seen.add(char);
}
if (plan.length !== TOTAL) throw new Error(`只选到 ${plan.length} 个字`);

// ---- 合体字排在部件后面：以字频顺序为基准做拓扑排序 ----
// 每一步选「部件都已出场」的字里字频最高的一个；部件不在字表里的不算约束。
// 拆字表偶有环，兜底：谁都不满足时取当前字频最高的。
{
  const rest = plan.slice(lessons.length); // 定制课固定在最前
  const done = plan.slice(0, lessons.length);
  const emitted = new Set(done.map((e) => e.char));
  const remaining = rest.map((e, i) => ({ ...e, order: i })).sort((a, b) => a.order - b.order); // order = 字频序
  const inList = seen;
  const rank = new Map(plan.map((e) => [e.char, e.rank || 0]));
  // 部件比本字晚 150 名以上就不等它了（如「最」不等「取」），否则常用字会被拖得太远
  const GAP = 150;
  const depsOf = new Map(remaining.map((e) => [
    e.char,
    (decomp.get(e.char) || []).filter((c) => inList.has(c) && (!rank.get(c) || rank.get(c) <= rank.get(e.char) + GAP)),
  ]));
  while (remaining.length) {
    let pick = remaining.find((e) => depsOf.get(e.char).every((c) => emitted.has(c)));
    if (!pick) pick = remaining[0]; // 环或坏数据：按字频硬出
    const { order, ...entry } = pick;
    done.push(entry);
    emitted.add(pick.char);
    remaining.splice(remaining.indexOf(pick), 1);
  }
  plan.length = 0;
  plan.push(...done);
}

// ---- 数字声调 -> 声调符号（机械转换，只处理单字读音）----
const MARKS = {
  a: 'āáǎà', o: 'ōóǒò', e: 'ēéěè', i: 'īíǐì', u: 'ūúǔù', ü: 'ǖǘǚǜ',
};
function toMarked(reading) {
  const m = reading.replace(/u:/g, 'v').match(/^([a-z]+)([1-4])?$/);
  if (!m) throw new Error(`读不懂的读音：${reading}`);
  const [, base, tone] = m;
  const s = base.replace(/v/g, 'ü');
  if (!tone) return s;
  let idx = -1;
  for (const v of ['a', 'o', 'e']) {
    idx = s.indexOf(v);
    if (idx >= 0) break;
  }
  if (idx < 0) {
    const iu = /(iu|ui)/.exec(s);
    if (iu) idx = s.indexOf(iu[0][1]); // iu 标在 u、ui 标在 i
    else {
      idx = [...s].findIndex((c) => MARKS[c]);
      if (idx < 0) return s + tone; // 没找到元音，兜底缀数字
    }
  }
  return s.slice(0, idx) + MARKS[s[idx]][Number(tone) - 1] + s.slice(idx + 1);
}

// ---- 生成 id：拼音 + 声调数字，重名加后缀 ----
const taken = new Map();
for (const e of plan) {
  if (e.bespoke) {
    taken.set(e.id, e.char);
    continue;
  }
  const m = e.reading.replace(/u:/g, 'v').match(/^([a-z]+)([1-4])?$/);
  if (!m) throw new Error(`${e.char} 读不懂：${e.reading}`);
  let id = m[1] + (m[2] || '');
  for (let s = 'b'; taken.has(id); s = String.fromCharCode(s.charCodeAt(0) + 1)) id = m[1] + (m[2] || '') + s;
  taken.set(id, e.char);
  e.id = id;
  e.pinyin = toMarked(e.reading);
}

plan.forEach((e, i) => {
  e.stage = Math.floor(i / STAGE) + 1;
  const { stage, ...rest } = e;
  e.stage = stage;
});

// ---- 读音真实性：plan 的 reading 必须是 pinyin-pro 认可的该字读音 ----
// （junda 的首读音偶尔是错音，2026-11-19 已被校对 agent 抓出一批；这道关卡拦截漏网的）
const norm = (r) => r.replace(/[05]$/, '').replace(/v/g, 'ü'); // 轻声有的标 0/5；ü 有的写 v
const bad = [];
const odd = [];
for (const e of plan) {
  if (e.bespoke) continue;
  const readings = pinyin(e.char, { multiple: true, toneType: 'num', type: 'string' }).split(/\s+/).map(norm);
  if (!readings.includes(norm(e.reading))) bad.push(`${e.char}(${e.id}) ${e.reading} 不在 ${readings.join('/')}`);
  else if (readings[0] !== norm(e.reading)) odd.push(`${e.char}${e.reading}(词典首选${readings[0]})`);
}
if (bad.length) {
  console.error(`读音不存在，先补 READING_OVERRIDE 再重跑：\n${bad.join('\n')}`);
  process.exit(1);
}
if (odd.length) console.log(`多音字未取词典首选（已人工确认过的取舍）：${odd.join(' ')}`);

// 旧 plan 备份一份，供 scripts/rename-ids.mjs 对比改名
const planFile = join(root, 'data/sources/plan-1000.json');
if (existsSync(planFile)) copyFileSync(planFile, join(root, 'data/sources/plan-1000.old.json'));
writeFileSync(planFile, `${JSON.stringify({ total: plan.length, order: plan }, null, 1)}\n`);
const last = plan.at(-1);
const bespokeCount = plan.filter((e) => e.bespoke).length;
const maxRank = Math.max(...plan.map((e) => e.rank || 0));
// 重排位移：字频位次 vs 最终位次，看有没有被拆字依赖推得太远的常用字
const displaced = plan
  .map((e, i) => ({ e, i }))
  .filter(({ e }) => e.rank)
  .map(({ e, i }) => ({ char: e.char, d: i - e.rank }))
  .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
  .slice(0, 5);
console.log(`共 ${plan.length} 字；入选的最大字频名次 ${maxRank}，最后一个是「${last.char}」`);
console.log(`阶段数：${last.stage}；定制课 ${bespokeCount} 个`);
console.log('位移最大的字:', displaced.map((x) => `${x.char}${x.d > 0 ? '+' : ''}${x.d}`).join(' '));
