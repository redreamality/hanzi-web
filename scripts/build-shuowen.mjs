// 把说文原始数据压成 data/sources/shuowen.json：字头 -> 说文摘要。
// 输入：C:/Users/unknown/agents/projects/2026-11_shuowen/raw/shuowen/data/<id>.json
//       （9833 个条目，来源 shuowen.org，Apache 2.0；字段 wordhead/explanation/radical/pronunciation/pinyin_full）
// 输出：{ "<wordhead>": { id, explanation, radical, fanqie, pinyin } }
//   fanqie = 原始 pronunciation（反切）；pinyin = 原始 pinyin_full（带调符号）。
//   wordhead 重复保留第一条并统计丢弃数；wordhead 不是单字的跳过并计数。
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// 本机总部的说文项目；迁移新电脑时先克隆该项目再跑本脚本
const SRC = 'C:/Users/unknown/agents/projects/2026-11_shuowen/raw/shuowen/data';

const out = {};
const dup = [];
const skipped = [];
// 源数据（shuowen.org 导出）里个别条目 wordhead 与内容错位，照录会把错义挂到常用简体字头上：
//   9111 wordhead=细，内容是「耕也。从土豤聲」（垦/土部 kěn）——细 正确条目是 細(8517 微也)；
//   8950 wordhead=终，内容是「龜名。从龜夂聲」（龜部 tónɡ 的龟名字）——终 正确条目是 終(8546 絿絲也)。
// 跳过后这两个键不入库，build-extras 的简繁映射（_s2t）会落到 細/終。2026-11-20 D10 裁决修复。
const RAW_BAD_IDS = new Set([9111, 8950]);
const badRaw = [];
// 按数字 id 升序处理（readdir 的字符串序是 1,10,100…，重复时「保留第一条」会不可复现）
const files = readdirSync(SRC)
  .filter((f) => f.endsWith('.json'))
  .sort((a, b) => Number(a.replace('.json', '')) - Number(b.replace('.json', '')));
for (const f of files) {
  const e = JSON.parse(readFileSync(join(SRC, f), 'utf8'));
  if (RAW_BAD_IDS.has(e.id)) {
    badRaw.push(`${f}:${e.wordhead}`);
    continue;
  }
  const w = e.wordhead;
  if (typeof w !== 'string' || [...w].length !== 1) {
    skipped.push(`${f}:${JSON.stringify(w)}`);
    continue;
  }
  if (out[w]) {
    dup.push(`${w}(留id${out[w].id},弃id${e.id})`);
    continue;
  }
  out[w] = {
    id: e.id,
    explanation: e.explanation,
    radical: e.radical,
    fanqie: e.pronunciation,
    pinyin: e.pinyin_full,
  };
}
writeFileSync(join(root, 'data/sources/shuowen.json'), `${JSON.stringify(out, null, 1)}\n`);
console.log(`说文：条目文件 ${files.length}，入库字头 ${Object.keys(out).length}，重复丢弃 ${dup.length}，非单字头跳过 ${skipped.length}，源数据坏条目跳过 ${badRaw.length}`);
if (badRaw.length) console.log(`坏条目（wordhead 与内容错位，已跳过）：${badRaw.join('、')}`);
if (dup.length) console.log(`重复：${dup.join('、')}`);
if (skipped.length) console.log(`跳过：${skipped.join('、')}`);
