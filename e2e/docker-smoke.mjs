import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { URL } from 'node:url';

const { AbortSignal, console, fetch } = globalThis;

const image = process.argv[2];
if (!image)
  throw new Error('Usage: node e2e/docker-smoke.mjs <image> [base-path]');

const basePath = (process.argv[3] ?? '/main').replace(/\/$/, '');
const container = `nocobase-smoke-${randomBytes(8).toString('hex')}`;

function docker(args) {
  const result = spawnSync('docker', args, {
    encoding: 'utf8',
    timeout: 60_000,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `docker ${args[0]} failed: ${result.stderr || result.stdout}`,
    );
  }
  return result.stdout.trim();
}

async function request(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
  assert.equal(response.status, 200, `Unexpected HTTP status for ${url}`);
  return response;
}

try {
  docker([
    'run',
    '--detach',
    '--name',
    container,
    '--publish',
    '127.0.0.1::13000',
    '--env',
    `AUTH_SECRET=${randomBytes(32).toString('hex')}`,
    '--env',
    `SESSION_SECRET=${randomBytes(32).toString('hex')}`,
    '--env',
    'APP_PUBLIC_ORIGIN=http://localhost:13000',
    image,
  ]);
  const binding = docker(['port', container, '13000/tcp']);
  const origin = `http://${binding}`;
  const healthUrl = `${origin}${basePath}/api/healthz`;
  const deadline = Date.now() + 120_000;
  let ready = false;
  let lastError;
  while (Date.now() < deadline) {
    assert.equal(
      docker(['inspect', '--format', '{{.State.Running}}', container]),
      'true',
      'Container exited during startup',
    );
    try {
      const health = await (await request(healthUrl)).json();
      assert.equal(health.ok, true);
      assert.equal(health.basePath, basePath);
      ready = true;
      break;
    } catch (error) {
      lastError = error;
      await delay(2_000);
    }
  }
  if (!ready)
    throw new Error('Container did not become healthy', { cause: lastError });

  const anonymousCrm = await fetch(`${origin}${basePath}/api/crm/metadata`, {
    signal: AbortSignal.timeout(5_000),
  });
  assert.equal(anonymousCrm.status, 401, 'CRM API must require authentication');
  await anonymousCrm.arrayBuffer();

  const pageUrl = `${origin}${basePath}/`;
  const page = await request(pageUrl);
  assert.match(page.headers.get('content-type') ?? '', /text\/html/);
  const html = await page.text();
  const assets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => new URL(match[1], pageUrl))
    .filter((url) => url.origin === origin && /\.(js|css)$/.test(url.pathname));
  assert.ok(
    assets.some((url) => url.pathname.endsWith('.js')),
    'Missing client entry',
  );
  assert.ok(
    assets.some((url) => url.pathname.endsWith('.css')),
    'Missing client styles',
  );
  for (const url of assets) {
    const asset = await request(url);
    assert.match(
      asset.headers.get('content-type') ?? '',
      url.pathname.endsWith('.css') ? /text\/css/ : /javascript/,
      `Asset request returned the wrong content type: ${url}`,
    );
    await asset.arrayBuffer();
  }

  docker(['stop', '--time', '20', container]);
  const exitCode = Number(
    docker(['inspect', '--format', '{{.State.ExitCode}}', container]),
  );
  assert.ok(
    [0, 143].includes(exitCode),
    `Container did not stop cleanly (exit ${exitCode})`,
  );
  console.log(
    'Docker smoke test passed: health endpoint, CRM authentication, client assets, and clean shutdown.',
  );
} catch (error) {
  spawnSync('docker', ['logs', container], {
    stdio: 'inherit',
    timeout: 10_000,
  });
  throw error;
} finally {
  spawnSync('docker', ['rm', '--force', '--volumes', container], {
    stdio: 'ignore',
    timeout: 10_000,
  });
}
