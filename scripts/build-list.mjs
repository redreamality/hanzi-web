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
// 第二批 10 个手绘字（add-second-batch）数据还在造字 workflow 里生成，
// plan 只需要 char/pinyin，先用这里兜底；数据落盘后与 json 一致。
const FALLBACK_BESPOKE = {
  yi: ['一', 'yī'], da: ['大', 'dà'], tian: ['天', 'tiān'], cong: ['从', 'cóng'],
  bi: ['比', 'bǐ'], bei: ['北', 'běi'], zhong: ['众', 'zhòng'], huo: ['火', 'huǒ'],
  xin: ['心', 'xīn'], qingxin: ['情', 'qíng'],
};
const lessons = JSON.parse(readFileSync(join(root, 'data/lessons.json'), 'utf8'));
const plan = [];
const seen = new Set();
for (const id of lessons) {
  const file = join(root, 'data/chars', `${id}.json`);
  let char, pinyin;
  if (existsSync(file)) ({ char, pinyin } = JSON.parse(readFileSync(file, 'utf8')));
  else if (FALLBACK_BESPOKE[id]) [char, pinyin] = FALLBACK_BESPOKE[id];
  else throw new Error(`lessons.json 里的 ${id} 既没有数据文件，也不在兜底表里`);
  plan.push({ id, char, reading: '', pinyin, rank: 0, bespoke: true });
  seen.add(char);
}

// ---- 家族聚簇（hanzi-network spec「家族聚簇」：同族教学动线要比较，排序别散开）----
// 与 data/sources/char-families.md 保持同步：改字族先改那个文件，再把变化同步到这里。
// 一字可属多族（她=女旁+也声旁）。定制课（bespoke）钉在最前，聚簇断言只约束通用字。
const FAMILIES = {
  人形族: '人大天从比北夫众化坐',
  木族: '木林森',
  日族: '日旦早晚春明',
  火族: '火炎',
  会意合成族: '卡尖歪尘',
  女旁族: '好她孩妈姐妹',
  门族: '问闻闷',
  心族: '心想念情',
  氵族: '海清江河湖池',
  亻族: '他们你作体什位住休伴',
  土族: '土坐尘',
  声旁青: '清情请精晴',
  声旁也: '地她池',
  声旁生: '性星姓',
  声旁门: '问闻闷',
  声旁方: '放房访',
  声旁白: '伯拍',
  声旁丁: '打',
  声旁马: '妈吗',
  声旁可: '河何',
  声旁每: '海悔',
  声旁里: '理',
  声旁果: '课颗棵',
};
const familyOf = new Map();
for (const [name, chars] of Object.entries(FAMILIES)) {
  for (const c of chars) {
    if (!familyOf.has(c)) familyOf.set(c, []);
    familyOf.get(c).push(name);
  }
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

// ---- 合体字排在部件后面：先做纯「字频+拓扑」的基准序 ----
// 拆字表偶有环，兜底：谁都不满足时取当前最靠前的。
const naive = (() => {
  const rest = plan.slice(lessons.length); // 定制课固定在最前
  const done = plan.slice(0, lessons.length);
  const emitted = new Set(done.map((e) => e.char));
  const remaining = rest.map((e, i) => ({ ...e, naiveIdx: i })).sort((a, b) => b.rank - a.rank); // rank 大的先出？不：按选中顺序
  remaining.sort((a, b) => a.naiveIdx - b.naiveIdx); // naiveIdx = 按字频选入的顺序
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
    const { naiveIdx, ...entry } = pick;
    done.push(entry);
    emitted.add(pick.char);
    remaining.splice(remaining.indexOf(pick), 1);
  }
  return done;
})();

// ---- 家族聚簇：每族在最早成员的锚点处整块出场（spec 场景「家族聚簇」）----
// 每字只跟一个「主族」聚簇（部件重复族 > 部首族 > 声旁族），其余族只作台词线索（e.families）。
// 依赖永不破坏：成员的部件没就绪就把部件（及其部件链）作为客人拉进块里；
// 拉不动（部件太远）的成员显式记 deferred 并在自检里大声报告——不静默降级。
const inList = seen;
const rankMap = new Map(plan.map((e) => [e.char, e.rank || 0]));
const GAP = 150;
const bindingDeps = new Map(plan.map((e) => [
  e.char,
  (decomp.get(e.char) || []).filter((c) => inList.has(c) && (!rankMap.get(c) || rankMap.get(c) <= rankMap.get(e.char) + GAP)),
]));
const FAMILY_PRIORITY = { 部件重复族: 1, 部首族: 2, 声旁族: 3 };
const familyKind = (name) =>
  /族$/.test(name) && ['人形族', '木族', '日族', '火族', '会意合成族'].includes(name) ? '部件重复族'
    : name.startsWith('声旁') ? '声旁族'
      : '部首族';
const primaryOf = new Map(); // char -> 主族名
for (const e of plan) {
  const fams = (familyOf.get(e.char) || []).map((f) => ({ f, p: FAMILY_PRIORITY[familyKind(f)] }));
  fams.sort((a, b) => a.p - b.p);
  if (fams.length) primaryOf.set(e.char, fams[0].f);
}
const familiesWithMembers = Object.entries(FAMILIES)
  .map(([name]) => ({
    name,
    members: naive.filter((e) => !e.bespoke && primaryOf.get(e.char) === name).sort((a, b) => a.rank - b.rank),
  }))
  .filter((f) => f.members.length >= 2);
for (const f of familiesWithMembers) f.anchor = naive.indexOf(f.members[0]); // 锚在最早成员处：常用字不推迟
familiesWithMembers.sort((a, b) => a.anchor - b.anchor);

const finalOrder = naive.slice(0, lessons.length);
const placed = new Set(finalOrder.map((e) => e.char));
const deferred = []; // {family, char, reason}
const pending = []; // 挂起的字（部件没齐）
const PULL_LIMIT = 400; // 部件比锚点晚出不超过这个距离就整块拉前，否则成员 defer
// 把 c（及其部件链）作为客人拉到当前位置；拉不动返回 false
function pullGuest(c, from) {
  if (placed.has(c)) return true;
  const entry = naive.find((e) => e.char === c);
  if (!entry) return false;
  const pos = naive.indexOf(entry);
  if (pos - from > PULL_LIMIT) return false;
  for (const d of bindingDeps.get(c) || []) if (!pullGuest(d, from)) return false;
  finalOrder.push(entry);
  placed.add(c);
  return true;
}
for (let i = lessons.length; i < naive.length; i++) {
  for (const f of familiesWithMembers) {
    if (f.placed || f.anchor > finalOrder.length) continue;
    f.placed = true;
    for (const m of f.members) {
      if (placed.has(m.char)) continue;
      const missing = (bindingDeps.get(m.char) || []).filter((c) => !placed.has(c));
      if (missing.every((c) => pullGuest(c, f.anchor))) {
        finalOrder.push(m);
        placed.add(m.char);
      } else {
        deferred.push({ family: f.name, char: m.char, reason: `部件 ${missing.join('')} 距锚点超过 ${PULL_LIMIT}，拉不动` });
      }
    }
  }
  // 挂起成员：部件齐了立刻插队（保持块完整）
  for (let changed = true; changed;) {
    changed = false;
    for (let p = 0; p < pending.length; p++) {
      if ((bindingDeps.get(pending[p].entry.char) || []).every((c) => placed.has(c))) {
        finalOrder.push(pending[p].entry);
        placed.add(pending[p].entry.char);
        pending.splice(p, 1);
        changed = true;
        break;
      }
    }
  }
  const e = naive[i];
  if (!placed.has(e.char)) {
    if ((bindingDeps.get(e.char) || []).every((c) => placed.has(c))) {
      finalOrder.push(e);
      placed.add(e.char);
    } else {
      pending.push({ entry: e });
    }
  }
}
// 兜底：还挂着的按部件齐了就出，最后真环的按基准序硬出
for (let guard = pending.length * 2; guard > 0 && pending.length; guard--) {
  for (let p = 0; p < pending.length; p++) {
    if ((bindingDeps.get(pending[p].entry.char) || []).every((c) => placed.has(c))) {
      finalOrder.push(pending[p].entry);
      placed.add(pending[p].entry.char);
      pending.splice(p, 1);
      break;
    }
  }
}
for (const p of pending) finalOrder.push(p.entry); // 依赖环兜底
plan.length = 0;
plan.push(...finalOrder);

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

// ---- 排序自检（spec 场景「字表更新时自检」「家族聚簇」的脚本断言）----
// 1) 每个合体字的全部在表部件都排在它前面（GAP 豁免的不算）；
// 2) 每个家族的通用字成员跨 ≤ 1 个阶段（定制课钉在最前，豁免但报告）。
for (const e of plan) if (familyOf.has(e.char)) e.families = familyOf.get(e.char);
{
  const inList = seen;
  const rank = new Map(plan.map((e) => [e.char, e.rank || 0]));
  const GAP = 150;
  const badDeps = [];
  for (const [i, e] of plan.entries()) {
    if (e.bespoke) continue;
    for (const p of decomp.get(e.char) || []) {
      if (!inList.has(p)) continue;
      const j = plan.findIndex((x) => x.char === p);
      if (j > i && rank.get(p) <= rank.get(e.char) + GAP) badDeps.push(`${p}(${j}) 在 ${e.char}(${i}) 后面`);
    }
  }
  const badFamilies = [];
  const familyNotes = [];
  const deferredChars = new Map(deferred.map((d) => [d.char, d.family]));
  for (const [name, chars] of Object.entries(FAMILIES)) {
    const idx = plan
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => chars.includes(e.char))
      .map(({ e, i }) => ({ stage: e.stage, bespoke: !!e.bespoke, char: e.char }));
    const generic = idx.filter((x) => !x.bespoke);
    if (!generic.length) continue;
    // 跨度只按「主族成员」算：一字只跟一个主族聚簇（部件族>部首族>声旁族），
    // 次族成员（她之于声旁也）靠台词点题，不承担聚簇义务
    const inBlock = generic.filter((x) => !deferredChars.has(x.char) && primaryOf.get(x.char) === name);
    if (inBlock.length >= 2) {
      const span = Math.max(...inBlock.map((x) => x.stage)) - Math.min(...inBlock.map((x) => x.stage));
      if (span > 1) badFamilies.push(`${name}：主族通用字跨 ${span + 1} 个阶段（${inBlock.map((x) => x.char).join('')}）`);
    }
    const out = generic.filter((x) => deferredChars.has(x.char));
    if (out.length) familyNotes.push(`${name}：${out.map((x) => `${x.char}（${deferred.filter((d) => d.char === x.char)[0].reason}）`).join('、')} 未能进族块`);
    const early = idx.filter((x) => x.bespoke && x.stage < Math.min(...generic.map((y) => y.stage)) - 1);
    if (early.length) familyNotes.push(`${name}：定制课 ${early.map((x) => x.char).join('')} 在最前，家族比较动线在通用字侧完成`);
  }
  if (badDeps.length || badFamilies.length) {
    console.error(`排序自检失败：\n${[...badDeps, ...badFamilies].join('\n')}`);
    if (process.env.DBG) {
      const watch = new Set([badFamilies, ...familyNotes].join('').match(/[一-鿿]/g) || []);
      for (const [i, e] of plan.entries()) if (watch.has(e.char)) console.error(`  DBG ${e.char} pos=${i} stage=${e.stage} rank=${e.rank} primary=${primaryOf.get(e.char)} bespoke=${!!e.bespoke}`);
    }
    process.exit(1);
  }
  if (familyNotes.length) console.log(`家族备注：\n${familyNotes.join('\n')}`);
}

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
