import { expect, test } from '@playwright/test';

// Smoke test: open a seeded application, run the AI match, and assert that
// a numeric score and a non-empty reasoning paragraph appear. Because the
// Playwright `webServer` boots the API with no Azure env vars set, the
// `StubAIClient` is forced and scoring is deterministic across runs.

test('runs AI match on a seeded application and shows score + reasoning', async ({
  page,
}) => {
  await page.goto('/');

  await page.getByRole('button', { name: 'Applications' }).click();

  const heading = page.getByRole('heading', { name: 'Applications', level: 2 });
  await expect(heading).toBeVisible();

  const list = page.getByRole('list', { name: 'Applications list' });
  // The seed creates two applications — pick the first one and expand it.
  const firstToggle = list.locator('button.application__toggle').first();
  await expect(firstToggle).toBeVisible();
  await firstToggle.click();

  const panel = page.getByRole('region', { name: 'AI match panel' }).or(
    page.locator('[aria-label="AI match panel"]'),
  );
  await expect(panel).toBeVisible();

  await panel.getByRole('button', { name: 'Run AI match' }).click();

  // After the match resolves the panel must render a numeric score and
  // a reasoning paragraph. Wait until "Match score:" appears, then read
  // the score from its sibling <strong>.
  const scoreLabel = panel.getByText(/Match score:/);
  await expect(scoreLabel).toBeVisible();

  const scoreValue = panel.locator('.match-panel__score strong');
  await expect(scoreValue).toBeVisible();
  const scoreText = (await scoreValue.textContent())?.trim() ?? '';
  const score = Number(scoreText);
  expect(Number.isFinite(score)).toBe(true);
  expect(score).toBeGreaterThanOrEqual(0);
  expect(score).toBeLessThanOrEqual(100);

  const reasoning = panel.locator('.match-panel__reasoning');
  await expect(reasoning).toBeVisible();
  const reasoningText = (await reasoning.textContent())?.trim() ?? '';
  expect(reasoningText.length).toBeGreaterThan(0);
});
