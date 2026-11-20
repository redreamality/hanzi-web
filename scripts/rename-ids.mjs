// plan 改读音后，把 data/chars 和 audio 里的文件改到新 id。
// 基准是磁盘上现存的文件（data/chars/<id>.json 的 char 字段），不依赖 plan 的历史版本。
// 只做机械改名 + 修正 json 里的 id 字段；pinyin 和台词内容交给内容修订（不在这做）。
// 用法：node scripts/rename-ids.mjs [--dry]
import { readFileSync, writeFileSync, existsSync, renameSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dry = process.argv.includes('--dry');
const plan = JSON.parse(readFileSync(join(root, 'data/sources/plan-1000.json'), 'utf8')).order;
const newId = new Map(plan.map((e) => [e.char, e.id]));

// 现存文件：char -> 磁盘 id
const disk = new Map();
for (const f of readdirSync(join(root, 'data/chars'))) {
  if (!f.endsWith('.json') || f.endsWith('.strokes.json')) continue;
  const { char } = JSON.parse(readFileSync(join(root, 'data/chars', f), 'utf8'));
  disk.set(char, f.replace('.json', ''));
}

const moves = [];
for (const [char, old] of disk) {
  const want = newId.get(char);
  if (!want) {
    console.log(`删除（不在 plan 里）：${old}(${char})`);
    if (!dry) {
      rmSync(join(root, 'data/chars', `${old}.json`), { force: true });
      rmSync(join(root, 'data/chars', `${old}.strokes.json`), { force: true });
      rmSync(join(root, 'audio', old), { recursive: true, force: true });
    }
    continue;
  }
  if (want !== old) moves.push({ char, old, want });
}

console.log(`改名 ${moves.length} 个：`);
for (const m of moves) console.log(`  ${m.old}(${m.char}) → ${m.want}`);
if (dry) process.exit(0);

// 两段式改名，避免 A→B、B→C 互相覆盖
for (const m of moves) {
  for (const suffix of ['.json', '.strokes.json']) {
    const from = join(root, 'data/chars', m.old + suffix);
    if (existsSync(from)) renameSync(from, join(root, 'data/chars', `__tmp-${m.want}${suffix}`));
  }
  const audio = join(root, 'audio', m.old);
  if (existsSync(audio)) renameSync(audio, join(root, 'audio', `__tmp-${m.want}`));
}
for (const m of moves) {
  for (const suffix of ['.json', '.strokes.json']) {
    const tmp = join(root, 'data/chars', `__tmp-${m.want}${suffix}`);
    if (existsSync(tmp)) renameSync(tmp, join(root, 'data/chars', m.want + suffix));
  }
  const tmp = join(root, 'audio', `__tmp-${m.want}`);
  if (existsSync(tmp)) renameSync(tmp, join(root, 'audio', m.want));
}
for (const m of moves) {
  const file = join(root, 'data/chars', `${m.want}.json`);
  if (!existsSync(file)) continue;
  const data = JSON.parse(readFileSync(file, 'utf8'));
  data.id = m.want;
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}
console.log('完成。pinyin 和台词按新读音的修订另行处理。');
