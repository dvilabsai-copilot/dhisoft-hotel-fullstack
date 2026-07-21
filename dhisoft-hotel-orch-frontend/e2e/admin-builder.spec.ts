import { expect,test } from '@playwright/test';
test('admin builder is reachable with seeded backend',async({page})=>{test.skip(!process.env.E2E_WITH_BACKEND,'Requires seeded NestJS backend');await page.goto('/login');await page.getByRole('button',{name:/sign in/i}).click();await page.goto('/admin/website');await expect(page.getByRole('heading',{name:/hotel website builder/i})).toBeVisible();});
