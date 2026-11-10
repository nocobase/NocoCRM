import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { expect, it } from 'vitest';
import metadata from '../../package.json' with { type: 'json' };

// Demo Mode 0.2.0-beta.9's DemoModeNotice matched the registered absolute
// route paths as nested route objects, which React Router refuses for a group
// nested at its parent's path (Notification management in the System
// settings category), and every page failed to render. pnpm patches it
// (patchedDependencies in pnpm-workspace.yaml). When Demo Mode moves, check
// whether the new version still needs the patch: drop it if fixed, re-make
// it otherwise.

const require = createRequire(import.meta.url);
const root = dirname(
  require.resolve('@nocobase/app-plugin-demo-mode/package.json'),
);
const installed = JSON.parse(
  readFileSync(join(root, 'package.json'), 'utf8'),
) as { version: string };

it('pins the Demo Mode version the patch was made for', () => {
  expect(
    metadata.dependencies['@nocobase/app-plugin-demo-mode'] ??
      metadata.devDependencies['@nocobase/app-plugin-demo-mode'],
  ).toBe('0.2.0-beta.9');
  expect(installed.version).toBe('0.2.0-beta.9');
});

it('installs the patched DemoModeNotice, which nests each path relative to its parent', () => {
  const source = readFileSync(
    join(root, 'dist/client/components/demo-mode-notice.js'),
    'utf8',
  );
  expect(source).toContain("function entryRoutes(routes, parentPath = '')");
  expect(source).toContain('Patched in NocoCRM');
});
