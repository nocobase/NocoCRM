import defaultAccess from '@nocobase/app-plugin-authz-default-access/client';
import sharingRules from '@nocobase/app-plugin-authz-sharing-rules/client';
import restrictionRules from '@nocobase/app-plugin-authz-restriction-rules/client';
import {
  defineClientPlugins,
  type AppClientPlugins,
} from '@nocobase/app-client/plugins';
import apiKeys from '@nocobase/app-plugin-api-keys/client';
import authentication from '@nocobase/app-plugin-authentication/client';
import authorization from '@nocobase/app-plugin-authorization/client';
import databaseExplorer from '@nocobase/app-plugin-database-explorer/client';
import users from '@nocobase/app-plugin-users/client';
import notificationInApp from '@nocobase/app-plugin-notification-in-app/client';
import i18n from '@nocobase/app-plugin-i18n/client';
import notification from '@nocobase/app-plugin-notification/client';
import scheduler from '@nocobase/app-plugin-scheduler/client';
import file from '@nocobase/app-plugin-file/client';
import mail from '@nocobase/app-plugin-mail/client';
import agents from '@nocobase/app-plugin-agents/client';
import foundation from '@nocobase/app-plugin-foundation/client';
import applicationManifest from '../package.json' with { type: 'json' };
import demoMode from '@nocobase/app-plugin-demo-mode/client';

// Array order is contribution order. A plugin is enabled by appearing in this
// list; removing its entry and its import disables it.
const clientPlugins: AppClientPlugins = defineClientPlugins([
  authentication(),
  authorization(),
  defaultAccess(),
  sharingRules(),
  restrictionRules(),
  databaseExplorer(),
  users(),
  apiKeys(),
  i18n(),
  notificationInApp(),
  notification(),
  file(),
  scheduler(),
  mail(),
  agents(),
  // The manifest is what the capability guide lists: every plugin this application declares. As in template
  // 1.0.0-beta.92, the guide (Features and extensions, /settings/capabilities) takes the menu entry App foundation
  // had, and the protected /foundation page keeps its URL without one; the guide is a card of the settings home's
  // System category (client/lib/navigation-transform.ts), and its breadcrumb returns to that home.
  foundation({
    settingsGroup: true,
    manifest: applicationManifest,
    guideSettingsPath: '/settings',
    navigation: false,
  }),
  demoMode(),
]);

export default clientPlugins;
