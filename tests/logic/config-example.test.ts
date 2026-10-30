// @vitest-environment node

import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveStandaloneAppRuntime } from '@nocobase/app-server/node';
import { describe, expect, it } from 'vitest';

import appRuntime from '../../server/runtime.js';

// `pnpm nocobase config init` writes config.yml from this file: it replaces the instruction on the first line with
// its own header and fills the placeholder key of the live `secrets` section, keeping everything else verbatim. These
// are the parts of the example it relies on.
describe('config.example.yml', () => {
  const read = () =>
    readFile(new URL('../../config.example.yml', import.meta.url), 'utf8');

  it('opens with the instruction config init replaces', async () => {
    expect((await read()).split('\n')[0]).toMatch(
      /^# Copy this file to config\.yml\b/u,
    );
  });

  it('carries a live secrets section whose first key is a placeholder', async () => {
    expect(await read()).toContain(
      [
        'secrets:',
        '  keys:',
        '    - version: 1',
        '      key: replace-with-a-unique-secret',
      ].join('\n'),
    );
  });

  // Redis Jobs and Queue live in commercial plugins now, so the application
  // supplies no Redis defaults and the example has to state its adapter.
  it('selects Redis Jobs only through what the uncommented example declares', async () => {
    const source = await read();
    const example = /^# jobs:\n(?:#(?: {2,}.*)?\n)*/mu.exec(source)?.[0];
    expect(example).toBeDefined();
    const directory = await mkdtemp(path.join(tmpdir(), 'crm-config-example-'));
    try {
      const configPath = path.join(directory, 'config.yml');
      await writeFile(
        configPath,
        source.replace(example!, example!.replace(/^# ?/gmu, '')),
      );
      const { config } = await resolveStandaloneAppRuntime(appRuntime, {
        rootDir: fileURLToPath(new URL('../..', import.meta.url)),
        configPath,
        env: { AUTH_SECRET: 'test-auth-secret-at-least-32-characters' },
      });
      expect(config.get('jobs.default')).toBe('redis');
      expect(config.get('jobs.redis')).toEqual({
        adapter: 'redis',
        connection: { host: '127.0.0.1', port: 6379 },
      });
      expect(config.get('jobs.crmFollowUps.adapter')).toBe('memory');
      expect(config.get('queue.redis')).toBeUndefined();
      expect(config.get('queue.memory.adapter')).toBe('inMemory');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
