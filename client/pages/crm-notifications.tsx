import type { ReactElement } from 'react';
import { NotificationRuntime } from '../components/crm/notification-bell.js';
import { CrmFrame } from '../components/crm/common.js';
import { NotificationInbox } from '../components/crm/notification-inbox.js';
import { useCrmText } from '../components/crm/api.js';
export default function NotificationsPage(): ReactElement {
  const { text } = useCrmText();
  return (
    <CrmFrame
      title={text('notifications')}
      description={text('notificationDescription')}
      assistant={false}
    >
      <NotificationRuntime>
        <NotificationInbox />
      </NotificationRuntime>
    </CrmFrame>
  );
}
