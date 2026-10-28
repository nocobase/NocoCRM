import { MailerProvider } from '@nocobase/app-server/mailer';
import type { Application } from '@nocobase/app-server/application';
import { DatabaseProvider } from '@nocobase/app-server/database';
import { I18nProvider, i18nHttpMiddleware } from '@nocobase/app-server/i18n';
import { CachingProvider } from '@nocobase/app-server/caching';
import { DriveProvider } from '@nocobase/app-server/drive';
import { IdGeneratorProvider } from '@nocobase/app-server/id-generator';
import {
  LoggingProvider,
  requestLoggingMiddleware,
} from '@nocobase/app-server/logging';
import { QueueServiceProvider } from '@nocobase/app-server/queue';
import { SecretsProvider } from '@nocobase/app-server/secrets';
import { JobExecutorServiceProvider } from '@nocobase/app-server/jobs';
import {
  SessionProvider,
  sessionHttpMiddleware,
} from '@nocobase/app-server/session';
import { healthCheckApiRoutes } from '@nocobase/app-server/router';
import {
  createAppFromRuntime,
  type AppRuntimeContext,
} from '@nocobase/app-server/runtime';
import { spaRootRoutes } from '@nocobase/app-server/spa';
import { demoEffectsGuard } from '@nocobase/app-plugin-demo-mode/server';
import { CRM_PATHS } from './routes/crm-paths.js';

export function createApp(runtime: AppRuntimeContext): Application {
  const app = createAppFromRuntime(runtime);

  app.addServiceProvider(DatabaseProvider);
  app.addServiceProvider(I18nProvider);
  app.addServiceProvider(LoggingProvider);
  app.addServiceProvider(CachingProvider);
  app.addServiceProvider(IdGeneratorProvider);
  app.addServiceProvider(SecretsProvider);
  app.addServiceProvider(SessionProvider);
  app.addServiceProvider(DriveProvider);
  app.addServiceProvider(MailerProvider);
  app.addServiceProvider(QueueServiceProvider, {
    nodeEnv: runtime.env.NODE_ENV,
  });
  app.addServiceProvider(JobExecutorServiceProvider, {
    nodeEnv: runtime.env.NODE_ENV,
  });
  app.addHttpMiddleware(requestLoggingMiddleware);
  app.addHttpMiddleware(sessionHttpMiddleware);
  app.addHttpMiddleware(i18nHttpMiddleware);
  // Application change: refuse CRM, Mail and Agents external effects before
  // handlers run. The plugin's SQL guard alone cannot protect these effects.
  app.addHttpMiddleware(
    demoEffectsGuard({
      paths: [...CRM_PATHS, 'agents', 'mail'].map((path) => `/api/${path}/*`),
    }),
  );
  app.addRoutes(healthCheckApiRoutes);
  app.addRuntimeContributions(runtime);
  app.addRoutes(spaRootRoutes);

  return app;
}
