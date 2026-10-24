import { expect, test } from '@playwright/test';

// Destructive lifecycle verification is restricted to the isolated local copy.
const origin = process.env.DEMO_TEST_ORIGIN;
const local =
  origin && ['127.0.0.1', 'localhost'].includes(new URL(origin).hostname);
test.skip(
  !local || process.env.DEMO_TEST_LIFECYCLE !== 'true',
  'Requires an explicitly enabled local demo copy.',
);

test('reset regenerates the existing story, preserves sessions and leaves business writes blocked', async ({
  page,
  context,
  playwright,
}) => {
  test.setTimeout(600_000);
  const api = `${origin}/main/api`;
  const sales = await playwright.request.newContext();
  expect(
    (
      await sales.post(`${api}/demoMode/accounts/wangxiaofang/signIn`, {
        headers: { Origin: origin! },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await context.request.post(`${api}/demoMode/accounts/admin/signIn`, {
        headers: { Origin: origin! },
      })
    ).status(),
  ).toBe(200);
  await context.addInitScript(() =>
    localStorage.setItem('nocobase.locale:/main/', 'zh-CN'),
  );
  const before = (
    await (await context.request.get(`${api}/leads`)).json()
  ).data.map((row: { id: string }) => row.id);
  const status = async () =>
    (
      await (
        await context.request.get(`${api}/demoMode/data`, { maxRetries: 2 })
      ).json()
    ).data;
  const failures: string[] = [];
  page.on('pageerror', (e) => failures.push(e.message));
  await page.goto(`${origin}/main/settings/demo-data`);
  await expect(page.getByText('每日重置', { exact: true })).toBeVisible({
    timeout: 90_000,
  });
  await page.getByRole('button', { name: '重置', exact: true }).click();
  const response = page.waitForResponse((r) =>
    r.url().endsWith('/demoMode/data/reset'),
  );
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: '重置', exact: true })
    .click();
  expect((await response).status()).toBe(200);
  await expect
    .poll(
      async () => {
        const data = await status();
        expect(data.failure).toBeNull();
        return data.state;
      },
      { timeout: 240_000, intervals: [2000] },
    )
    .toBe('ready');
  await expect(page.getByText('已就绪', { exact: true })).toBeVisible();
  const after = (await (await context.request.get(`${api}/leads`)).json()).data;
  expect(after).toHaveLength(18);
  expect(after.every((row: { id: string }) => !before.includes(row.id))).toBe(
    true,
  );
  expect((await sales.get(`${api}/leads`)).status()).toBe(200);
  expect(
    (
      await sales.post(`${api}/demoMode/data/reset`, {
        headers: { Origin: origin! },
        data: {},
      })
    ).status(),
  ).toBe(403);
  const blocked = await context.request.post(`${api}/leads`, {
    headers: { Origin: origin! },
    data: { name: 'Forbidden' },
  });
  expect(blocked.status()).toBe(400);
  expect((await blocked.json()).error.reason).toBe('DEMO_READ_ONLY');
  expect(
    (await (await context.request.get(`${api}/demoMode/accounts`)).json()).data,
  ).toHaveLength(5);
  const firstCounts = (await status()).counts;
  // A second reset must work too, without losing identities or leaking old rows.
  expect(
    (
      await context.request.post(`${api}/demoMode/data/reset`, {
        headers: { Origin: origin! },
        data: { language: 'zh-CN' },
      })
    ).status(),
  ).toBe(200);
  await expect
    .poll(
      async () => {
        const data = await status();
        expect(data.failure).toBeNull();
        return data.state;
      },
      { timeout: 240_000, intervals: [2000] },
    )
    .toBe('ready');
  expect((await status()).counts).toEqual(firstCounts);
  expect((await status()).counts).toMatchObject({
    crmLeads: 18,
    crmCompanies: 11,
    crmContacts: 22,
    crmOpportunities: 34,
    crmApprovals: 6,
  });
  expect((await sales.get(`${api}/leads`)).status()).toBe(200);
  expect(failures).toEqual([]);
  await page.screenshot({
    path: 'storage/demo-mode-verification/reset-success.png',
    fullPage: true,
  });
  await sales.dispose();
});

test('clear keeps its administrator signed in and able to generate the dataset again', async ({
  page,
  context,
  playwright,
}) => {
  test.setTimeout(300_000);
  const api = `${origin}/main/api`;
  expect(
    (
      await context.request.post(`${api}/demoMode/accounts/admin/signIn`, {
        headers: { Origin: origin! },
      })
    ).status(),
  ).toBe(200);
  await context.addInitScript(() =>
    localStorage.setItem('nocobase.locale:/main/', 'zh-CN'),
  );
  await page.goto(`${origin}/main/settings/demo-data?tab=schedule`);
  await expect(page.getByText('每日重置', { exact: true })).toBeVisible({
    timeout: 90_000,
  });
  await expect(page.getByText('已就绪', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '清空', exact: true }).click();
  const cleared = page.waitForResponse(
    (r) => r.url().endsWith('/demoMode/data/clear'),
    { timeout: 180_000 },
  );
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: '清空', exact: true })
    .click();
  expect((await cleared).status()).toBe(200);
  expect(
    (await context.request.get(`${api}/demoMode/configuration`)).status(),
  ).toBe(200);
  const empty = await context.request.get(`${api}/leads`);
  expect(empty.status()).toBe(200);
  expect((await empty.json()).data).toEqual([]);
  expect(
    (await (await context.request.get(`${api}/demoMode/accounts`)).json()).data,
  ).toEqual([]);
  // Quick entry is hidden while empty; ordinary password sign-in still works.
  const fresh = await playwright.request.newContext();
  expect(
    (
      await fresh.post(`${api}/auth/sign-in/username`, {
        headers: { Origin: origin! },
        data: { username: 'admin', password: 'Demo@2026' },
      })
    ).status(),
  ).toBe(200);
  expect((await fresh.get(`${api}/demoMode/data`)).status()).toBe(200);
  await fresh.dispose();
  await page.getByRole('button', { name: '生成', exact: true }).click();
  const generated = page.waitForResponse((r) =>
    r.url().endsWith('/demoMode/data/import'),
  );
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: '生成', exact: true })
    .click();
  expect((await generated).status()).toBe(200);
  await expect
    .poll(
      async () => {
        const data = (
          await (
            await context.request.get(`${api}/demoMode/data`, { maxRetries: 2 })
          ).json()
        ).data;
        expect(data.failure).toBeNull();
        return data.state;
      },
      { timeout: 180_000, intervals: [2000] },
    )
    .toBe('ready');
  await expect(page.getByText('已就绪', { exact: true })).toBeVisible();
  expect(
    (await (await context.request.get(`${api}/demoMode/accounts`)).json()).data,
  ).toHaveLength(5);
  await page.screenshot({
    path: 'storage/demo-mode-verification/beta2-clear-regenerate.png',
    fullPage: true,
  });
});
