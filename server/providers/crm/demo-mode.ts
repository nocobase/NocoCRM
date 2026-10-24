import type { Application } from '@nocobase/app-server/application';
import { demoModeServiceToken } from '@nocobase/app-plugin-demo-mode/server/tokens';

/** The plugin is the single source of truth for the deployment's demo policy. */
export function isDemoMode(app: Application): boolean {
  return (
    app.container.has(demoModeServiceToken) &&
    app.container.resolve(demoModeServiceToken).enabled
  );
}
