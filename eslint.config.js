import { createApplicationConfig } from '@nocobase/dev-config/eslint';

export default createApplicationConfig({
  tsconfigRootDir: import.meta.dirname,
  ignores: [
    '.extension-state/**',
    'client-old/**',
    'public/r/**',
    'storage/**',
    // The NocoSolution submodule: another repository's documents and scripts.
    'nocosolution/**',
    // The AI Employee plugin's Registry UI, copied from the plugin package
    // and merged three-way on upgrades; its house style differs from ours.
    'client/extensions/nocobase-ai/**',
  ],
  overrides: [
    {
      // Top-level workflow definitions and handlers use the server project.
      files: ['workflows/**/*.ts'],
      ignores: ['workflows/*/client/**'],
      languageOptions: {
        parserOptions: {
          projectService: false,
          project: './tsconfig.server.json',
        },
      },
    },
  ],
});
