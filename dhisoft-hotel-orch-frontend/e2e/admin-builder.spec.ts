import { expect, test } from '@playwright/test';

test('admin builder is reachable with seeded backend', async ({ page }) => {
  test.skip(
    !process.env.E2E_WITH_BACKEND || !process.env.E2E_TENANT_EMAIL || !process.env.E2E_TENANT_PASSWORD,
    'Requires a running seeded backend and explicit local E2E credentials',
  );

  await page.goto('/login');
  await page.getByLabel('Email', { exact: true }).fill(process.env.E2E_TENANT_EMAIL!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_TENANT_PASSWORD!);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await page.goto('/admin/website');
  await expect(page.getByRole('heading', { name: /hotel website builder/i })).toBeVisible();
});
