import { defineConfig, devices } from '@playwright/test';

// 几个 agent 并行跑测试时，各用各的端口：PORT=4181 pnpm test:e2e
const PORT = Number(process.env.PORT || 4173);

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  // 默认 CPU/2 = 8 个 Chromium 同时跑，墨迹滤镜把 CPU 打满，页面 rAF 被饿死、
  // 快速模式动画在墙上时间被拉得很长，触摸时序类测试就 flake。2 个够用。
  workers: 2,
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
