import type {
  NotificationTemplateText,
  NotificationTemplateView,
} from '@nocobase/app-plugin-notification/client';
import { useTranslation } from '@nocobase/i18n/client';
import { useCallback, useMemo } from 'react';

import { useCrmText } from '../../components/crm/api.js';

// The registered notification templates in the reader's language. The
// Notification plugin carries a template's name, trigger, recipients,
// conditions, language rule, category and variables as registered
// (NotificationTemplateView): a plain string, or, since Notification
// 2.0.0-beta.8, a translation key with its default text; the CRM's own
// templates (server/providers/crm/notification-templates.ts) and the Users
// plugin's invitation are worded again in every language under
// `admin.notificationTemplates`, by template id. A template the CRM does not
// know keeps the registered text, a key translated from its registrant's
// namespace, as the plugin's own page does, or else its default text.

type ItemKey =
  | 'recordAssigned'
  | 'taskInvited'
  | 'taskRemoved'
  | 'taskCancelled'
  | 'taskRescheduled'
  | 'taskStarting'
  | 'commentMentioned'
  | 'commentReplied'
  | 'companySignal'
  | 'approvalPending'
  | 'approvalWithdrawn'
  | 'approvalApproved'
  | 'approvalRejected'
  | 'usersInvitation';

// The General settings' Reminders switch each CRM template is sent under
// (`crm.notifications.*`, the settings' own labels).
type Switch =
  | 'notifyRecordChanges'
  | 'notifyTaskReminders'
  | 'notifyComments'
  | 'notifyApprovals';

interface Known {
  readonly key: ItemKey;
  // Absent for a template outside the CRM's switches (the invitation).
  readonly switch?: Switch;
  // Whether the item has a rule of its own (`items.<key>.rule`).
  readonly rule?: boolean;
  // Whether one message carries every language it lists, so that the preview
  // reads the same whichever language is asked for (the invitation).
  readonly allLanguages?: boolean;
}

const KNOWN: Readonly<Record<string, Known>> = {
  'crm.record-assigned': {
    key: 'recordAssigned',
    switch: 'notifyRecordChanges',
  },
  'crm.task-invited': { key: 'taskInvited', switch: 'notifyRecordChanges' },
  'crm.task-removed': { key: 'taskRemoved', switch: 'notifyRecordChanges' },
  'crm.task-cancelled': {
    key: 'taskCancelled',
    switch: 'notifyRecordChanges',
  },
  'crm.task-rescheduled': {
    key: 'taskRescheduled',
    switch: 'notifyRecordChanges',
  },
  'crm.task-starting': {
    key: 'taskStarting',
    switch: 'notifyTaskReminders',
    rule: true,
  },
  'crm.comment-mentioned': {
    key: 'commentMentioned',
    switch: 'notifyComments',
    rule: true,
  },
  'crm.comment-replied': {
    key: 'commentReplied',
    switch: 'notifyComments',
    rule: true,
  },
  'crm.company-signal': {
    key: 'companySignal',
    switch: 'notifyRecordChanges',
    rule: true,
  },
  'crm.approval-pending': { key: 'approvalPending', switch: 'notifyApprovals' },
  'crm.approval-withdrawn': {
    key: 'approvalWithdrawn',
    switch: 'notifyApprovals',
  },
  'crm.approval-approved': {
    key: 'approvalApproved',
    switch: 'notifyApprovals',
  },
  'crm.approval-rejected': {
    key: 'approvalRejected',
    switch: 'notifyApprovals',
  },
  'users.invitation': {
    key: 'usersInvitation',
    rule: true,
    allLanguages: true,
  },
};

// The registered categories, channel types, contributors and variables the
// CRM words again; anything else shows as registered.
const CATEGORIES: Readonly<Record<string, string>> = {
  Accounts: 'accounts',
  Records: 'records',
  Tasks: 'tasks',
  Comments: 'comments',
  'Company signals': 'signals',
  Approvals: 'approvals',
};
const CHANNEL_TYPES = new Set(['in-app', 'email']);
const CONTRIBUTORS: Readonly<Record<string, string>> = {
  crm: 'crm',
  '@nocobase/app-plugin-users': 'users',
};
const VARIABLES = new Set([
  'entity',
  'record',
  'name',
  'app',
  'inviter',
  'items',
  'date',
  'url',
]);

// The directory's queries: the list, a template, a template's preview.
export const NOTIFICATION_TEMPLATES_KEY = ['crm', 'notificationTemplates'];

/** A registered text's identity, to group and filter by: the text, or its translation key. */
export const textKey = (value: NotificationTemplateText): string =>
  typeof value === 'string' ? value : `${value.ns}:${value.key}`;

export interface TemplateText {
  readonly name: (view: NotificationTemplateView) => string;
  readonly trigger: (view: NotificationTemplateView) => string;
  readonly recipients: (view: NotificationTemplateView) => string;
  /** The conditions, one sentence each. */
  readonly conditions: (view: NotificationTemplateView) => readonly string[];
  readonly language: (view: NotificationTemplateView) => string;
  /** Whether one message carries every language: no preview language to pick. */
  readonly allLanguages: (view: NotificationTemplateView) => boolean;
  readonly category: (category: NotificationTemplateText) => string;
  readonly channelType: (type: string) => string;
  readonly contributor: (contributor: string) => string;
  readonly variable: (
    name: string,
    registered: NotificationTemplateText,
  ) => string;
}

export function useTemplateText(): TemplateText {
  const { text } = useCrmText();
  const { t } = useTranslation();
  const registered = useCallback(
    (value: NotificationTemplateText): string =>
      typeof value === 'string'
        ? value
        : t(value.key, { ns: value.ns, defaultValue: value.defaultValue }),
    [t],
  );
  const word = useCallback(
    (key: string, options?: Record<string, unknown>) =>
      text(`admin.notificationTemplates.${key}`, options),
    [text],
  );
  return useMemo(() => {
    const item = (view: NotificationTemplateView) => KNOWN[view.id];
    return {
      name: (view) => {
        const known = item(view);
        return known ? word(`items.${known.key}.name`) : registered(view.name);
      },
      trigger: (view) => {
        const known = item(view);
        return known
          ? word(`items.${known.key}.trigger`)
          : registered(view.trigger);
      },
      recipients: (view) => {
        const known = item(view);
        return known
          ? word(`items.${known.key}.recipients`)
          : registered(view.recipients);
      },
      conditions: (view) => {
        const known = item(view);
        if (!known) return [registered(view.businessRule)];
        const own = known.rule ? [word(`items.${known.key}.rule`)] : [];
        return known.switch
          ? [
              word('switchRule', {
                switch: text(`notifications.${known.switch}`),
              }),
              ...own,
              word('always'),
            ]
          : own;
      },
      language: (view) => {
        const known = item(view);
        if (!known) return registered(view.languagePolicy);
        return known.switch
          ? word('crmLanguage')
          : word(`items.${known.key}.language`);
      },
      allLanguages: (view) => item(view)?.allLanguages === true,
      category: (category) => {
        const key =
          CATEGORIES[
            typeof category === 'string' ? category : category.defaultValue
          ];
        return key ? word(`categories.${key}`) : registered(category);
      },
      channelType: (type) =>
        CHANNEL_TYPES.has(type) ? word(`channelTypes.${type}`) : type,
      contributor: (contributor) => {
        const key = CONTRIBUTORS[contributor];
        return key ? word(`contributors.${key}`) : contributor;
      },
      variable: (name, description) =>
        VARIABLES.has(name)
          ? word(`variableText.${name}`)
          : registered(description),
    };
  }, [word, text, registered]);
}
