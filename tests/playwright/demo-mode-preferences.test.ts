import { expect, test, type BrowserContext } from '@playwright/test';
import { demoAdminUsername } from './support/demo-mode.js';

const origin = process.env.DEMO_TEST_ORIGIN;
test.skip(!origin, 'Set DEMO_TEST_ORIGIN to a dedicated demo deployment.');

async function enter(context: BrowserContext, username = demoAdminUsername) {
  const response = await context.request.post(
    `${origin}/main/api/demoMode/accounts/${username}/signIn`,
    { headers: { Origin: origin! } },
  );
  expect(response.status()).toBe(200);
}

test('plugin preferences follow each visitor across account switches without changing other visitors', async ({
  browser,
  context,
}) => {
  const api = `${origin}/main/api`;
  await enter(context);
  const document = await (await context.request.get(`${api}/swagger`)).json();
  expect(document.paths['/api/users/me/preferences'].patch).toBeDefined();
  const preferences = async (visitor: BrowserContext) => {
    const response = await visitor.request.get(`${api}/users/me/preferences`);
    expect(response.status()).toBe(200);
    return (await response.json()).data;
  };
  const defaults = await preferences(context);
  const chosen = {
    locale: defaults.locale === 'en-US' ? 'zh-CN' : 'en-US',
    'theme.mode': 'dark',
    'theme.preset': 'compact',
  };
  const saved = await context.request.patch(`${api}/users/me/preferences`, {
    headers: { Origin: origin! },
    data: chosen,
  });
  expect(saved.status()).toBe(200);
  expect(await preferences(context)).toMatchObject(chosen);
  const other = await browser.newContext();
  try {
    await enter(other);
    expect(await preferences(other)).toEqual(defaults);
    const accounts = (
      await (await context.request.get(`${api}/demoMode/accounts`)).json()
    ).data as { username: string }[];
    const sales = accounts.find((account) =>
      ['sophie', 'wangxiaofang'].includes(account.username),
    );
    expect(sales).toBeDefined();
    await enter(context, sales!.username);
    expect(await preferences(context)).toMatchObject(chosen);
    expect(await preferences(other)).toEqual(defaults);
  } finally {
    await other.close();
  }
});

test('HTTPS demo entry keeps a usable session inside a different-site iframe', async ({
  page,
}) => {
  test.skip(
    !origin?.startsWith('https:'),
    'Partitioned cookies require HTTPS.',
  );
  const cookies: string[] = [];
  page.on('response', async (response) => {
    if (!response.url().includes('/demoMode/')) return;
    for (const header of await response.headersArray())
      if (header.name.toLowerCase() === 'set-cookie')
        cookies.push(header.value);
  });
  await page.route('https://demo-embed.example/', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: `<iframe title="CRM demo" src="${origin}/main/" width="1280" height="900"></iframe>`,
    }),
  );
  await page.goto('https://demo-embed.example/');
  const frame = page.frameLocator('iframe');
  await expect(
    frame.getByRole('button', { name: /Open account menu|打开账户菜单/ }),
  ).toBeVisible({ timeout: 90_000 });
  const demoFrame = page
    .frames()
    .find((candidate) => candidate.url().startsWith(origin!));
  expect(demoFrame).toBeDefined();
  const session = await demoFrame!.evaluate(async () => {
    const response = await fetch('/main/api/auth/get-session');
    return { status: response.status, body: await response.json() };
  });
  expect(session.status).toBe(200);
  expect(session.body).toMatchObject({ user: { id: expect.any(String) } });
  expect(
    cookies.some(
      (value) =>
        /SameSite=None/i.test(value) &&
        /; Secure/i.test(value) &&
        /; Partitioned/i.test(value),
    ),
  ).toBe(true);
});
