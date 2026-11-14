# 每个字一个目录：src/chars/<id>/

引擎（`src/main.js`）负责流程：开始 → 实物（picture）→ `data.forms` 里的每个字形 → 笔顺（order）→ 描红（trace）→ 完成（done）。
每个字只需要提供自己的画面。参考实现是 `ri/`（日）。

## 一个字要有的文件

| 文件 | 内容 |
|---|---|
| `src/chars/<id>/index.js` | 导出 `createLesson`，见下 |
| `src/chars/<id>/style.css` | 本字专用的 CSS（引擎总会加载，没有内容也要建一个空文件） |
| `data/chars/<id>.json` | 字、拼音、`forms`（字形列表）、`lines`（旁白），格式照抄 `ri.json` |
| `data/chars/<id>.strokes.json` | 笔画数据：`https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0/<字>.json`，原样保存 |
| `audio/<id>/*.mp3` | `node scripts/gen-audio.mjs <id>` 按 `lines` 生成 |
| `tests/e2e/<id>.spec.js` | 至少 `lessonTests('<id>')`，再加本字特有的测试 |

`lines` 必须有这些键：`intro`、`sound`、`order`、`trace`、`retry`、`done`，以及 `forms` 里每个字形的 `id`。
`id` 用拼音（不带声调的小写字母），要先出现在 `data/lessons.json` 里。

## createLesson({ layers, data, kaishu }) 返回

```js
{
  picture: {
    root,               // 整个实物的 <g>，引擎读它的 opacity 判断实物是否可见
    body,               // 接收点击的元素，引擎会给它加 data-testid="picture"
    appear(check),      // 实物出现的动画
    pulse(),            // 被点一下 / 提醒时的反馈
  },
  toForm(formId, check),           // 从上一个样子变成这个字形，按 data.forms 的顺序调用
  fadeForms(opacity, ms, check),   // 笔顺动画开始前把字形压淡（0.12），结束后淡出（0）
  finale(check),                   // 描红写完后的收尾画面
  reset(),                         // 回到初始状态（「再看一遍」「写一写」都会调用）
}
```

- 所有异步动画都用 `src/util.js` 的 `tween(ms, onFrame, { check })` / `wait(ms, check)`：它们会跟着 `?fast` 加速，并在换场景时通过 `check` 取消。不要用 `setTimeout` 或 CSS transition 来控制流程。
- 图层（都在 1024 见方的 `#stage` 里，坐标与笔画数据经 `translate(0 900) scale(1 -1)` 对齐）：
  - `layers.picture`：实物。只有这一层接收点击。
  - `layers.morph`：古文字字形，已套墨迹滤镜 `url(#ink)`。
  - `layers.scenery`：背景 `#backdrop`（1600×1000，远山上方）里的空组，可以放本字的背景点缀（如夜空、树林）。`reset()` 时自己清理。
  - 其余图层（kaishu、grid、ghost、trace、hint、stamp）归引擎管，不要动。
- 可用的 SVG 滤镜（定义在 `index.html`）：`#ink`（墨迹）、`#wash1`、`#wash2`（水彩晕染）、`#glow`（大范围柔光）。需要新的滤镜或渐变，在自己的 `index.js` 里建 `<defs>`，id 加上本字前缀避免冲突。
- 楷书字形最后一步要和真实笔画的外框对齐，否则切到笔顺动画时会「跳」。外框可以从 `data.strokes` 的轮廓点算出来（y 要换成 `900 - y`）。
