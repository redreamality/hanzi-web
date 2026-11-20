// 把拓片 SVG 栅格化成 ASCII 密度图（黑像素占比 → 字符），直接在终端看结构。
import { chromium } from '@playwright/test';

const files = [
  ['zy_jiaguwen_42_ECBF.svg', '甲骨1'],
  ['zy_jiaguwen_42_ECC1.svg', '甲骨2'],
  ['zy_jiaguwen_42_ECC4.svg', '甲骨3'],
  ['zy_jiaguwen_42_ECC5.svg', '甲骨4'],
  ['zy_jiaguwen_42_ECCC.svg', '甲骨5'],
  ['zy_jinwen_33_EB47.svg', '金文1'],
  ['zy_jinwen_33_EB48.svg', '金文2'],
  ['zy_jinwen_33_EB4A.svg', '金文3'],
  ['zy_jinwen_33_EB4C.svg', '金文4'],
  ['zy_jinwen_33_EB4D.svg', '金文5'],
  ['swxz_5FC3.svg', '说文小篆拓片'],
  ['zy_xiaozhuan_27_5FC3.svg', '小篆字形'],
];
const W = 44, H = 44; // 网格
const CHARS = ' .:-=+*#%@';

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage();
await page.goto('file:///C:/Users/unknown/orca/workspaces/agents/%E4%BA%A4%E4%BA%92%E5%BC%8F%E6%B1%89%E5%AD%97/projects/2026-11_hanzi-web/refs/xin/board.html');
for (const [f, label] of files) {
  const rows = await page.evaluate(async ([f, W, H, CHARS]) => {
    const img = new Image();
    img.src = 'file:///C:/Users/unknown/orca/workspaces/agents/%E4%BA%A4%E4%BA%92%E5%BC%8F%E6%B1%89%E5%AD%97/projects/2026-11_hanzi-web/refs/xin/' + f;
    await img.decode();
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(img, 0, 0, W, H);
    const d = ctx.getImageData(0, 0, W, H).data;
    const rows = [];
    for (let y = 0; y < H; y++) {
      let line = '';
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const lum = (d[i] + d[i + 1] + d[i + 2]) / 3;
        const dark = 1 - lum / 255;
        line += CHARS[Math.min(CHARS.length - 1, Math.floor(dark * CHARS.length))];
      }
      rows.push(line);
    }
    return rows;
  }, [f, W, H, CHARS]);
  console.log('===== ' + label + ' (' + f + ') =====');
  console.log(rows.join('\n'));
}
await browser.close();
