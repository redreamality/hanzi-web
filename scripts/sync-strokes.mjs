// 把 plan-1000.json 里每个字的笔画数据从 hanzi-writer-data 复制到 data/chars/<id>.strokes.json。
// 用法：node scripts/sync-strokes.mjs（幂等，已存在的覆盖为最新）
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const plan = JSON.parse(readFileSync(join(root, 'data/sources/plan-1000.json'), 'utf8')).order;
const hwz = join(root, 'node_modules/hanzi-writer-data');

let ok = 0;
const missing = [];
for (const e of plan) {
  if (e.bespoke) continue;
  const src = join(hwz, `${e.char}.json`);
  if (!existsSync(src)) {
    missing.push(e.char);
    continue;
  }
  writeFileSync(join(root, 'data/chars', `${e.id}.strokes.json`), readFileSync(src));
  ok++;
}
console.log(`笔画数据就位：${ok} 个字${missing.length ? `；缺数据的字：${missing.join(' ')}` : ''}`);
if (missing.length) process.exit(1);
