import { expect, test } from '@playwright/test';

test('platform admin can authenticate and load control-plane health', async ({ page }) => {
  test.skip(
    !process.env.E2E_PLATFORM_EMAIL || !process.env.E2E_PLATFORM_PASSWORD,
    'Requires a running seeded backend and explicit platform E2E credentials',
  );

  await page.goto('/platform-login');
  await page.getByLabel('Platform email', { exact: true }).fill(process.env.E2E_PLATFORM_EMAIL!);
  await page.getByLabel('Password', { exact: true }).fill(process.env.E2E_PLATFORM_PASSWORD!);
  await page.getByRole('button', { name: 'Sign in to Control Plane', exact: true }).click();
  await expect(page).toHaveURL(/\/platform-admin$/);
  await expect(page.getByRole('heading', { name: /platform dashboard/i })).toBeVisible();
  await page.goto('/platform-admin/health');
  await expect(page.getByRole('heading', { name: /system health/i })).toBeVisible();
});
