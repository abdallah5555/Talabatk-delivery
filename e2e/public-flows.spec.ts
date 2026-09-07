import { expect, test } from '@playwright/test';

test('login page is Arabic role-aware marketing UI',async({page})=>{
  await page.goto('/login');
  await expect(page.getByText('طلباتك دليفري')).toBeVisible();
  await expect(page.getByText('كل دور له مكانه')).toBeVisible();
  await expect(page.getByRole('button',{name:/دخول|تسجيل الدخول/})).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/بدون sms|بدون بريد|حساب واحد يجمع|supabase|architecture/i);
});

test('signup offers customer merchant and driver with password confirmation',async({page})=>{
  await page.goto('/signup');
  await expect(page.getByText('عميل',{exact:true})).toBeVisible();
  await expect(page.getByText('تاجر',{exact:true})).toBeVisible();
  await expect(page.getByText('مندوب',{exact:true})).toBeVisible();
  await expect(page.getByLabel('تأكيد كلمة المرور')).toBeVisible();
  await expect(page.getByRole('button',{name:/إنشاء/})).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/supabase|architecture|بدون sms|بدون بريد/i);
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
