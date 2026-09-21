import {
  defineAppConfig,
  type AppConfigFactory,
} from '@nocobase/app-server/config';
import type { UsersConfig } from '@nocobase/app-plugin-users/server/tokens';

// Application change: the Users plugin would register its own permission-set
// role scope on the Users page; the CRM registers a replacement (one CRM role
// per user, the last administrator protected) from CrmProvider, so the
// plugin's default scope is switched off here.
const users: AppConfigFactory<UsersConfig> = defineAppConfig((_runtime) => ({
  permissionSets: false,
}));

export default users;
