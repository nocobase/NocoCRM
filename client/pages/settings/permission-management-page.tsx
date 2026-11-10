import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from '@nocobase/i18n/client';

import { SettingsModulePage } from './settings-module-page.js';

/** Permission management: Roles and permissions and Default data scopes as tabs of one settings module. */
export function PermissionManagementPage({
  tab,
  actions,
  children,
}: {
  tab: 'roles' | 'default-access';
  actions?: ReactNode;
  children: ReactNode;
}): ReactElement {
  const { t } = useTranslation();
  return (
    <SettingsModulePage
      // Application change: the CRM registers Roles as a module of its own,
      // without the Default access view (client/pages/settings/routes.ts), so
      // the page carries the name of its card, Roles, as its tab did before.
      title={t('crm.navigation.roles')}
      description={t(
        tab === 'roles'
          ? 'settings.rolesDescription'
          : 'settings.defaultAccess.description',
      )}
      actions={actions}
    >
      {children}
    </SettingsModulePage>
  );
}
