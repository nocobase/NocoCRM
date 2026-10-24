import type { Application } from '@nocobase/app-server/application';
import { apiErrorHandler } from '@nocobase/app-server/router';
import type { Context } from 'hono';
import { DemoReadOnlyError } from '@nocobase/app-plugin-demo-mode/server';
import { ServiceProvider } from '@nocobase/service-provider';
import { databaseManagerToken } from '@nocobase/db';
import { demoDataToken } from '@nocobase/app-plugin-demo-mode/server/tokens';
import { existingCrmDemo } from './crm/demo-presentation.js';
import { isDemoMode } from './crm/demo-mode.js';

/** External and streamed operations must be refused before their side effects. */
export default class DemoModeProvider extends ServiceProvider<Application> {
  name = 'crm-demo-mode';
  override async boot(): Promise<void> {
    if (!isDemoMode(this.app)) return;
    const admin = await this.app.container
      .resolve(databaseManagerToken)
      .query()
      .selectFrom('user')
      .select('name')
      .where('username', '=', 'admin')
      .executeTakeFirst();
    this.app.container
      .resolve(demoDataToken)
      .register(
        existingCrmDemo(
          this.app,
          typeof admin?.name === 'string' ? admin.name : undefined,
        ),
      );
  }

  override register(): void {
    for (const path of ['/api/agents/*', '/api/mail/*']) {
      this.app.router.use(path, async (context: Context, next) => {
        if (
          !isDemoMode(this.app) ||
          ['GET', 'HEAD', 'OPTIONS'].includes(context.req.method)
        ) {
          await next();
          return;
        }
        context.header('Server-Timing', 'demo-read-only');
        return apiErrorHandler(new DemoReadOnlyError([]), context);
      });
    }
  }
}
