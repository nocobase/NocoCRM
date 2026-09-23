import { createPortalConfig } from '@nocobase/dev-config/eslint';

export default createPortalConfig({
  tsconfigRootDir: import.meta.dirname,
  ignores: [
    '.extension-state/**',
    'client-old/**',
    'public/r/**',
    'storage/**',
    // The AI Employee plugin's Registry UI, copied from the plugin package
    // and merged three-way on upgrades; its house style differs from ours.
    'client/extensions/nocobase-ai/**',
  ],
});
