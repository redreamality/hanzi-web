import { defineConfig, devices } from '@playwright/test';

// 几个 agent 并行跑测试时，各用各的端口：PORT=4181 pnpm test:e2e
const PORT = Number(process.env.PORT || 4173);

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  // 单 worker：双 worker 时 SwiftShader 渲染吃满，多笔画字（森/晴 12 画等）的场景断言
  // 会整批超时（2026-11-19 全量 27 failed 的根因，对照实验见 COSTS.md 本批记录）
  workers: 1,
  use: {
    baseURL: `http://localhost:${PORT}/`,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `node scripts/serve.mjs ${PORT}`,
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: true,
  },
  projects: [
    { name: 'tablet-landscape', use: { ...devices['Desktop Chrome'], viewport: { width: 1180, height: 820 }, hasTouch: true } },
    { name: 'tablet-portrait', use: { ...devices['Desktop Chrome'], viewport: { width: 820, height: 1180 }, hasTouch: true } },
  ],
});
