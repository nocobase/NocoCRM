import {
  defineAppConfig,
  type AppConfigFactory,
} from '@nocobase/app-server/config';
import {
  validateAppJobsConfig,
  type AppJobsConfig,
} from '@nocobase/app-server/jobs';

/**
 * Configurations the jobs service can run on, under `backends`. None is the default: until `jobs.default` names one,
 * executors run on the built-in memory adapter, which serves one process and writes its state under storage/jobs when
 * the application stops, and which is reported at startup outside development. Name `memory` to keep that choice
 * without the report. Distributed jobs require an explicitly registered backend plugin, see config.example.yml.
 */
const jobs: AppConfigFactory<AppJobsConfig> = defineAppConfig({
  defaults: ({ paths }) => ({
    backends: {
      memory: {
        adapter: 'memory',
        persistence: { path: paths.storage('jobs') },
      },
      // Application change, kept: the template declares only `memory`.
      // The CRM's AI follow-ups of leads and deals
      // (server/providers/crm/follow-up-jobs.ts): four at a time, each a few
      // model calls of up to minutes. A deployment raises `concurrency` in
      // config.yml, or, with a Redis backend plugin registered, moves them to
      // Redis (`adapter: redis` and a connection) to run them across
      // instances; a failure is the card's own, so one attempt. Moving the
      // entry under `backends` keeps its key, adapter and persistence path, so
      // pending follow-ups are not stranded.
      crmFollowUps: {
        adapter: 'memory',
        concurrency: 4,
        attempts: 1,
        persistence: { path: paths.storage('jobs') },
      },
    },
  }),
  validate: validateAppJobsConfig,
});

export default jobs;
