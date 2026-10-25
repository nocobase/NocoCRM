import { fileURLToPath } from 'node:url';

import { createReactVitestConfig } from '@nocobase/dev-config/vitest/react';

const root = fileURLToPath(new URL('.', import.meta.url));

// NOCOBASE_TEST_DB_DIALECT=postgres or mysql runs the database tests on a server, which installs the application's
// hundred-odd migrations several times slower than SQLite and is shared by the files running side by side: a test
// that starts the whole application gets longer than the preset's 30 seconds to do it.
const dialect = process.env.NOCOBASE_TEST_DB_DIALECT?.trim();
const serverDatabase = !!dialect && dialect !== 'sqlite';

export default createReactVitestConfig({
  test: {
    root,
    ...(serverDatabase ? { testTimeout: 120_000, hookTimeout: 120_000 } : {}),
    server: {
      deps: {
        // Transform the public Client surfaces so vi.mock applies, without duplicating the Server packages' identity tokens.
        inline: [
          // The published fixture mounts MemoryRouter; transform it with the page to share the router context.
          /@nocobase\/app-testing\/(?:dist\/)?src\/client\//u,
          // AppClientProviders includes the navigation guard and must use that same router context.
          /@nocobase\/app-client\//u,
          // Client plugins in every scope, including @acme/app-plugin-*, must share the transformed runtime.
          // Keep server/shared modules external so their service identities remain unchanged.
          /@[^/]+\/app-plugin-[^/]+\/(?:dist\/)?client\//u,
        ],
      },
    },
    // A glob rather than a list of filenames. The list had to be edited by hand for every test added or removed and
    // silently drifted: it named a file that no longer existed while several real test files were absent from it, so
    // those tests were never run at all.
    include: ['tests/**/*.test.{ts,tsx}'],
    // Playwright runs tests/playwright/ against a built application; its files are named *.test.ts too.
    exclude: ['tests/playwright/**'],
    setupFiles: ['./tests/setup/client-config.ts'],
    // Keep the command usable if an application intentionally removes all scaffold tests before adding its own.
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'html'],
    },
  },
});
