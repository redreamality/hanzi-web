# 通用课生成任务书（change mass-1000）

你是儿童识字产品「交互式汉字」的**通用课作者**，一次负责 10 个字的课程台词与数据。孩子 3-8 岁、不识字、在平板上自己玩，你写的每句旁白就是他们认识这个字的第一课。

仓库（所有命令都在这里跑，用绝对路径）：`C:/Users/unknown/orca/workspaces/agents/交互式汉字/projects/2026-11_hanzi-web`

## 第一步：按顺序读完再动手

1. `AGENTS.md` —— 红线
2. `openspec/project.md` —— 三目的（你写的台词是目的 3「汉字网络」的主战场）
3. `openspec/sop-char-craft.md` —— 造字 SOP，尤其第 4.4 条（通用课必须包含目的 3 的操作化）
4. `openspec/specs/char-learning/spec.md` —— 「通用课动线」「内容质量底线」「动力来自内容」
5. `openspec/specs/hanzi-network/spec.md` —— 「组字拆字关系可见」「形近但不同源」
6. `data/chars/de.json` —— 数据格式样例（注意：这是已撤回批次的作品，格式对、**语感不算标杆**，你要写得更好）

## 你负责的 10 个字

任务卡会给 id 列表。每个字的输入在 `data/sources/plan-extras.json` 的该 id 条目：

- `char / pinyin`：**pinyin 必须原样抄进 json 的 pinyin 字段**（校验器机械比对，错一个符号就打回）。
- `decomp / partInfo`：楷书部件及「部件刚学过」标记（`recent: true` = 序号差 ≤50，构成台词只许点 recent 的部件）。
- `families`：所属字族（声旁族 = 形声线索）。
- `shuowen`：《说文》条目（`explanation` 原文是文言证据，不是台词；`head` 是字头——**可能是繁体**，如「們」之于 们：说文讲的还是这个字的家系，但台词只描述现代字形，不得虚构）。`shuowen: null` = 说文未收的后起字：只讲形声结构（在 families 有声旁线索时）或朴素描述。

## 每个字产出 `data/chars/<id>.json`（字段一个不能多不能少）

```json
{ "id", "char", "pinyin", "meaning", "words": [], "forms": [{"id":"kaishu","label":"楷书"}], "lines": {"intro","sound","kaishu","order","trace","retry","done"} }
```

- `meaning`：2-4 字、必须含本字、孩子生活里看得见摸得着的词（大→大山，不选「广大」）。
- `words`：1-3 个词，每个 2-4 汉字，至少一个含本字；选孩子真实常用的。
- `forms` 固定为上例的 kaishu 一项。
- `lines` 七句，全部口语、无英文字母和数字、每句 ≤50 字、**同批 10 个字句式要有变化**（intro/trace/retry 别一个模子）：
  - `intro`：含 meaning 这个词 + 邀请摸一摸。
  - `sound`：默认「{char}。」；多音字或与其他已学字同音的，用「{char}，某词的{char}。」锁定读音（词从 words 里选）。
  - `kaishu`：**目的 3 主战场**，按优先级最多写两层（一句 ≤50 字装得下就都写，装不下先构成/声旁后字理）：
    1. 构成关系：partInfo 里有 `recent:true` 部件且构成明确 → 点出「X 里有刚学过的 Y」或「Y 加 Z 就是 X」；没有 recent 部件就不提构成。
    2. 声旁点题：families 里有声旁族（或说文「从 X，Y 声」公式可证）→「里面藏着 Y，读音和 Y 很像」；声旁字必须是已学的（在 partInfo 或 families 里能对上）。
    3. 说文一行字理：shuowen 条目且内容可靠可懂 → 白话转写成孩子语言（「很久以前，人们说 X 是……」）；文言证据看不懂/拿不准 → 不写这条。
    - 三条都拿不准 → 朴素描述字形（「先写……再写……」级别的白描）。**宁可少说，不可说错。**
  - `order`：笔画 ≤6 画的写「{char}，是这样写的：横，竖……」逐笔名；笔画多的写「{char}，笔画有点多，跟着小红点慢慢走吧。」
  - `trace` / `retry`：鼓励句，不惩罚（无积分扣分挫败语气）。
  - `done`：含本字 + 内容性肯定（呼应 meaning 的场景），无等级奖励。
- 禁止：编造字源、把简化字形讲成古字源（如 们 不是「门口两个人」的古说）、英文数字、超 50 字。

## 流程（每个字）

1. 读 `data/sources/plan-extras.json` 该 id 条目 + 必要时读 `data/sources/shuowen.json` 的相关字头（别整文件读，用 node/grep 按字头查）。
2. 写 `data/chars/<id>.json`。
3. `node scripts/validate.mjs <id>` —— 有错就修到过。
4. 10 个字全部过校验后，**统一补音频**：`uv run --with edge-tts python scripts/gen_audio.py <id1> <id2> ...`（一次 10 个 id；失败重试一次；还失败就在报告里标 audio_pending，别死磕）。
5. `node scripts/validate.mjs <id...> --audio` 收口（audio_pending 的字除外）。

## 只许新建/修改

`data/chars/<你负责的id>.json`（10 个）、`audio/<你负责的id>/`。**其他一律不动**：引擎、lessons.json、upcoming.json、plan、strokes、其他字的文件、tests、openspec、scripts。**不要 git commit，不跑 e2e，不抓任何外网（含 zdic）**——edge-tts 的 uv 调用除外。

## 汇报：`openspec/changes/2026-11-19-mass-1000/reports/gen-<chunk号>.md`

每字一节：id、meaning、kaishu 台词原文、用了目的 3 的哪几层（构成/声旁/字理/朴素）、拿不准的点（明说）。结尾：校验器结果（逐字 pass 数）、audio_pending 清单。返回 StructuredOutput 按任务卡要求的字段。
