// 按学习顺序生成三个入口文件：
//   data/lessons.json  所有能上的课（data/chars/<id>.json 已就位的字，按 plan 顺序）
//   data/index.json    首页字卡要的轻量信息（一个请求拿全，避免逐字拉数据）
//   data/upcoming.json  「即将学」一排淡淡的字（plan 之外按字频往后再取 24 个）
// 用法：node scripts/build-index.mjs [--strict]
//   --strict：plan 里有数据文件缺失时直接失败（正式出片用）
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const strict = process.argv.includes('--strict');
const plan = JSON.parse(readFileSync(join(root, 'data/sources/plan-1000.json'), 'utf8')).order;

const lessons = [];
const index = [];
const missing = [];
for (const e of plan) {
  const file = join(root, 'data/chars', `${e.id}.json`);
  if (!existsSync(file)) {
    if (!e.bespoke) missing.push(`${e.id}(${e.char})`);
    continue;
  }
  const { char, pinyin, meaning } = JSON.parse(readFileSync(file, 'utf8'));
  lessons.push(e.id);
  index.push({ id: e.id, char, pinyin, meaning });
}
if (strict && missing.length) throw new Error(`--strict：还缺 ${missing.length} 个字的数据，例如 ${missing.slice(0, 5).join(' ')}`);

// 字频表里 plan 之外的下一个字，作「即将学」预告
const junda = readFileSync(join(root, 'data/sources/frequencyjunda.txt.js'), 'utf8')
  .replace(/^[\s\S]*?module\.exports\s*=\s*`/, '')
  .split('\n')
  .filter((l) => /^\d+\t/.test(l))
  .map((l) => l.split('\t')[1]);
const inPlan = new Set(plan.map((e) => e.char));
const EXCLUDE = new Set(['杀', '奸', '赌', '匪']); // 和 build-list 保持一致
const upcoming = junda
  .filter((c) => /^[一-鿿]$/.test(c) && !inPlan.has(c) && !EXCLUDE.has(c))
  .slice(0, 24);

writeFileSync(join(root, 'data/lessons.json'), `${JSON.stringify(lessons, null, 1)}\n`);
writeFileSync(join(root, 'data/index.json'), `${JSON.stringify(index, null, 1)}\n`);
writeFileSync(join(root, 'data/upcoming.json'), `${JSON.stringify(upcoming, null, 1)}\n`);
console.log(`lessons.json：${lessons.length} 课；index.json：${index.length} 条；upcoming：${upcoming.join('') || '（无）'}`);
if (missing.length) console.log(`还缺数据：${missing.length} 个（暂未加入 lessons）`);
