# 交互式汉字

> 行为约束（三目的、硬约束、实现状态对账）以 `openspec/` 为唯一事实来源，先看 `openspec/project.md`。本 README 的「现状/下一步」服从于 project.md 的对账表。

## 目标

1. 让 3-8 岁的孩子有趣地认识并记住汉字。
2. 培养阅读兴趣：在只用已学字写成的故事里复习学过的字。
3. 把汉字连成网络，知其然也知其所以然：部首归类、声旁家族、字源演变、组字拆字。

## 已确定的方案（2026-11-14 与用户澄清）

| 方面 | 决定 |
|---|---|
| 用户 | 几个 3-8 岁的孩子，每人一个档案；孩子自己用平板玩，靠语音引导，操作要极简 |
| 学习顺序 | 按汉字网络：先学象形字和基础部件，再扩展到合体字 |
| 动力 | 不设积分和排行，不限时长，靠内容本身吸引孩子 |
| 阅读 | 开发时按学习阶段批量预生成故事，审核后放进仓库；每篇只用该阶段已学的字 |
| 语音 | 开发时用 TTS 预生成字音和故事朗读，多音字人工校对 |
| 画面 | 以 HTML/JS（SVG/Canvas）手绘动画为主；Qwen-Image（见 2026-11_image-gen）和授权清楚的开源古文字字形作补充 |
| 视觉风格 | 水墨淡彩：宣纸底色、笔墨晕染 |
| 书写 | 手指描红加笔顺动画 |
| 部署 | 公开仓库加 GitHub Pages（这是「仓库默认私有」规则的例外，用户已同意）；纯静态，没有后端，不放 API 密钥 |
| 进度 | 存在平板浏览器（localStorage/IndexedDB）里，家长端可以导出、导入备份文件 |

## 第一版范围：先用少量字做出惊艳效果

| 网络层 | 演示 | 字 |
|---|---|---|
| 字源演变 | 实物 → 甲骨文 → 楷书的变形动画 | 日 月 木 人 |
| 组字和拆字 | 日 + 月 → 明（天空亮起）；木 → 林 → 森 | 明 林 森 |
| 部首归类 | 人靠在树旁是「休」，引出「亻」是「人」的变体 | 休 |
| 声旁家族 | 青 + 氵/日 → 清、晴，读音相近、意思不同 | 青 清 晴 |

学完以后读一篇只用这些字的小故事（例如「日月明。人在林中休。」），点任意一个字都能回到它的动画。

## 现状

已完成 4 个象形字：日、月、木、人（每个字一课，`/?c=<id>` 选字；月、木、人由独立 subagent 并行制作）。

首页（不带 `?c` 或 id 不认识时）：学过的字排成字卡，点一下读字音再进课；写完一个字后首页上盖「会」字印（存在 localStorage 的 `hanzi.done`）；`data/upcoming.json` 里还没做的字淡淡排在下面，点不了。课里底部多了一个「回首页」按钮。成本记录见 `COSTS.md`。

- `src/`：`app.js` 是入口，按 `?c` 分到首页 `home.js` 或一课 `main.js`；`progress.js` 记写会了哪些字；`morph.js` 用超椭圆参数插值做字形变形；`strokes.js` 是笔顺和描红判定；`trace.js` 是手势；`main.js` 是流程。
- `data/chars/<id>.json` 放读音和旁白；`<id>.strokes.json` 是 hanzi-writer-data（源自 Make Me a Hanzi，Arphic 许可）的笔画。
- `audio/<id>/` 是 edge-tts（zh-CN-XiaoxiaoNeural）预生成的旁白。

## 下一步

1. 用户确认「日」的效果和水墨风格（尤其要在真实平板上听一听、写一写）。
2. 补齐其余 10 个字的动画、组字交互、描红。
3. 写小故事，预生成音频，做家长端（档案、导出导入；首页的「会」字印目前不分孩子）。
4. 部署到 GitHub Pages，交给孩子试玩，再决定怎么扩展字表。

## 数据来源与许可

- `data/chars/*.strokes.json`：笔画数据来自 [hanzi-writer-data](https://github.com/chanind/hanzi-writer-data)，源自 [Make Me a Hanzi](https://github.com/skishore/makemeahanzi)，按 Arphic Public License 发布，许可全文见 `data/chars/ARPHICPL.TXT`。
- `audio/`：用微软 Edge TTS 生成。

## 怎么运行或验证

```
pnpm install
pnpm dev                      # http://localhost:4173/ ，加 ?fast 让动画和语音瞬间结束
pnpm test:e2e                 # Playwright，横屏和竖屏平板各跑一遍，共 92 项（含首页 6 项）
pnpm audio [字id] [--force]   # 重新生成旁白，需要 uv
node scripts/shots.mjs        # 先 pnpm dev，再按真实速度截图到 shots/
```
