import { expect, test } from '@playwright/test';
import { demoAdminUsername } from './support/demo-mode.js';

const origin = process.env.DEMO_TEST_ORIGIN;
test.skip(!origin, 'Set DEMO_TEST_ORIGIN to the dedicated demo deployment.');

test('plugin settings and account menu use the existing dataset and preserve read-only access', async ({
  page,
  context,
}) => {
  test.setTimeout(240_000);
  const api = `${origin}/main/api`;
  const accounts = await context.request.get(`${api}/demoMode/accounts`, {
    maxRetries: 2,
  });
  expect(accounts.ok()).toBeTruthy();
  const visitors = (await accounts.json()).data as {
    username: string;
    name: string;
  }[];
  const admin = visitors.find(
    (account) => account.username === demoAdminUsername,
  )!;
  expect(admin).toBeDefined();
  const sales = visitors.find((account) =>
    ['sophie', 'wangxiaofang'].includes(account.username),
  )!;
  expect(sales).toBeDefined();
  const login = await context.request.post(
    `${api}/demoMode/accounts/${demoAdminUsername}/signIn`,
    { headers: { Origin: origin! } },
  );
  expect(login.status()).toBe(200);
  expect((await context.request.get(`${api}/swagger`)).status()).toBe(200);
  await context.addInitScript(() =>
    localStorage.setItem('nocobase.locale:/main/', 'zh-CN'),
  );
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${origin}/main/settings/demo-data`);
  await expect(page.getByText('每日重置', { exact: true })).toBeVisible({
    timeout: 90_000,
  });
  await expect(page.getByText('已就绪', { exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: '演示环境', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: '刷新', exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText('没有演示数据', { exact: true })).toHaveCount(0);
  // beta.2 uses the shared clipboard fallback when the secure Clipboard API is absent.
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    }),
  );
  const copy = page.getByRole('button', {
    name: `复制 ${admin.name} 的进入链接`,
    exact: true,
  });
  await copy.click();
  await expect(copy).toHaveText('已复制');
  await page.screenshot({
    path: 'storage/demo-mode-verification/plugin-settings.png',
    fullPage: true,
  });
  // The data card offers no Generate, Clear or Reset: any visitor may be
  // its administrator (demo-environment.tsx).
  for (const name of ['生成', '清空', '重置'])
    await expect(page.getByRole('button', { name, exact: true })).toHaveCount(
      0,
    );
  await expect(
    page.getByRole('tab', { name: '概览', exact: true }),
  ).toHaveCount(0);
  const configuration = (
    await (await context.request.get(`${api}/demoMode/configuration`)).json()
  ).data;
  expect(configuration.schedule.enabled).toBe(true);
  const schedule = page.locator('dl').filter({ hasText: '时区' });
  await expect(schedule).toContainText(configuration.schedule.timezone);
  await expect(schedule).toContainText(
    `${String(configuration.schedule.hour).padStart(2, '0')}:${String(configuration.schedule.minute).padStart(2, '0')}`,
  );

  await page.goto(`${origin}/main/leads`);
  // The header's Demo Mode badge switches accounts (demo-mode-badge.tsx).
  await page.getByRole('button', { name: /演示模式/ }).click();
  await expect(page.getByRole('menuitemradio')).toHaveCount(visitors.length);
  await page.screenshot({
    path: 'storage/demo-mode-verification/account-menu.png',
  });
  const switched = page.waitForResponse((r) =>
    r.url().endsWith(`/demoMode/accounts/${sales.username}/signIn`),
  );
  const salesLoaded = page.waitForEvent('load');
  await page
    .getByRole('menuitemradio', { name: new RegExp(sales.name) })
    .click();
  await salesLoaded;
  expect((await switched).status()).toBe(200);
  await expect(page.getByRole('button', { name: '打开账户菜单' })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page).toHaveURL(`${origin}/main/leads`);
  await expect
    .poll(
      async () =>
        (
          await (
            await context.request.get(`${api}/demoMode/accounts`, {
              maxRetries: 2,
            })
          ).json()
        ).data.find((a: { current: boolean }) => a.current)?.username,
    )
    .toBe(sales.username);
  expect((await context.request.get(`${api}/users`)).status()).toBe(403);
  const write = await context.request.post(`${api}/leads`, {
    headers: { Origin: origin! },
    data: { name: 'Must not be created' },
  });
  expect(write.status()).toBe(400);
  expect((await write.json()).error.reason).toBe('DEMO_READ_ONLY');
  await page.getByRole('button', { name: '打开账户菜单' }).click();
  await page.getByRole('menuitem', { name: /^账号：/ }).hover();
  const adminLoaded = page.waitForEvent('load');
  await page.getByRole('menuitemradio').filter({ hasText: admin.name }).click();
  await adminLoaded;
  await expect
    .poll(
      async () =>
        (
          await (
            await context.request.get(`${api}/demoMode/accounts`, {
              maxRetries: 2,
            })
          ).json()
        ).data.find((a: { current: boolean }) => a.current)?.username,
    )
    .toBe(demoAdminUsername);
  expect(errors).toEqual([]);
});

test('plugin settings remain readable in English and on a narrow dark screen', async ({
  page,
  context,
}) => {
  const login = await context.request.post(
    `${origin}/main/api/demoMode/accounts/${demoAdminUsername}/signIn`,
    { headers: { Origin: origin! } },
  );
  expect(login.status()).toBe(200);
  await context.addInitScript(() => {
    localStorage.setItem('nocobase.locale:/main/', 'en-US');
    localStorage.setItem('nocobase:main:theme:color-scheme', 'dark');
  });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto(`${origin}/main/settings/demo-data`);
  await expect(page.getByText('Daily reset', { exact: true })).toBeVisible({
    timeout: 60_000,
  });
  await expect(
    page.getByRole('heading', { name: 'Demo environment', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Refresh', exact: true }),
  ).toHaveCount(0);
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('body')).not.toContainText('crm.navigation.');
  await page.screenshot({
    path: 'storage/demo-mode-verification/plugin-settings-mobile-dark.png',
    fullPage: true,
  });
  await page.getByRole('button', { name: /Demo mode/ }).click();
  const accounts = (
    await (
      await context.request.get(`${origin}/main/api/demoMode/accounts`)
    ).json()
  ).data;
  await expect(page.getByRole('menuitemradio')).toHaveCount(accounts.length);
  await page.screenshot({
    path: 'storage/demo-mode-verification/account-menu-mobile-dark.png',
  });
});

test('anonymous home entry opens Super Admin and preserves an existing salesperson session', async ({
  page,
  context,
}) => {
  const api = `${origin}/main/api`;
  await context.addInitScript(() =>
    localStorage.setItem('nocobase.locale:/main/', 'en-US'),
  );
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${origin}/main/`);
  await expect(
    page.getByRole('button', { name: 'Open account menu' }),
  ).toBeVisible({ timeout: 90000 });
  expect((await context.request.get(`${api}/users`)).status()).toBe(200);
  const accounts = (
    await (await context.request.get(`${api}/demoMode/accounts`)).json()
  ).data as { username: string; current: boolean }[];
  expect(accounts.some((account) => account.current)).toBe(true);
  const sales = accounts.find((account) =>
    ['sophie', 'wangxiaofang'].includes(account.username),
  )!;
  expect(sales).toBeDefined();
  expect(
    (
      await context.request.post(
        `${api}/demoMode/accounts/${sales.username}/signIn`,
        { headers: { Origin: origin! } },
      )
    ).status(),
  ).toBe(200);
  await page.goto(`${origin}/main/`);
  await expect(
    page.getByRole('button', { name: 'Open account menu' }),
  ).toBeVisible({ timeout: 60000 });
  const current = (
    await (await context.request.get(`${api}/demoMode/accounts`)).json()
  ).data.find((account: { current: boolean }) => account.current);
  expect(current.username).toBe(sales.username);
  expect((await context.request.get(`${api}/users`)).status()).toBe(403);
  expect(errors).toEqual([]);
});
