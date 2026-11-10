import mailers from './mailers.js';
import {
  defaultAppConfigs,
  type AppConfigFactory,
} from '@nocobase/app-server/config';
import auth from './auth.js';
import authorization from './authorization.js';
import notification from './notification.js';
import secrets from './secrets.js';
import session from './session.js';
import server from './server.js';
import spa from './spa.js';
import logging from './logging.js';
import drive from './drive.js';
import concurrency from './concurrency.js';
import queue from './queue.js';
import jobs from './jobs.js';
import scheduler from './scheduler.js';
import caching from './caching.js';
import realtime from './realtime.js';
import i18n from './i18n.js';
import app from './app.js';
import api from './api.js';
import database from './database.js';
import snowflake from './snowflake.js';
import ai from './ai.js';
import users from './users.js';
import mail from './mail.js';
import agents from './agents.js';
import demoMode from './demo-mode.js';
import foundation from './foundation.js';

const defaultConfigs: AppConfigFactory<{
  mailers: ReturnType<typeof mailers>;
  auth: ReturnType<typeof auth>;
  authorization: ReturnType<typeof authorization>;
  notification: ReturnType<typeof notification>;
  secrets: ReturnType<typeof secrets>;
  session: ReturnType<typeof session>;
  server: ReturnType<typeof server>;
  spa: ReturnType<typeof spa>;
  logging: ReturnType<typeof logging>;
  drive: ReturnType<typeof drive>;
  concurrency: ReturnType<typeof concurrency>;
  queue: ReturnType<typeof queue>;
  jobs: ReturnType<typeof jobs>;
  scheduler: ReturnType<typeof scheduler>;
  caching: ReturnType<typeof caching>;
  realtime: ReturnType<typeof realtime>;
  i18n: ReturnType<typeof i18n>;
  app: ReturnType<typeof app>;
  api: ReturnType<typeof api>;
  database: ReturnType<typeof database>;
  snowflake: ReturnType<typeof snowflake>;
  ai: ReturnType<typeof ai>;
  users: ReturnType<typeof users>;
  mail: ReturnType<typeof mail>;
  agents: ReturnType<typeof agents>;
  demoMode: ReturnType<typeof demoMode>;
  foundation: ReturnType<typeof foundation>;
}> = defaultAppConfigs({
  mailers,
  auth,
  authorization,
  notification,
  secrets,
  session,
  server,
  spa,
  logging,
  drive,
  concurrency,
  queue,
  jobs,
  scheduler,
  caching,
  realtime,
  i18n,
  app,
  api,
  database,
  snowflake,
  ai,
  users,
  mail,
  agents,
  demoMode,
  foundation,
});

export default defaultConfigs;
