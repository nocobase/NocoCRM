import type { ClientApplication } from '@nocobase/app-client';
import { createAppClientConfig } from '@nocobase/app-client';

// app-testing beta.6 has no public-config option. Supply the server's startup
// flag while retaining the real plugin provider and hooks.
export function enableDemoMode(app: ClientApplication): void {
  const config = createAppClientConfig({
    rawConfig: {},
    rawPublicConfig: { demoMode: { enabled: true } },
  });
  Object.defineProperty(app.config, 'public', { value: config.public });
}
