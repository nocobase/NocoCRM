import { defaultAccess } from '@nocobase/app-plugin-authz-default-access/server';
import { sharingRules } from '@nocobase/app-plugin-authz-sharing-rules/server';
import { restrictionRules } from '@nocobase/app-plugin-authz-restriction-rules/server';
import {
  defineAppConfig,
  type AppConfigFactory,
} from '@nocobase/app-server/config';
import { type AuthorizationConfig } from '@nocobase/app-plugin-authorization/server';

// Permission sets, database, pages, settings, composites and workspace
// placement are built in. The CRM's
// administrator is the plugin's own root set (`root`, unrestricted, kept to
// at least one holder), so nothing here overrides the root set; the CRM's
// two sales roles are its own sets, created by `provisionCrm`. The plugin's
// default `member` set, held by every signed-in user, carries no grants.
const authorization: AppConfigFactory<AuthorizationConfig> = defineAppConfig(
  (_runtime) => ({
    plugins: [defaultAccess(), sharingRules(), restrictionRules()],
  }),
);

export default authorization;
