// 给 plan-1000 的通用字生成造字侧输入：data/sources/plan-extras.json。
// 每条（键=通用字 id）：
//   char / stage / families   plan 原样（families 无则 null）
//   decomp                    cjk-decomp a/d 部件中在 plan 内的
//   partInfo                  每个部件在 plan 里的落位（char/id/index/stage），
//                             recent = 部件已在本字之前学过且 index 差 ≤50
//                             （刚学过，台词才许说「刚学过的 Y」；部件在后恒 false）
//   shuowen                   说文摘要 {head,explanation,radical,fanqie} 或 null
//   shuowenNote               direct | via:<繁体> | ambiguous:<候选> | null
// 简繁解析：先直查字头（wordhead==字）；不中走 scripts/_s2t.py
// （uv run --with opencc 子进程，一次批量）取候选：第一个存在的即命中，
// 多个存在取第一个并标 ambiguous，全不中为 null（后起字/简化新字，正常现象）。
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const plan = JSON.parse(readFileSync(join(root, 'data/sources/plan-1000.json'), 'utf8')).order;
const shuowen = JSON.parse(readFileSync(join(root, 'data/sources/shuowen.json'), 'utf8'));

// 拆字表（与 build-list 同一解析：只认 a()/d() 且键、部件本身是单个汉字）
const decompRaw = readFileSync(join(root, 'data/sources/cjk-decomp.txt.js'), 'utf8');
const decomp = new Map();
for (const m of decompRaw.matchAll(/^(\S+):(?:a|d)\(([^)]*)\)$/gm)) {
  const [, key, inner] = m;
  if (!/^[㐀-鿿豈-﫿]$/.test(key)) continue;
  const parts = inner.split(',').filter((p) => /^[㐀-鿿豈-﫿]$/.test(p));
  if (parts.length) decomp.set(key, parts);
}

const indexOf = new Map(plan.map((e, i) => [e.char, i]));
const byChar = new Map(plan.map((e) => [e.char, e]));

// ---- 手工映射：同字的古文/正篆字头（opencc 词典不达，直查与反查都落空）----
// 逐条以该字头 explanation 自证（引文见各条），拿不准的不进表。
// 注意边界：他→它 不许映射（它的说文是「虫也」，是蛇，映射会注入错误字源），
// 沉→沈 / 值→直 / 拿→拏 / 村→邨 / 已→巳 / 着→箸 / 互→䇘 / 板→版 / 康→穅 / 智→知
// 同理不进（训释不自证同字或会注错义）。
// 简体同形异字类（2026-11-20 D10 裁决修复）：简体字本身就是说文里另一个不同的字，
// 直查会命中错字——听 在说文是 yǐn「笑皃」，简体 听=聽(tīng 聆也)；
// 朝 在说文的 wordhead 是正篆 𦩻（indexes 里才有朝），直查落空。这类必须走 manual。
const MANUAL_SHUOWEN = {
  // 2026-11-19 主会话核准
  上: '丄', // 「高也。此古文上，指事也。」
  下: '丅', // 「底也。指事。」
  星: '曐', // 「萬物之精，上爲列星。」
  春: '萅', // 「推也。……艸春時生也。」
  年: '秊', // 「穀孰也。……《春秋傳》曰：大有秊。」
  // 说文正篆/初文形（楷化后成了今天的字）
  于: '亏', // 「於也。象气之舒亏。」段注：亏即今「于」
  处: '処', // 「止也。得几而止。」処=處正篆，简「处」直承此形
  集: '雧', // 「羣鳥在木上也。」雧正篆，集为其省体
  创: '刱', // 「造法刱業也。……讀若創。」（创伤义另可参 刅 id2801「傷也」）
  脑: '匘', // 「頭𩪦也。……囟象匘形。」匘正篆
  卫: '衞', // 「宿衞也。从韋、帀，从行。」
  善: '譱', // 「吉也。从誩从羊。」譱正篆
  雷: '靁', // 「陰陽薄動靁雨，生物者也。」靁正篆
  肯: '肎', // 「骨閒肉肎肎箸也。」肎正篆，「中肯」之源
  剑: '劒', // 「人所帶兵也。从刃僉聲。」劒正篆
  额: '頟', // 「顙也。从頁各聲。」頟正篆
  法: '灋', // 「刑也。平之如水……」灋正篆
  学: '斆', // 「覺悟也。从教从冂。」斆正篆，學为其省
  间: '閒', // 「隟也。从門从月。」閒正篆，間为其分化
  块: '凷', // 「墣也。从土，一屈象形。」凷正篆，塊为其或体
  射: '䠶', // 「弓弩發於身而中於遠也。从矢从身。」䠶正篆
  留: '畱', // 「止也。从田丣聲。」畱正篆
  的: '旳', // 「明也。从日勺聲。《易》曰：爲旳顙。」旳正篆，「有的放矢」之源
  以: '㠯', // 「用也。从反巳。」㠯初文，以为其后起形
  敢: '𠭖', // 「進取也。从𠬪古聲。」𠭖正篆，敢为其省变
  散: '𢿱', // 「雜肉也。从肉㪔聲。」𢿱正篆，散为其省体
  // 古今字：今字说文未收，本字训释就是今字本义（与 洲/州、域/或 同构）
  花: '華', // 「榮也。从艸从𠌶。」花本作華（音变分化）
  洲: '州', // 「水中可居曰州。」洲本作州
  域: '或', // 「邦也。从囗从戈，以守一。」域本作或
  // 简体同形异字（D10）：直查命中的是说文里另一个字
  听: '聽', // 「聆也。从耳、㥁，壬聲。」简体听=聽；说文 听(yǐn) 是「笑皃」，另一个字
  朝: '𦩻', // 「旦也。从倝舟聲。」说文以正篆 𦩻 为字头（陟遙切 zhāo），indexes 含朝
};
{
  const planChars = new Set(plan.map((e) => e.char));
  for (const [c, head] of Object.entries(MANUAL_SHUOWEN)) {
    if (!planChars.has(c)) throw new Error(`MANUAL_SHUOWEN 里的「${c}」不在 plan 中`);
    if (!shuowen[head]) throw new Error(`MANUAL_SHUOWEN 的「${c}→${head}」字头不在 shuowen.json`);
  }
}

// ---- 简繁解析：直查不中的字批量走 _s2t.py ----
const generic = plan.filter((e) => !e.bespoke);
const needVia = generic
  .filter((e) => !shuowen[e.char] && !MANUAL_SHUOWEN[e.char])
  .map((e) => ({ char: e.char }));
const candsOf = new Map();
if (needVia.length) {
  const res = spawnSync(
    'uv',
    ['run', '--no-project', '--with', 'opencc', 'python',
      join(root, 'scripts/_s2t.py'), join(root, 'data/sources/shuowen.json')],
    { input: JSON.stringify(needVia), encoding: 'utf8' },
  );
  if (res.status !== 0) throw new Error(`_s2t.py 失败（exit ${res.status}）：${res.stderr}`);
  for (const r of JSON.parse(res.stdout)) candsOf.set(r.char, r.cands);
}

const stats = { direct: 0, via: 0, ambiguous: 0, manual: 0, null: 0 };
const nullChars = [];
const viaChars = [];
const ambChars = [];
const manualChars = [];
const extras = {};
for (const [i, e] of plan.entries()) {
  if (e.bespoke) continue;
  const parts = (decomp.get(e.char) || []).filter((c) => indexOf.has(c));
  const partInfo = parts.map((c) => {
    const pi = indexOf.get(c);
    const pe = byChar.get(c);
    return { char: c, id: pe.id, index: pi, stage: pe.stage, recent: pi < i && i - pi <= 50 };
  });
  let hit = null; // 命中的说文条目
  let head = null; // 命中的字头
  let note;
  // manual 优先于直查：简体同形异字类（听/朝）直查会命中说文里另一个字
  if (MANUAL_SHUOWEN[e.char]) {
    head = MANUAL_SHUOWEN[e.char];
    hit = shuowen[head];
    note = `manual:${head}`;
    stats.manual++;
    manualChars.push(`${e.char}=${head}`);
  } else if (shuowen[e.char]) {
    hit = shuowen[e.char];
    head = e.char;
    note = 'direct';
    stats.direct++;
  } else {
    const cands = candsOf.get(e.char) || [];
    if (cands.length >= 1) {
      head = cands[0];
      hit = shuowen[head];
      if (cands.length > 1) {
        note = `ambiguous:${cands.join('/')}`;
        stats.ambiguous++;
        ambChars.push(`${e.char}(${note})`);
      } else {
        note = `via:${head}`;
        stats.via++;
        viaChars.push(`${e.char}=${head}`);
      }
    } else {
      note = null;
      stats.null++;
      nullChars.push(e.char);
    }
  }
  extras[e.id] = {
    char: e.char,
    stage: e.stage,
    families: e.families || null,
    decomp: parts,
    partInfo,
    shuowen: hit
      ? { head, explanation: hit.explanation, radical: hit.radical, fanqie: hit.fanqie }
      : null,
    shuowenNote: note,
  };
}

writeFileSync(join(root, 'data/sources/plan-extras.json'), `${JSON.stringify(extras, null, 1)}\n`);
console.log(`plan-extras：${Object.keys(extras).length} 个通用字`);
console.log(`说文命中：direct ${stats.direct}、via ${stats.via}、ambiguous ${stats.ambiguous}、manual ${stats.manual}、null ${stats.null}`);
if (manualChars.length) console.log(`manual 明细：${manualChars.join('、')}`);
if (viaChars.length) console.log(`via 明细：${viaChars.join('、')}`);
if (ambChars.length) console.log(`ambiguous 明细：${ambChars.join('、')}`);
if (nullChars.length) console.log(`无说文条目（后起字/简化新字）：${nullChars.join('')}`);
