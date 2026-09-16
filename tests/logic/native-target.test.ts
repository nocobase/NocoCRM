// @vitest-environment node
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';

let root: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'crm-native-target-'));
  mkdirSync(join(root, 'scripts/utils'), { recursive: true });
  mkdirSync(join(root, 'dist/node_modules'), { recursive: true });
  writeFileSync(join(root, 'dist/package.json'), '{"name":"test"}');
  for (const file of ['retarget-native.mjs', 'server-deps.mjs']) {
    copyFileSync(`scripts/utils/${file}`, join(root, 'scripts/utils', file));
  }
});
afterEach(() => rmSync(root, { recursive: true, force: true }));
const run = () =>
  spawnSync(
    process.execPath,
    [
      join(root, 'scripts/utils/retarget-native.mjs'),
      '--target',
      'linux-x64-musl',
    ],
    { encoding: 'utf8' },
  );

it('records the deployment target even without native modules', () => {
  expect(run().status).toBe(0);
  expect(
    JSON.parse(readFileSync(join(root, 'dist/package.json'), 'utf8')).nocobase
      ?.buildTarget,
  ).toEqual({
    platform: 'linux',
    arch: 'x64',
    libc: 'musl',
    nodeMajor: 24,
    nodeAbi: 137,
  });
});

it('retains the musl binary when trimming bundled platform binaries', () => {
  const addon = join(root, 'dist/node_modules/test-addon');
  mkdirSync(addon);
  writeFileSync(join(addon, 'package.json'), '{"name":"test-addon"}');
  for (const platform of ['linux', 'linuxmusl', 'darwin']) {
    writeFileSync(join(addon, `${platform}-x64.node`), platform);
  }
  const result = run();
  expect({ status: result.status, stderr: result.stderr }).toEqual({
    status: 0,
    stderr: '',
  });
  expect(existsSync(join(addon, 'linuxmusl-x64.node'))).toBe(true);
  expect(existsSync(join(addon, 'linux-x64.node'))).toBe(false);
  expect(existsSync(join(addon, 'darwin-x64.node'))).toBe(false);
});
