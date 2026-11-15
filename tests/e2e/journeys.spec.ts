import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import type { DemoData } from '../../src/lib/demo/types';
import seed from '../../src/data/demo.json';
const password = 'CareMatch-Demo-2026!';
const suffix = Date.now();
const workerEmail = `worker-${suffix}@demo.test`;
const clientEmail = `client-${suffix}@demo.test`;
const city = `Testford${suffix}`;
let context: BrowserContext,
  worker: Page,
  admin: Page,
  client: Page,
  visitor: Page,
  workerId: string,
  slug: string,
  requestId: string;
const data = (page: Page) =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem('carematch-demo-v1') || '{}'),
  ) as Promise<DemoData>;
async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
async function register(page: Page, role: 'client' | 'worker', email: string) {
  await page.goto(`/register/${role}`);
  await page
    .getByLabel('First name', { exact: true })
    .fill(role === 'worker' ? 'Eleanor' : 'Arthur');
  await page.getByLabel('Last name', { exact: true }).fill('DemoJourney');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Phone number').fill('07700 900123');
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create your account' }).click();
  await expect(page).toHaveURL(role === 'worker' ? /\/worker\/onboarding/ : /\/client\/dashboard/);
}
test.describe.serial('JSON-only demo journeys', () => {
  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    worker = await context.newPage();
    admin = await context.newPage();
    client = await context.newPage();
    visitor = await context.newPage();
  });
  test('1. Register worker, persist onboarding steps and add browser-only evidence', async () => {
    await register(worker, 'worker', workerEmail);
    await worker.getByLabel('City', { exact: true }).fill(city);
    await worker.getByLabel('Postcode', { exact: true }).fill('SW1A 1AA');
    await worker
      .getByLabel('Short introduction')
      .fill('A thoughtful fictional nurse bringing calm and kindness to everyday routines.');
    await worker.getByRole('button', { name: 'Save & continue' }).click();
    await expect(worker.getByRole('heading', { name: 'Share your experience.' })).toBeVisible();
    await worker.getByLabel('Professional title').fill('Community nurse');
    await worker.getByLabel('Years of experience').fill('8');
    await worker.getByLabel('Qualifications (comma-separated)').fill('Fictional BSc Adult Nursing');
    await worker.getByLabel('Skills (comma-separated)').fill('Companionship, Mobility support');
    await worker.getByLabel('NMC registration number').fill('DEMO-NMC-E2E');
    await worker
      .getByLabel('About you')
      .fill(
        'I am a fictional professional for this browser demonstration. My care approach is calm and thoughtful, with a focus on comfortable everyday routines.',
      );
    await worker.getByRole('button', { name: 'Save & continue' }).click();
    await expect(worker.getByRole('heading', { name: 'Care that works for you.' })).toBeVisible();
    await worker.getByLabel('Indicative hourly rate (£)').fill('27.50');
    await worker.getByRole('checkbox', { name: 'Companionship', exact: true }).check();
    await worker.getByRole('checkbox', { name: 'Hourly Care', exact: true }).check();
    await worker.getByRole('button', { name: 'Save availability', exact: true }).click();
    await worker.getByRole('button', { name: 'Save & continue' }).click();
    await expect(
      worker.getByRole('heading', { name: 'Sample evidence, stored in this browser.' }),
    ).toBeVisible();
    for (const name of [
      'Identity document',
      'Right-to-work evidence',
      'Criminal-record-check evidence',
      'Qualification evidence',
    ]) {
      await worker
        .locator('label.upload-label')
        .filter({ hasText: name })
        .locator('input')
        .setInputFiles({
          name: 'sample-evidence.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('%PDF-1.4\n% FICTIONAL SAMPLE ONLY\n%%EOF'),
        });
      await expect(worker.getByText(name, { exact: true }).first()).toBeVisible();
    }
    await worker.getByRole('button', { name: 'Save & continue' }).click();
    await worker.getByRole('button', { name: 'Submit for verification' }).click();
    await worker.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(worker).toHaveURL(/\/worker\/verification$/);
    await expect(worker.getByText('Pending', { exact: true }).first()).toBeVisible();
    const state = await data(worker);
    const user = state.users.find((u) => u.email === workerEmail)!;
    const w = state.workers.find((w) => w.userId === user.id)!;
    workerId = w.id;
    slug = w.slug;
    expect(w.registrationNumber).toBe('DEMO-NMC-E2E');
    expect(w.availability).toHaveLength(7);
    await worker.reload();
    await expect(worker.getByText('Pending', { exact: true }).first()).toBeVisible();
  });
  test('2. Admin in another tab reviews evidence and approves the JSON profile', async () => {
    await login(admin, 'admin@carematch.demo');
    await admin.goto(`/admin/verifications/${workerId}`);
    await admin.getByRole('button', { name: 'Start review', exact: true }).click();
    await expect(admin.getByText('Under review', { exact: true }).first()).toBeVisible();
    expect((await data(admin)).documents.filter((d) => d.workerId === workerId)).toHaveLength(4);
    expect(
      await admin.getByRole('link', { name: 'Download sample ↗' }).first().getAttribute('href'),
    ).toMatch(/^data:application\/pdf/);
    for (let i = 0; i < 4; i++) {
      await admin.getByRole('button', { name: 'Mark reviewed', exact: true }).first().click();
      await admin.getByRole('button', { name: 'Confirm', exact: true }).click();
      await expect(admin.getByRole('button', { name: 'Mark reviewed', exact: true })).toHaveCount(
        3 - i,
      );
    }
    await admin.getByRole('button', { name: 'Approve application' }).click();
    await admin.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(admin.getByText('Approved', { exact: true }).first()).toBeVisible();
    await expect(worker.getByText('Approved', { exact: true }).first()).toBeVisible();
  });
  test('3. Approved professional appears in search and reload keeps changes', async () => {
    await visitor.goto(`/find-care?location=${city}`);
    await expect(visitor.getByRole('heading', { name: 'Eleanor DemoJourney' })).toBeVisible();
    await visitor.reload();
    await expect(visitor.getByRole('heading', { name: 'Eleanor DemoJourney' })).toBeVisible();
    await visitor.getByRole('link', { name: 'View profile', exact: true }).click();
    await expect(visitor).toHaveURL(`/professionals/${slug}`);
    await expect(visitor.getByText('£27.50').first()).toBeVisible();
    await expect(visitor.getByText('DEMO-NMC-E2E', { exact: true })).toHaveCount(0);
  });
  test('4. Client registers, saves favourite and sends a demo request', async () => {
    await register(client, 'client', clientEmail);
    await client.goto(`/professionals/${slug}`);
    await client.getByRole('button', { name: 'Save professional' }).click();
    await expect(client.getByRole('button', { name: 'Saved', exact: true })).toBeVisible();
    await client.getByLabel('Type of care').selectOption('Companionship');
    await client
      .getByLabel('Preferred date')
      .fill(new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10));
    await client.getByLabel('General location').fill(city);
    await client
      .getByLabel('How can they help?')
      .fill('A fictional visit for conversation and a short walk.');
    await client.getByRole('button', { name: 'Request care', exact: true }).click();
    await expect(client).toHaveURL(/\/client\/requests\//);
    requestId = client.url().split('/').pop()!;
    await expect(client.getByText('Pending', { exact: true })).toBeVisible();
  });
  test('5. Worker accepts and the client sees the cross-tab update', async () => {
    await worker.goto('/worker/requests');
    await worker.getByRole('button', { name: 'Accept', exact: true }).click();
    await worker.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(worker.getByRole('article').getByText('Accepted', { exact: true })).toBeVisible();
    await expect(client.getByText('Accepted', { exact: true })).toBeVisible();
    expect((await data(client)).requests.find((r) => r.id === requestId)?.status).toBe('ACCEPTED');
    await client.goto('/client/notifications');
    await expect(client.getByRole('heading', { name: 'Request accepted' })).toBeVisible();
  });
  test('6. Demo role and ownership screens remain distinct', async () => {
    await client.goto('/admin/dashboard');
    await expect(client.getByRole('heading', { name: 'This area is restricted' })).toBeVisible();
    await visitor.goto('/admin/dashboard');
    await expect(visitor).toHaveURL(/\/login$/);
    await client.goto(`/client/requests/${seed.requests[0].id}`);
    await expect(client.getByRole('heading', { name: 'This page isn’t available.' })).toBeVisible();
  });
  test('7. Suspended and rejected workers are hidden from the demo marketplace', async () => {
    await admin.goto(`/admin/verifications/${workerId}`);
    await admin.getByRole('button', { name: 'Suspend professional', exact: true }).click();
    await admin.getByLabel('Reason').fill('Fictional restriction for demo testing.');
    await admin.getByRole('button', { name: 'Confirm decision' }).click();
    await expect(admin.getByText('Suspended', { exact: true }).first()).toBeVisible();
    await visitor.goto(`/find-care?location=${city}`);
    await expect(visitor.getByRole('heading', { name: 'Let’s try a wider search.' })).toBeVisible();
    await visitor.goto(`/professionals/${slug}`);
    await expect(
      visitor.getByRole('heading', { name: 'This page isn’t available.' }),
    ).toBeVisible();
    const rejected = seed.workers.find((w) => w.verificationStatus === 'REJECTED')!;
    await visitor.goto(`/professionals/${rejected.slug}`);
    await expect(
      visitor.getByRole('heading', { name: 'This page isn’t available.' }),
    ).toBeVisible();
  });
  test('8. Another browser has its own seed; reset restores this browser', async ({ page }) => {
    await page.goto(`/find-care?location=${city}`);
    await expect(page.getByRole('heading', { name: 'Let’s try a wider search.' })).toBeVisible();
    await admin.goto('/admin/settings');
    await admin.getByRole('button', { name: 'Reset this browser’s demo' }).click();
    await admin.getByRole('button', { name: 'Reset demo', exact: true }).click();
    await expect(admin).toHaveURL('/');
    await expect(admin.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await admin.evaluate(() => localStorage.getItem('carematch-demo-v1'))).toBeNull();
  });
  test.afterAll(async () => {
    await context?.close();
  });
});
test('Public pages and desktop/mobile layouts render without browser errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View profile', exact: true })).toHaveCount(4);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'test-results/home-desktop.png', fullPage: true });
  for (const path of [
    '/about',
    '/services',
    '/services/home-nursing',
    '/how-it-works',
    '/become-a-professional',
    '/faq',
    '/contact',
    '/privacy',
    '/terms',
    '/find-care',
  ]) {
    expect((await page.goto(path))?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'View profile', exact: true })).toHaveCount(4);
  await page.screenshot({ path: 'test-results/home-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  await page.goto('/find-care');
  await expect(page.getByRole('link', { name: 'View profile', exact: true })).toHaveCount(6);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});
