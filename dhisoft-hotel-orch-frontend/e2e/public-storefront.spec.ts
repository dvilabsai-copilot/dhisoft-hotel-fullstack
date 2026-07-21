import { expect, test } from '@playwright/test';

test('RainWood storefront exposes hotels, offers, gallery and booking', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /memorable stays/i })).toBeVisible();

  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  if (await menu.count() === 1) await menu.click();

  const navigation = page.getByRole('navigation');
  const hotelsLink = navigation.getByRole('link', { name: 'Hotels', exact: true });
  const offersLink = navigation.getByRole('link', { name: 'Offers', exact: true });
  const galleryLink = navigation.getByRole('link', { name: 'Gallery', exact: true });

  await expect(hotelsLink).toHaveCount(1);
  await hotelsLink.click();
  await expect(page.getByRole('heading', { name: /browse rainwood destinations/i })).toBeVisible();
  await offersLink.click();
  await expect(page.getByRole('heading', { name: /book direct and enjoy more/i })).toBeVisible();
  await galleryLink.click();
  await expect(page.getByRole('heading', { name: /experience rainwood/i })).toBeVisible();
});
