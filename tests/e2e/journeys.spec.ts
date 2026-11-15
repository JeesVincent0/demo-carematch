import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();
const password = process.env.DEMO_PASSWORD!;
const suffix = Date.now();
const workerEmail = `e2e-worker-${suffix}@carematch.demo`;
const clientEmail = `e2e-client-${suffix}@carematch.demo`;
const city = `Testford${suffix}`;
let worker: Page,
  admin: Page,
  client: Page,
  workerContext: BrowserContext,
  adminContext: BrowserContext,
  clientContext: BrowserContext,
  workerId: string,
  slug: string,
  requestId: string;
async function login(page: Page, email: string) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}
async function register(page: Page, role: 'worker' | 'client', email: string) {
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
test.describe.serial('Complete CareMatch presentation journeys', () => {
  test.beforeAll(async ({ browser }) => {
    workerContext = await browser.newContext();
    adminContext = await browser.newContext();
    clientContext = await browser.newContext();
    worker = await workerContext.newPage();
    admin = await adminContext.newPage();
    client = await clientContext.newPage();
  });
  test('1. Worker registers, saves profile steps and submits private evidence', async () => {
    await register(worker, 'worker', workerEmail);
    await worker.getByLabel('City', { exact: true }).fill(city);
    await worker.getByLabel('Postcode', { exact: true }).fill('SW1A 1AA');
    await worker
      .getByLabel('Short introduction')
      .fill('A thoughtful fictional nurse who brings calm and kindness to everyday care.');
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
        'I am a fictional professional for the CareMatch demo. My approach is calm, thoughtful and built around the routines that make everyday life feel comfortable.',
      );
    await worker.getByRole('button', { name: 'Save & continue' }).click();
    await expect(worker.getByRole('heading', { name: 'Care that works for you.' })).toBeVisible();
    await worker.getByLabel('Indicative hourly rate (£)').fill('27.50');
    await worker.getByRole('checkbox', { name: 'Companionship', exact: true }).check();
    await worker.getByRole('checkbox', { name: 'Hourly Care', exact: true }).check();
    await worker.getByRole('button', { name: 'Save & continue' }).click();
    await expect(
      worker.getByRole('heading', { name: 'A little evidence. Kept private.' }),
    ).toBeVisible();
    for (const name of [
      'Identity document',
      'Right-to-work evidence',
      'Criminal-record-check evidence',
      'Qualification evidence',
    ]) {
      const input = worker.locator('label.upload-label').filter({ hasText: name }).locator('input');
      await input.setInputFiles({
        name: 'sample-evidence.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4\n% FICTIONAL SAMPLE EVIDENCE ONLY\n%%EOF'),
      });
      await expect(worker.getByText(name, { exact: true }).first()).toBeVisible();
    }
    await worker.getByRole('button', { name: 'Save & continue' }).click();
    await worker.getByRole('button', { name: 'Submit for verification' }).click();
    await worker.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(worker).toHaveURL(/\/worker\/verification$/);
    await expect(worker.getByText('Pending', { exact: true })).toBeVisible();
    const w = await db.workerProfile.findFirstOrThrow({ where: { user: { email: workerEmail } } });
    workerId = w.id;
    slug = w.slug;
    expect(w.verificationStatus).toBe('PENDING');
  });
  test('2. Admin reviews each document and approves the application', async () => {
    await login(admin, process.env.ADMIN_EMAIL || 'admin@carematch.demo');
    await admin.goto(`/admin/verifications/${workerId}`);
    await admin.getByRole('button', { name: 'Start review', exact: true }).click();
    await expect(admin.getByText('Under review', { exact: true }).first()).toBeVisible();
    const docs = await db.verificationDocument.findMany({ where: { workerId } });
    expect(docs).toHaveLength(4);
    for (const d of docs) {
      const response = await admin.request.get(`/api/documents/${d.id}`);
      expect(response.status()).toBe(200);
      expect(response.headers()['cache-control']).toBe('private, no-store');
    }
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
    expect(
      (await db.workerProfile.findUniqueOrThrow({ where: { id: workerId } })).verificationStatus,
    ).toBe('APPROVED');
  });
  test('3. Approved worker appears in search without exposing private data', async ({ page }) => {
    await page.goto(`/find-care?location=${city}`);
    await expect(page.getByRole('heading', { name: 'Eleanor DemoJourney' })).toBeVisible();
    await page.getByRole('link', { name: 'View profile', exact: true }).click();
    await expect(page).toHaveURL(`/professionals/${slug}`);
    await expect(page.getByText('£27.50').first()).toBeVisible();
    expect(await page.content()).not.toContain('DEMO-NMC-E2E');
    const doc = await db.verificationDocument.findFirstOrThrow({ where: { workerId } });
    expect((await page.request.get(`/api/documents/${doc.id}`)).status()).toBe(401);
  });
  test('4. Client registers, saves a favourite and sends a care request', async () => {
    await register(client, 'client', clientEmail);
    await client.goto(`/professionals/${slug}`);
    await client.getByRole('button', { name: 'Save professional' }).click();
    await expect(client.getByRole('button', { name: 'Saved', exact: true })).toBeVisible();
    await client.getByLabel('Type of care').selectOption('Companionship');
    await client
      .getByLabel('Preferred date')
      .fill(new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10));
    await client.getByLabel('General location').fill(city);
    await client
      .getByLabel('How can they help?')
      .fill('A fictional visit for conversation and a short walk.');
    await client.getByRole('button', { name: 'Request care', exact: true }).click();
    await expect(client).toHaveURL(/\/client\/requests\//);
    requestId = client.url().split('/').pop()!;
    await expect(client.getByText('Pending', { exact: true })).toBeVisible();
  });
  test('5. Worker accepts and client sees the persisted update', async () => {
    await worker.goto('/worker/requests');
    await worker.getByRole('button', { name: 'Accept', exact: true }).click();
    await worker.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(worker.getByText('Accepted', { exact: true })).toBeVisible();
    await client.goto(`/client/requests/${requestId}`);
    await expect(client.getByText('Accepted', { exact: true })).toBeVisible();
    expect((await db.careRequest.findUniqueOrThrow({ where: { id: requestId } })).status).toBe(
      'ACCEPTED',
    );
    await client.goto('/client/notifications');
    await expect(client.getByRole('heading', { name: 'Request accepted' })).toBeVisible();
  });
  test('6. Role, ownership and CSRF checks deny unauthorised access', async ({ page }) => {
    await client.goto('/admin/dashboard');
    await expect(client.getByRole('heading', { name: 'This area is restricted' })).toBeVisible();
    const base = process.env.NEXTAUTH_URL!;
    const forbidden = await client.request.post('/api/actions/review', {
      headers: { Origin: base },
      data: { id: workerId, status: 'SUSPENDED', notes: 'Not authorised to do this' },
    });
    expect(forbidden.status()).toBe(403);
    const csrf = await client.request.post('/api/actions/notifications', {
      headers: { Origin: 'https://untrusted.example' },
      data: {},
    });
    expect(csrf.status()).toBe(403);
    await page.goto('/admin/dashboard');
    await expect(page).toHaveURL(/\/login$/);
    const otherRequest = await db.careRequest.findFirstOrThrow({
      where: { client: { user: { email: 'olivia@carematch.demo' } } },
    });
    await client.goto(`/client/requests/${otherRequest.id}`);
    await expect(client.getByRole('heading', { name: 'This page isn’t available.' })).toBeVisible();
    const doc = await db.verificationDocument.findFirstOrThrow({ where: { workerId } });
    expect((await client.request.get(`/api/documents/${doc.id}`)).status()).toBe(404);
  });
  test('7. Suspended and rejected professionals stay out of public search', async ({ page }) => {
    await admin.goto(`/admin/verifications/${workerId}`);
    await admin.getByRole('button', { name: 'Suspend professional', exact: true }).click();
    await admin.getByLabel('Reason').fill('Fictional restriction for automated demo testing.');
    await admin.getByRole('button', { name: 'Confirm decision' }).click();
    await expect(admin.getByText('Suspended', { exact: true }).first()).toBeVisible();
    await page.goto(`/find-care?location=${city}`);
    await expect(page.getByRole('heading', { name: 'Let’s try a wider search.' })).toBeVisible();
    const response = await page.goto(`/professionals/${slug}`);
    expect(response?.status()).toBe(404);
    const rejected = await db.workerProfile.findFirstOrThrow({
      where: { verificationStatus: 'REJECTED' },
    });
    expect((await page.goto(`/professionals/${rejected.slug}`))?.status()).toBe(404);
  });
  test.afterAll(async () => {
    await workerContext?.close();
    await adminContext?.close();
    await clientContext?.close();
    const users = await db.user.findMany({ where: { email: { in: [workerEmail, clientEmail] } } });
    const ids = users.map((u) => u.id);
    const workers = await db.workerProfile.findMany({ where: { userId: { in: ids } } });
    const wids = workers.map((w) => w.id);
    const docs = await db.verificationDocument.findMany({ where: { workerId: { in: wids } } });
    const requests = await db.careRequest.findMany({
      where: { OR: [{ workerId: { in: wids } }, { client: { userId: { in: ids } } }] },
    });
    await db.auditLog.deleteMany({
      where: {
        OR: [
          { actorId: { in: ids } },
          {
            entityId: {
              in: [...ids, ...wids, ...docs.map((d) => d.id), ...requests.map((r) => r.id)],
            },
          },
        ],
      },
    });
    await db.careRequest.deleteMany({ where: { id: { in: requests.map((r) => r.id) } } });
    await db.verificationReview.deleteMany({
      where: { OR: [{ reviewedBy: { in: ids } }, { workerId: { in: wids } }] },
    });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    const { unlink } = await import('node:fs/promises');
    const { resolve } = await import('node:path');
    for (const d of docs)
      await unlink(resolve(process.env.UPLOAD_DIR || '.local/uploads', d.privateStorageKey)).catch(
        () => {},
      );
    await db.$disconnect();
  });
});
test('Public pages and responsive layouts render without broken images or overflow', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
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
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: 'test-results/home-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  await page.goto('/find-care');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  const images = await page
    .locator('img')
    .evaluateAll((imgs) =>
      imgs.every(
        (i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0,
      ),
    );
  expect(images).toBe(true);
  expect(errors).toEqual([]);
});
