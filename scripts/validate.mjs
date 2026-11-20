// 校验通用字的数据质量。用法：node scripts/validate.mjs [id...] [--audio]
// 默认校验 plan-1000.json 里的全部字；--audio 额外要求每句台词的 mp3 都在。
// 定制课（日月木人）只查文件齐全，不查内容格式。
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const checkAudio = args.includes('--audio');
const plan = JSON.parse(readFileSync(join(root, 'data/sources/plan-1000.json'), 'utf8')).order;
const wanted = args.filter((a) => !a.startsWith('--'));
const targets = wanted.length ? plan.filter((e) => wanted.includes(e.id)) : plan;
if (wanted.length && targets.length !== wanted.length) {
  const known = new Set(plan.map((e) => e.id));
  throw new Error(`plan 里没有这些 id：${wanted.filter((w) => !known.has(w)).join(' ')}`);
}

const CJK = /^[㐀-鿿·]+$/;
const errors = [];
const warns = [];
const err = (id, msg) => errors.push(`${id}: ${msg}`);

for (const e of targets) {
  const file = join(root, 'data/chars', `${e.id}.json`);
  if (!existsSync(file)) {
    err(e.id, '缺 data/chars/<id>.json');
    continue;
  }
  let data;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (ex) {
    err(e.id, `json 解析失败：${ex.message}`);
    continue;
  }

  if (!existsSync(join(root, 'data/chars', `${e.id}.strokes.json`))) err(e.id, '缺笔画数据 strokes.json');

  if (e.bespoke) continue; // 定制课到此为止

  if (data.id !== e.id) err(e.id, `id 字段应为 ${e.id}，实际 ${data.id}`);
  if (data.char !== e.char) err(e.id, `char 应为 ${e.char}，实际 ${data.char}`);
  if (data.pinyin !== e.pinyin) err(e.id, `pinyin 应为 ${e.pinyin}（读音 ${e.reading}），实际 ${data.pinyin}`);

  const keys = Object.keys(data).sort();
  const want = ['char', 'forms', 'id', 'lines', 'meaning', 'pinyin', 'words'].sort().join(',');
  if (keys.join(',') !== want) err(e.id, `字段应为 ${want}，实际 ${keys.join(',')}`);

  if (JSON.stringify(data.forms) !== JSON.stringify([{ id: 'kaishu', label: '楷书' }])) {
    err(e.id, `forms 固定为 [{"id":"kaishu","label":"楷书"}]`);
  }

  const m = [...String(data.meaning || '')];
  if (m.length < 2 || m.length > 4) err(e.id, `meaning「${data.meaning}」应为 2-4 字`);
  else if (!data.meaning.includes(data.char)) err(e.id, `meaning「${data.meaning}」里必须含本字 ${data.char}`);
  else if (!CJK.test(data.meaning)) err(e.id, `meaning「${data.meaning}」里有非汉字字符`);

  const words = data.words;
  if (!Array.isArray(words) || words.length < 1 || words.length > 3) {
    err(e.id, 'words 应为 1-3 个词的数组');
  } else if (!words.some((w) => w.includes(data.char))) {
    err(e.id, `words ${JSON.stringify(words)} 里至少一个要含本字`);
  } else if (words.some((w) => !CJK.test(w) || [...w].length < 2 || [...w].length > 4)) {
    err(e.id, `words ${JSON.stringify(words)} 里每个词都要是 2-4 个汉字`);
  }

  const LINES = ['intro', 'sound', 'kaishu', 'order', 'trace', 'retry', 'done'];
  const lineKeys = Object.keys(data.lines || {}).sort();
  if (lineKeys.join(',') !== [...LINES].sort().join(',')) {
    err(e.id, `lines 的键应为 ${LINES.join(',')}，实际 ${lineKeys.join(',')}`);
  }
  for (const k of LINES) {
    const s = data.lines?.[k];
    if (typeof s !== 'string' || s.length === 0) {
      err(e.id, `lines.${k} 缺失或为空`);
      continue;
    }
    if (/[A-Za-z0-9]/.test(s)) err(e.id, `lines.${k}「${s}」里有英文或数字`);
    if (k === 'sound') {
      const plain = `${data.char}。`;
      const poly = new RegExp(`^${data.char}，.+的${data.char}。$`);
      if (s !== plain && !poly.test(s)) err(e.id, `sound「${s}」应为「${data.char}。」；多音字可用「${data.char}，某词的${data.char}。」`);
    } else if (s.length < 4 || s.length > 50) {
      err(e.id, `lines.${k}「${s}」长度应在 4-50 字`);
    }
  }
  if (!data.lines?.intro?.includes(data.meaning)) err(e.id, 'lines.intro 应包含 meaning 这个词');
  if (data.lines?.done && !data.lines.done.includes(data.char)) err(e.id, 'lines.done 应包含本字');
  if (data.lines?.kaishu && !data.lines.kaishu.includes(data.char)) err(e.id, 'lines.kaishu 应包含本字');
  if (checkAudio) {
    for (const k of Object.keys(data.lines || {})) {
      if (!existsSync(join(root, 'audio', e.id, `${k}.mp3`))) err(e.id, `--audio：缺 audio/${e.id}/${k}.mp3`);
    }
  }

  const strokesFile = join(root, 'data/chars', `${e.id}.strokes.json`);
  if (existsSync(strokesFile)) {
    const st = JSON.parse(readFileSync(strokesFile, 'utf8'));
    if (!Array.isArray(st.strokes) || !Array.isArray(st.medians) || !st.strokes.length) err(e.id, 'strokes.json 格式不对');
    else if (st.strokes.length !== st.medians.length) err(e.id, `strokes(${st.strokes.length}) 和 medians(${st.medians.length}) 数量不一致`);
  }
}

for (const e of errors) console.log(`错误 ${e}`);
for (const w of warns) console.log(`警告 ${w}`);
if (errors.length) {
  console.log(`\n${targets.length} 个字里，${errors.length} 处问题`);
  process.exit(1);
}
console.log(`\n${targets.length} 个字全部通过${checkAudio ? '（含音频）' : ''}`);
