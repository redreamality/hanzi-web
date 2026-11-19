# 造字任务书（change add-remaining-first-batch）

你是儿童识字产品「交互式汉字」的**造字师**，负责手绘一个字的完整课程。孩子 3-8 岁、不识字、在平板上自己玩，全部引导靠旁白——你画的就是他们认识这个字的第一眼。

仓库（所有命令都在这里跑）：`C:/Users/unknown/orca/workspaces/agents/交互式汉字/projects/2026-11_hanzi-web`

## 第一步：先读（按顺序，别跳）

1. `AGENTS.md` —— 红线
2. `openspec/project.md` —— 三目的与硬约束
3. `openspec/specs/char-learning/spec.md` —— 「定制课是「惊艳」基准」「内容质量底线」「动力来自内容」
4. `openspec/specs/hanzi-network/spec.md` —— 「组字拆字关系可见」「字源演变」（合体字必点构成；字源拿不准宁可不做）
5. `src/chars/README.md` —— **接口契约，最重要**
6. 参考实现：`src/chars/ri/`（最完整）、`src/chars/mu/`（最简）；台词风格看 `data/chars/ri.json`、`mu.json`

## 你只许新建/修改这些文件

- `src/chars/<id>/`（index.js + 你自己的辅助 js + style.css）
- `data/chars/<id>.json`
- `audio/<id>/`（`node scripts/gen-audio.mjs <id>` 生成）
- `tests/e2e/<id>.spec.js`
- `shots/<id>/`（截图）

**不得改动**：`data/lessons.json`（已注册好你的字）、`data/chars/<id>.strokes.json`（已放好）、引擎（`src/main.js` `morph.js` `strokes.js` `trace.js` `home.js` `app.js` `progress.js` `util.js`）、其他字的任何文件、`index.html`、根 `styles.css`。**不要 git commit**，主会话统一审、统一提交。

## 画面要求（「惊艳」基准）

- 水墨淡彩：宣纸底、笔墨晕染。实物（picture 层）要让孩子一眼认出、想伸手摸；每个字形变形都要有戏（这个字形当年的来历要在画面里讲出来）；finale 收尾要呼应实物。
- 所有异步动画只用 `src/util.js` 的 `tween(ms, onFrame, { check })` / `wait(ms, { check })`——跟随 `?fast` 加速、换场景可取消。禁用 `setTimeout` 和 CSS transition 控流程。
- 滤镜用现成的 `#ink`、`#wash1`、`#wash2`、`#glow`（定义在 index.html）；要新滤镜/渐变就在自己的文件里建 `<defs>`，id 加 `<id>-` 前缀。
- **楷书终形必须与笔画数据外框对齐**（README 有算法，y 要换成 900 - y），否则切笔顺会「跳」。
- 背景点缀放 `layers.scenery`（1600×1000 的 `#backdrop` 里），`reset()` 时清理干净。
- 地平线/地面阴影要谨慎：波 1 的「林」「休」初版都在场景中部（y≈570-610）留过一条突兀的灰色横线被评审打回——地面要么融进坡地/水岸造型，要么极淡且不横贯整个画面。

## 字形与字源的红线（2026-11-19 用户收紧）

- 甲骨文/小篆形状必须对照真实古文字字形（汉典、国学大师等收录的拓片/字形表），**不凭印象画**；拿不准的字形宁可不画——`forms` 可以只有小篆+楷书，甚至组字+楷书，data.forms 是自由的。
- 字源解释以《说文解字》为第一依据，先查 change 目录的 `etymology.md`（逐字考据表：说文原文、字形依据、给孩子的讲法）；说文未收的后起字只讲形声结构，不虚构字源。
- 旁白不得编造字源；画面与台词必须一致。

## 台词要求（`data/chars/<id>.json` 的 lines）

- 键：`intro`、`sound`、每个字形一条（键 = form id）、`order`、`trace`、`retry`、`done`。`sound` 写「{char}。」，order 写「{char}，是这样写的：{笔画名逐个}。」
- 3-8 岁口语短句；不出现英文字母和数字；每句 ≤ 50 字；参考 ri/mu 的语感。
- **合体字必须点出构成关系**（任务卡给了事实）：哪个部件刚学过、「X 加 Y 就是 Z」。
- 形声字（清、晴）点出声旁：里面藏着的「青」读音和青很像。

## 验收（全部满足才算完成）

1. `PORT=<你的端口> pnpm exec playwright test tests/e2e/<id>.spec.js` **两遍全绿**：`lessonTests('<id>')` + 至少 2 条本字特有测试（仿 `mu.spec.js`：某笔倒写不算、终形对齐等）。
   注意：本机 `pnpm test:e2e -- <file>` **不会过滤**、会跑整套（还会把其他 agent 未完成课程的失败卷进来）——过滤一律用 `pnpm exec playwright test <file>`。
   并行 agent 会让时序敏感的测试偶发失败——先原样重跑一遍再当 bug 查。
2. `node scripts/gen-audio.mjs <id>` 全部台词生成成功。
3. 起服务 `node scripts/serve.mjs <端口>`（后台），`node scripts/shots.mjs <id> <端口> <linger，动画长就 2500+>` 截图到 `shots/<id>/`；**自己逐张看**：出头、遮挡、比例、墨色脏斑这类缺陷要修掉再截（agent 看不了图就把可疑处写进汇报）。
4. 汇报：产出文件清单、测试结果（两遍）、截图路径、拿不准的点（明说，不硬编）。

## 七个字的任务卡

### 明（id: ming，8 画，波 1）
- 构成：**日 + 月 → 明**。组字是本课重头戏：日月两个已学字形汇聚、天色转亮成明。
- 字形路线：甲骨文（日与月并置，主流从日从月）→ 小篆（日左月右定型）→ 楷书。讲法「太阳和月亮在一起，就是明亮」，不引「窗」的异说。
- picture 建议：晨昏天际，太阳与月牙同空。

### 林（id: lin，8 画，波 1）
- 构成：**木 + 木 → 林**，二木并立。演示：两棵树（可用已学的木）并排长出林。
- 字形路线：甲骨文（两木）→ 小篆 → 楷书。
- picture 建议：两棵姿态不同的树。meaning：树林。

### 休（id: xiu，6 画，波 1）
- 构成：**人 + 木 → 休**，人靠着树歇息。演示：人走到树旁靠下。
- 字形路线：甲骨文（人形倚于木侧）→ 小篆 → 楷书。
- picture 建议：一棵大树、有人影倚干。meaning：休息。

### 森（id: sen，12 画，波 2）
- 构成：**木 + 木 + 木 → 森**，三木叠出「树很多很多」。演示：林上再生一木成森。
- 字形路线：甲骨文即三木 → 小篆 → 楷书。
- picture 建议：层层密林、雾气。meaning：森林。

### 青（id: qing，8 画，波 2）
- 颜色字，学术字源（从生从丹）不适合孩子，**不硬讲字源**：讲「青是蓝绿蓝绿的颜色，是草木和远山的颜色」。
- 字形路线建议：小篆 → 楷书（甲骨文不画，红线允许）。
- picture 建议：雨后远山、黛青一层层。meaning：青色。它是后面清、晴的**声旁家族**族长。

### 清（id: qingshui，11 画，波 2）
- 构成：**氵 + 青 → 清**，形声，青表音。演示：水滴融进青色，溪水变清亮。
- 台词点声旁：「清里面藏着一个青，读音和青好像。」
- 字形路线：小篆 → 楷书（组字一步可用「组字」形态代替古文字，form id/label 自定，终形必须 kaishu）。
- picture 建议：清亮见底的溪水。meaning：清水。

### 晴（id: qingtian，12 画，波 2）
- 构成：**日 + 青 → 晴**，形声，青表音。演示：太阳升上青天，雨收云散。
- 台词点声旁家族：「晴里也藏着青，和清是一家人。」
- 字形路线：小篆 → 楷书（同上，组字形态可代替古文字）。
- picture 建议：雨后放晴、云缝金光。meaning：晴天。
