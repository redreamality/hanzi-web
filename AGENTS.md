# 约束入口（先读这个再做任何事）

本仓库的产品行为以 **Open Spec** 为唯一事实来源：

1. 先读 `openspec/project.md`——三目的、硬约束（非目标）、实现状态对账。
2. 动手前读 `openspec/specs/` 里与你改动相关的 spec；场景（Scenario）就是验收标准。
3. 改行为走 Open Spec 流程：在 `openspec/changes/<id>/` 立 change（proposal → tasks → spec 增量），实现并验证后 `openspec archive` 合入 specs，同步更新 project.md 的对账表。

## 红线

- **终审未通过的内容不得 push 到 main**：GitHub Pages 从 main 自动构建，push 即发布上线（2026-11-20 曾把未审阅的 1000 字量产直接推上线，次日被用户发现后 force push 回退）。批量产物、返修、新字一律先推 `review/*` 或 feature 分支，用户终审通过后才能合入 main 并 push。
- 任何改动必须服务三目的之一；与目的冲突、或以削弱另一条为代价的方案，**先向用户确认，不得静默降级**（2026-11-18 的 1000 字任务曾发生过目的 2、3 静默出局）。
- 造字任务（手绘、通用课、返修、批量 workflow）必须按 `openspec/sop-char-craft.md` 执行：考据以《说文》与拓片为准、逐字登记 etymology，审美红线逐条对照，验收用数字不用形容词。
- 批量生成内容（workflow / subagent）的任务书必须引用对应 spec 的 Requirement；完成标准是验收场景通过（校验器 / e2e），不是「文件已生成」。
- 不编造字源和笔画说法；面向孩子的台词无英文字母和数字。
- 不引入后端、不加积分排行限时、不放进任何密钥。
- 沟通用中文；包管理 pnpm；改交互细节必须配对应 e2e 测试。
