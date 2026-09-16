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
import { dirname, join } from 'node:path';
import { afterEach, beforeEach, expect, it } from 'vitest';

let root: string;
let plugin: string;
let script: string;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'crm-container-dist-'));
  plugin = join(root, 'dist/node_modules/@nocobase/app-plugin-test');
  script = join(root, 'scripts/utils/prepare-container-dist.mjs');
  mkdirSync(dirname(script), { recursive: true });
  copyFileSync('scripts/utils/prepare-container-dist.mjs', script);
});
afterEach(() => rmSync(root, { recursive: true, force: true }));

function write(relative: string, content = 'export default {};') {
  const file = join(plugin, relative);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
  return file;
}
const run = () => spawnSync(process.execPath, [script], { encoding: 'utf8' });

it('lets compiled migrations and seeds win without changing their contents', () => {
  for (const kind of ['migrations', 'seeds']) {
    write(`database/${kind}/001.ts`);
    const compiled = write(`dist/database/${kind}/001.js`);
    const manifest = write(`dist/database/${kind}/.manifest.json`, '{}');
    const result = run();
    expect({ status: result.status, stderr: result.stderr }).toEqual({
      status: 0,
      stderr: '',
    });
    expect(existsSync(join(plugin, `database/${kind}`))).toBe(false);
    expect(readFileSync(compiled, 'utf8')).toBe('export default {};');
    expect(readFileSync(manifest, 'utf8')).toBe('{}');
  }
  expect(run().status).toBe(0);
});

it('fails rather than dropping a task with no compiled counterpart', () => {
  const source = write('database/migrations/001.ts');
  mkdirSync(join(plugin, 'dist/database/migrations'), { recursive: true });
  const result = run();
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain('Missing compiled plugin task');
  expect(existsSync(source)).toBe(true);
});

it('keeps task directories that already contain executable JavaScript only', () => {
  const source = write('database/migrations/001.js');
  write('database/migrations/001.d.ts');
  const result = run();
  expect({ status: result.status, stderr: result.stderr }).toEqual({
    status: 0,
    stderr: '',
  });
  expect(existsSync(source)).toBe(true);
});
