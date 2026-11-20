// 离线核对：morph 楷书形态（ribbon 多边形，纯几何）vs 笔画数据轮廓外框。
// 目标：每笔四边差值 < 30（e2e 容差 42，留余量）。
import { makeStroke, strokeBBox } from '../../src/chars/huo/ribbon.js';
import { KAISHU } from '../../src/chars/huo/forms.js';

// data/chars/huo.strokes.json 轮廓点算出的外框（stage 坐标，y 已换成 900-y）
const OUTLINES = [
  { x0: 204, x1: 342, y0: 357, y1: 531 }, // 点（左火星）
  { x0: 571, x1: 816, y0: 267, y1: 478 }, // 撇（右火星）
  { x0: 160, x1: 554, y0: 105, y1: 872 }, // 撇（主焰）
  { x0: 489, x1: 941, y0: 494, y1: 891 }, // 捺（右焰臂）
];
const PARTS = ['sparkL', 'sparkR', 'main', 'right'];

let worst = 0;
for (let i = 0; i < PARTS.length; i++) {
  const m = strokeBBox(makeStroke(KAISHU[PARTS[i]]));
  const o = OUTLINES[i];
  const diffs = {};
  for (const k of ['x0', 'x1', 'y0', 'y1']) {
    diffs[k] = Math.round(m[k] - o[k]);
    worst = Math.max(worst, Math.abs(diffs[k]));
  }
  console.log(PARTS[i].padEnd(7), JSON.stringify(diffs), ' morph:', JSON.stringify(m));
}
console.log('worst =', worst, worst < 30 ? 'OK' : 'NEEDS TUNING');
