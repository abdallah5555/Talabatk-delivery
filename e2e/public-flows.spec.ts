import { expect, test } from '@playwright/test';

test('login page is Arabic marketing UI',async({page})=>{
  await page.goto('/login');
  await expect(page.getByText('طلباتك دليفري')).toBeVisible();
  await expect(page.getByRole('button',{name:/دخول|تسجيل الدخول/})).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/بدون sms|بدون بريد|حساب واحد يجمع/i);
});

test('signup route exists and has customer-facing copy',async({page})=>{
  await page.goto('/signup');
  await expect(page.getByRole('button',{name:/إنشاء|تسجيل/})).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/supabase|role|sms|architecture/i);
});

test('PWA manifest and service worker are reachable',async({request})=>{
  const manifest=await request.get('/manifest.json');
  expect(manifest.ok()).toBeTruthy();
  const body=await manifest.json();
  expect(body.display).toBe('standalone');
  const sw=await request.get('/sw.js');
  expect(sw.ok()).toBeTruthy();
  expect(await sw.text()).toContain('.supabase.co');
});
