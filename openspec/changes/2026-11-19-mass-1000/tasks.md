# Tasks：mass-1000

## 1. 基建（subagent: infra-pipeline，✅ 完成）

- [x] build-list 跑绿（主族聚簇 + 断言）→ plan-1000.json（21 bespoke + 979 通用；deferred 仅湖，显式记录）
- [x] sync-strokes：979 个笔画文件
- [x] build-shuowen：data/sources/shuowen.json（9815 字头；源数据坏条目 4 例已修——细/终/朝/听，根因在 shuowen.org 源文件）
- [x] build-extras：plan-extras.json（direct 552 / via 293 / manual 29 / ambiguous 9 / null 96；recent 方向 bug 已修：171→83 违例 0）

## 2. 量产 workflow（✅ 完成；429 用量墙致校对轮中断一次，已续跑补齐）

- [x] 生成 98 批 ×10 字（含一次认领撞车 jin4/jun1，已裁定收口）
- [x] 独立校对 20 组（第 4 组首轮完成，余 19 组续跑补齐）：拦编造 38 处
- [x] 裁决横扫（rulings-v2.md 十一条 + enforcer）：读音断言 16 字降档、未学引用 50 字修正
- [x] 「刚学过」序差收紧（recent-tightener）：8 句（含忙-亡未学引用误记更正）
- [x] 字理补账（zili-backfill）：上/下/星/春/年/法/学 7 字全部落实（序号合规核对过），音频重生成，全量复验 1000 全过

## 3. 集成与验收（主会话）

- [x] `node scripts/validate.mjs --audio` 全量绿（1000/1000，含音频；零字节 mp3 实际为 0）
- [x] build-index --strict：lessons.json/index.json 1000 条，upcoming 24 字（等手绘批结束后执行 ✓）
- [x] check-generic 抽样 5 字 DOM 体检全绿（de/fa1/jun1/xiang3b/yan1）
- [x] 千字首页冒烟：无 JS 错误、无溢出、新档案首卡=日
- [x] 预览：http://localhost:8765（沿用第一批的静态服务，按请求读盘即新版）
- [ ] 截图/预览送用户终审（手绘 10 字 shots/ 齐全；通用课走 8765 实玩）
- [ ] project.md 对账表更新、hanzi-web README 刷新、总部 AGENTS.md 索引行更新；commit（终审通过后）
