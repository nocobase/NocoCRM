import {
  defineAppConfig,
  type AppConfigFactory,
} from '@nocobase/app-server/config';
import type { AppQueueConfig } from '@nocobase/queue';
import { createPluginJobLocations } from '@nocobase/app-server/plugins';

const queue: AppConfigFactory<AppQueueConfig> = defineAppConfig(
  ({ paths, plugins }) => ({
    default: 'sync',
    connections: {
      sync: { driver: 'sync' },
      redis: {
        driver: 'redis',
        host: '127.0.0.1',
        port: 6379,
        db: 0,
        keyPrefix: 'nocobase:queue:',
        tls: false,
      },
      database: {
        driver: 'database',
        table: 'queue_jobs',
        schedulesTable: 'queue_schedules',
      },
    },
    worker: {
      queues: ['default'],
      concurrency: 1,
      idleDelay: '2s',
    },
    ...(plugins.plugins.some(
      (plugin) =>
        plugin.definition.packageName === '@nocobase/app-plugin-scheduler',
    )
      ? { queues: { schedule: { connection: 'database' } } }
      : {}),
    jobs: {
      locations: [
        paths.server('jobs/**/*.{ts,js}'),
        // Application change: installed plugins ship compiled jobs next to
        // their .d.ts declarations, and the framework's "*.{ts,js,mts,mjs}"
        // pattern loads the declaration too, which fails at startup in
        // development (the scheduler's dispatch.d.ts). Only the compiled
        // files are jobs. Drop this once the framework leaves declarations out.
        ...createPluginJobLocations(
          plugins.plugins.map((plugin) => plugin.metadata),
        ).map((location) =>
          location.replace(/\*\.\{ts,js,mts,mjs\}$/, '*.{js,mjs}'),
        ),
      ],
      autoLoad: true,
      hotReload: false,
    },
  }),
);

export default queue;
