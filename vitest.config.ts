import { fileURLToPath } from 'node:url';

import { createNodeVitestConfig } from '@nocobase/dev-config/vitest/node';
import { createReactVitestConfig } from '@nocobase/dev-config/vitest/react';
import { defineConfig } from 'vitest/config';

const root = fileURLToPath(new URL('.', import.meta.url));
const dialect = process.env.NOCOBASE_TEST_DB_DIALECT?.trim();
const serverDatabase = !!dialect && dialect !== 'sqlite';
const databaseTimeouts = serverDatabase
  ? { testTimeout: 120_000, hookTimeout: 120_000 }
  : {};
// Keep the CRM's existing paths while assigning client-owned logic to the DOM project.
const clientLogic = [
  'tests/logic/app-locale-coverage.test.ts',
  'tests/logic/crm-permission-workspace.test.ts',
  'tests/logic/foundation-integration.test.ts',
  'tests/logic/page-permission-navigation.test.ts',
  'tests/logic/page-permission-titles.test.ts',
  'tests/logic/permission-workspace.test.ts',
  'tests/logic/return-to.test.ts',
  'tests/logic/session-preparation.test.tsx',
  'tests/logic/toaster.test.tsx',
];

export default defineConfig({
  test: {
    root,
    projects: [
      createNodeVitestConfig({
        test: {
          root,
          name: 'node',
          include: ['tests/logic/**/*.test.{ts,tsx}'],
          exclude: clientLogic,
          ...databaseTimeouts,
          // Database fixtures and command output capture run one file at a time.
          fileParallelism: false,
        },
      }),
      createReactVitestConfig({
        test: {
          root,
          name: 'client',
          environment: './tests/setup/application-environment.ts',
          // Client integration tests also start isolated application databases.
          fileParallelism: false,
          include: ['tests/components/**/*.test.{ts,tsx}', ...clientLogic],
          ...databaseTimeouts,
          setupFiles: ['./tests/setup/client-config.ts'],
          server: {
            deps: {
              // Keep the fixture, application and plugin clients in the same React/router context.
              // Server and shared modules stay external to preserve their service identities.
              inline: [
                /@nocobase\/app-testing\/(?:dist\/)?src\/client\//u,
                /@nocobase\/app-client\//u,
                /@[^/]+\/app-plugin-[^/]+\/(?:dist\/)?client\//u,
              ],
            },
          },
        },
      }),
    ],
    // Only the directories above contain Vitest suites. Playwright has its own runner.
    // Keep the command usable if an application intentionally removes all scaffold tests.
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'html'],
    },
  },
});
