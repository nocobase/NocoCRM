import { defaultAccess } from '@nocobase/app-plugin-authz-default-access/server';
import { sharingRules } from '@nocobase/app-plugin-authz-sharing-rules/server';
import { restrictionRules } from '@nocobase/app-plugin-authz-restriction-rules/server';
import {
  defineAppConfig,
  type AppConfigFactory,
} from '@nocobase/app-server/config';
import { type AuthorizationConfig } from '@nocobase/app-plugin-authorization/server';

// Permission sets, page and database authorization are built in.
// Application change: the CRM's administrator role (`crm-system-administrator`,
// created by `provisionCrm`) is the set that confers unrestricted access, in
// place of the template's `root`; the CRM has no default set, its roles are
// assigned one per user. The set's last assignment is protected by the library.
const authorization: AppConfigFactory<AuthorizationConfig> = defineAppConfig(
  (_runtime) => ({
    permissionSets: { rootSet: 'crm-system-administrator' },
    plugins: [defaultAccess(), sharingRules(), restrictionRules()],
  }),
);

export default authorization;
