import type { Application } from '@nocobase/app-server/application';
import { isDemoMode } from '@nocobase/app-plugin-demo-mode/server';
import { ServiceProvider } from '@nocobase/service-provider';
import { demoDataToken } from '@nocobase/app-plugin-demo-mode/server/tokens';
import { existingCrmDemo } from './crm/demo-presentation.js';

/** Register the application-owned story with the plugin's data lifecycle. */
export default class DemoModeProvider extends ServiceProvider<Application> {
  name = 'crm-demo-mode';
  override async boot(): Promise<void> {
    if (!isDemoMode(this.app.container)) return;
    this.app.container
      .resolve(demoDataToken)
      .register(existingCrmDemo(this.app));
  }
}
