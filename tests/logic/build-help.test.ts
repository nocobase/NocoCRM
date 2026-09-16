// @vitest-environment node
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';

it.each(['--help', '-h'])(
  'build %s works without dependencies and preserves dist',
  (flag) => {
    const root = mkdtempSync(join(tmpdir(), 'crm-build-help-'));
    try {
      mkdirSync(join(root, 'scripts'));
      mkdirSync(join(root, 'dist'));
      copyFileSync('scripts/build.mjs', join(root, 'scripts/build.mjs'));
      writeFileSync(join(root, 'dist/keep.txt'), 'existing build');
      const result = spawnSync(
        process.execPath,
        [join(root, 'scripts/build.mjs'), flag],
        { encoding: 'utf8' },
      );
      expect({ status: result.status, stderr: result.stderr }).toEqual({
        status: 0,
        stderr: '',
      });
      expect(result.stdout).toContain('Usage: pnpm build');
      expect(result.stdout).toContain('--target');
      expect(readFileSync(join(root, 'dist/keep.txt'), 'utf8')).toBe(
        'existing build',
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  },
);
