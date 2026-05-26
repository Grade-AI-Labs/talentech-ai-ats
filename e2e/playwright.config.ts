import { defineConfig, devices } from '@playwright/test';

// The Playwright `webServer.env` field replaces the entire environment for
// the spawned child (it is not merged with `process.env`), so we build a
// scrubbed copy of the parent env that strips every `AZURE_OPENAI_*`
// variable. This guarantees the API picks `StubAIClient` and that the
// match score in `match.spec.ts` is deterministic across runs.
function scrubbedEnv(): Record<string, string> {
  const scrubbed: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('AZURE_OPENAI_')) continue;
    if (typeof value === 'string') {
      scrubbed[key] = value;
    }
  }
  return scrubbed;
}

const apiEnv = scrubbedEnv();
const webEnv = scrubbedEnv();

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm --filter @talentech/api dev',
      url: 'http://127.0.0.1:3000/jobs',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: apiEnv,
      cwd: '..',
    },
    {
      command:
        'pnpm --filter @talentech/web dev -- --host 127.0.0.1 --port 5173',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: webEnv,
      cwd: '..',
    },
  ],
});
