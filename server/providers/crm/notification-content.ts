import type { Translator } from '@nocobase/i18n';

// The words a notification's title names its object by, in the recipient's
// language: `entity` the object's own name ("Lead"), `record` the object
// inside a sentence ("a lead"); each language's title takes the one its
// grammar needs (server/locales/crm-notifications/index.ts).
export interface CrmNotificationLabels {
  entity: string;
  record: string;
}

export function crmNotificationLabels(
  t: Translator,
  entity: string,
): CrmNotificationLabels {
  return { entity: t(`entities.${entity}`), record: t(`records.${entity}`) };
}

// The title and body of one in-app notification the CRM sends: the one
// builder both the delivery pass (CrmProvider.deliverNotifications) and the
// notification template directory's preview (notification-templates.ts)
// call, so what an administrator previews is what a recipient is sent. `t`
// is the `crm-notifications` namespace fixed to the recipient's language;
// `labels` is absent only for a message about no record (a WhatsApp
// conversation linked to none); `name` is the record's title as the pages
// show it. Pure: it reads nothing but the translations it is given.
export function crmNotificationContent(
  t: Translator,
  event: string,
  labels: CrmNotificationLabels | undefined,
  name: string,
): { title: string; body: string } {
  const title = labels
    ? t(`titles.${event}`, { entity: labels.entity, record: labels.record })
    : t(`titles.${event}`);
  return { title, body: t('body', { title, name }) };
}
