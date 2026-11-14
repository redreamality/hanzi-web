// 用 edge-tts 把 data/chars/<id>.json 里的每句台词预生成成 audio/<id>/<键>.mp3。
// 用法：node scripts/gen-audio.mjs [字id...] [--force]，需要 uv（通过 uvx 临时运行 edge-tts）。
import { readFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const VOICE = 'zh-CN-XiaoxiaoNeural';
const RATE = '-15%';

const args = process.argv.slice(2);
const force = args.includes('--force');
const ids = args.filter((a) => !a.startsWith('--'));
const all = readdirSync(join(root, 'data/chars'))
  .filter((f) => /^[a-z]+\.json$/.test(f))
  .map((f) => f.replace('.json', ''));

for (const id of ids.length ? ids : all) {
  const { lines } = JSON.parse(readFileSync(join(root, 'data/chars', `${id}.json`), 'utf8'));
  const outDir = join(root, 'audio', id);
  mkdirSync(outDir, { recursive: true });
  for (const [key, text] of Object.entries(lines)) {
    const out = join(outDir, `${key}.mp3`);
    if (existsSync(out) && !force) continue;
    const r = spawnSync(
      'uvx',
      ['--from', 'edge-tts', 'edge-tts', '--voice', VOICE, `--rate=${RATE}`, '--text', text, '--write-media', out],
      { stdio: 'inherit' },
    );
    if (r.status !== 0) throw new Error(`生成失败：${id}/${key}`);
    console.log(`${id}/${key}.mp3  ${text}`);
  }
}
