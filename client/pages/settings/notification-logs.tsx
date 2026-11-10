import { useTranslation } from '@nocobase/i18n/client';
import type { ReactElement } from 'react';

import { NotificationLogsPage as NotificationLogs } from '#extensions/nocobase-notification-logs-ui/index';

import { SettingsModulePage } from './settings-module-page.js';

/**
 * Notification logs, a view of the Notification management module beside its templates: the UI Library's
 * notification-logs-ui block (its own heading removed, application change) under the module's tabs, titled with
 * the view as the template's Notification templates page is (notification-templates.tsx).
 */
export default function NotificationLogsPage(): ReactElement {
  const { t } = useTranslation();
  return (
    <SettingsModulePage title={t('settings.notificationLogs')}>
      <NotificationLogs />
    </SettingsModulePage>
  );
}
