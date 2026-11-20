import { chromium } from '@playwright/test';
import { writeFileSync, unlinkSync } from 'node:fs';

const REF = 'C:/Users/unknown/orca/workspaces/agents/交互式汉字/projects/2026-11_hanzi-web/openspec/changes/2026-11-19-add-second-batch/refs/';
const IDS = ['ren', 'ming', 'lin', 'sen', 'xiu', 'da', 'cong', 'bi', 'bei', 'huo', 'xin'];
const htmlPath = REF + 'dbg.html';
writeFileSync(htmlPath, `<!doctype html><meta charset="utf-8"><body>
<script type="module">
const bad = [];
for (const id of ${JSON.stringify(IDS)}) {
  try { await import('../../../src/chars/' + id + '/morph.js'); }
  catch (e) { bad.push(id + ': ' + String(e).slice(0, 200)); }
}
window.__BAD = bad;
</script></body>`);
const b = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const p = await b.newPage();
p.on('console', (m) => console.log('CONSOLE:', m.type(), m.text().slice(0, 300)));
p.on('pageerror', (e) => console.log('PAGEERROR:', String(e).slice(0, 300)));
await p.goto('file:///' + htmlPath);
await p.waitForFunction(() => window.__BAD !== undefined, null, { timeout: 12000 }).catch(() => console.log('wait timeout'));
console.log('BAD:', JSON.stringify(await p.evaluate(() => window.__BAD), null, 1));
unlinkSync(htmlPath);
await b.close();
