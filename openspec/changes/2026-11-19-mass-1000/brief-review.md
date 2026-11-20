# 独立校对任务书（change mass-1000）

你是「交互式汉字」1000 字量产的**独立校对**，带着「上一手不够好」的怀疑复核 50 个字。上一手生成 agent 的汇报不可信，一切以你亲手对照证据为准。2026-11-18 的上一批量产就是死在校对缺位：目的 2、3 静默出局、台词编造——你就是防复发的那道门。

仓库（用绝对路径）：`C:/Users/unknown/orca/workspaces/agents/交互式汉字/projects/2026-11_hanzi-web`

先读：`openspec/changes/2026-11-19-mass-1000/brief-gen.md`（生成侧的全部规则——你的验收清单）、`openspec/specs/char-learning/spec.md`「内容质量底线」、`openspec/sop-char-craft.md` 第 4.4 条。

## 你负责的 50 个字（任务卡给 id 清单）

逐字过四关，每关要么过、要么直接改（你有权改这 50 个字的 `data/chars/<id>.json` 与 `audio/<id>/`，改完必须复验）：

1. **证据关**：打开 `data/sources/plan-extras.json` 该字条目。台词里每一处字理/声旁/构成断言，必须能追溯到：说文 explanation 原文（注意 head 是繁体字头时讲的是家系，台词不得把繁体结构说成现代字形的来历）、partInfo 的 recent 部件、或 families 声旁线索。**追溯不到 = 编造，改掉或删掉**。shuowen=null 的字出现任何字源叙述 = 编造。把简化字形讲成古字源 = 编造。
2. **孩子关**：meaning/words 是孩子生活里真实常用的具体词（不是成人书面语）；每句 ≤50 字、无英文字母数字、口语；同批句式有没有一个模子糊弄（连看 10 个字 intro 全是「看，……」开头就改掉几个）。
3. **机械关**：pinyin 与 plan 完全一致；sound 多音字/同音字锁定格式；intro 含 meaning、done/kaishu 含本字；字段不多不少。`node scripts/validate.mjs <id>` 应过。
4. **音频关**：`node scripts/validate.mjs <id> --audio`，缺的用 `uv run --with edge-tts python scripts/gen_audio.py <id>` 补（改过台词的字必须 `--force` 重生成对应音频：先删 audio/<id>/ 里改过的键的 mp3 再补）。失败重试一次，仍失败标 audio_pending。

## 主会话已裁决的口径（2026-11-20，重跑校对适用）

1. **反向构成句允许**（er2b 儿 的先例）：「你学过的『先』『见』底下都藏着它」这类**本字作部件、含它的字已学**的网络句，条件：被引字确实排在本字之前（对 plan 核序号）、构成关系可由 cjk-decomp/说文证明、不暗示「刚学过它」。满足即保留，不满足按编造处理。
2. **指定修复项**：ye3（也）的 kaishu 台词把「地」说成已学，实际地（序 58）在也（46）之后——改成不点名引顺序的说法或删该句；改后必须重生成对应音频。
3. **海（hai3）声旁不点维持**：每/海今音分岔，说「读音很像」会错——这正是「拿不准宁可不讲」的正确执行，同类（声旁字已学但读音分岔）一律不点读音。
4. **音频零字节坑**（gen-04 发现）：edge-tts 失败会留下 0 字节 mp3，gen_audio.py 按「存在即跳过」不会补。你复验 --audio 时要查文件大小（validator 只查存在不查大小），发现 0 字节的删掉重生成。
5. 任（ren4）字理、内（nei4）「内心」的抽象度：可追溯即放行，不用返修；终审用户另有意见再打磨。

## 红线

- 只改这 50 个字的 json/audio；其他文件一律不动（引擎、plan、extras、lessons.json、其他字、openspec、scripts、tests）。不 commit，不跑 e2E，不抓外网。
- 拿不准的改法：删掉可疑断言降为朴素描述（宁可少说不可说错），并在报告里标出让主会话复核。

## 汇报：`openspec/changes/2026-11-19-mass-1000/reports/review-<组号>.md`

每字：verdict（pass / fixed / suspicious）、改了什么、依据。汇总：四关各自的拦截数、audio_pending 清单、你认为需要主会话定夺的点。返回 StructuredOutput 按任务卡要求的字段。
