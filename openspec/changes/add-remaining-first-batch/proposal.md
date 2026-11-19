# add-remaining-first-batch：补齐第一版 11 个手绘字

## Why

第一版范围（README / char-learning spec）定的是 11 个字的手绘定制课，当前主线只有日、月、木、人 4 个；明、林、森、休、青、清、晴 7 字此前由已撤回的量产任务以通用课顶替，从未手绘。为恢复「惊艳」基准并演示汉字网络（组字、部首、声旁家族），按原打法补齐。

## What Changes

- `data/lessons.json` 注册 7 字，顺序按网络：日月明 → 木林森 → 人休 → 青清晴。
- 7 个字各建手绘定制课（`src/chars/<id>/` + `data/chars/<id>.json` + 笔画数据 + `audio/` + e2e），每字一个 fresh subagent，任务书 `brief.md` 引用 spec Requirement。
- 不引入通用课引擎（留在 `backup/1000-char` 分支，扩量另行立项）。

## Impact

- `specs/char-learning/spec.md`：Requirement「定制课是「惊艳」基准」由「日月木人 4 个」改为「第一版 11 个全部」。
- 体验面：首页字表从 4 字变 11 字；不动阅读闭环（reading-loop 不在本次范围）。
- 风险：清/晴与青的拼音相同，id 用 `qing` / `qingshui` / `qingtian` 区分（含义化 id，已在 lessons.json 注册）。
