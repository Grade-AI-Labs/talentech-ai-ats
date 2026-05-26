import { expect, test } from '@playwright/test';

// Smoke test: drive the real frontend against the real API and confirm a
// freshly created job appears in the Jobs list. The API is restarted by
// Playwright's `webServer` per run, so the seed state is identical each
// time and the new job is the only one matching the unique title below.

test('creates a new job and shows it in the list', async ({ page }) => {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const newJobTitle = `E2E Test Job ${uniqueSuffix}`;
  const newJobDescription =
    'Created by the Playwright smoke suite to verify the Jobs page end-to-end.';

  await page.goto('/');

  // The Jobs tab is the default landing tab, but click it explicitly so the
  // test is resilient to changes in the default selection.
  await page.getByRole('button', { name: 'Jobs' }).click();

  const heading = page.getByRole('heading', { name: 'Jobs', level: 2 });
  await expect(heading).toBeVisible();

  const form = page.getByRole('form', { name: 'Add job' });
  await form.getByLabel('Title').fill(newJobTitle);
  await form.getByLabel('Description').fill(newJobDescription);
  await form.getByLabel(/Requirements/).fill('TypeScript, Playwright');

  await form.getByRole('button', { name: 'Add job' }).click();

  const list = page.getByRole('list', { name: 'Jobs list' });
  await expect(list.getByText(newJobTitle)).toBeVisible();
});
