# Tasks：add-second-batch

## 1. 公共准备（主会话）

- [x] lessons.json 注册 10 字（家族聚簇顺序，部件依赖全部满足）
- [x] 10 字笔画数据（hanzi-writer-data）落盘并核对
- [x] etymology.md 预填 10 行（说文待核）
- [x] 造字任务书 brief.md（简化验收协议）
- [x] SOP 记入简化验收模式
- [x] 基线：改动前全量 e2e——254 passed，仅 home.spec×2 失败 = 注册未建字的预期中间态（tiles 11≠21，数据落齐后恢复；同第一批 ff05529 先例）。注意退出码被管道吞过一次（tail），全绿判断以报告文本为准

## 2. 手绘十字（workflow：两批，每批 5 造字 + 1 审校；429 用量墙中断一次，续跑补齐）

- [x] 批一：一 yi（4211）、大 da（4212）、天 tian（4213）、从 cong（4214）、比 bi（4215）——审校 A：4 pass + bi 考据表文档修正
- [x] 批二：北 bei（4217）、众 zhong（4218）、火 huo（4219）、心 xin（4220）、情 qingxin（4221）——审校 B：北考据表补正（𦮃异写）、众 duo 句改词+音频重生成，余 pass
- [x] 各字 reports/<id>.md 落盘；lesson.js 单笔字兼容由主会话统一修（yi 上报）

## 3. 集成与验收（主会话）

- [x] 数据落齐后 home.spec 恢复（build-index 后 lessons=1000）
- [x] 音频齐全（validate --audio 1000 全过）
- [x] 截图（shots/<id>/ × 10）+ 预览 http://localhost:8765 送用户终审
- [x] etymology.md 状态列全部 ✅/⚠️（比/北两处考据表修正已披露）；火族/心族色系已登记
- [ ] project.md 对账表更新；commit（终审通过后统一）
