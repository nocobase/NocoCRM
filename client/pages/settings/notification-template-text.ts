import type {
  NotificationTemplateChannel,
  NotificationTemplateText,
  NotificationTemplateView,
} from '@nocobase/app-plugin-notification/client';
import { useTranslation } from '@nocobase/i18n/client';
import { useCallback, useMemo } from 'react';

import { useCrmText } from '../../components/crm/api.js';

// The registered notification templates in the reader's language. The
// Notification plugin carries a template's name, trigger, recipients,
// conditions, language rule, category and variables each as a string or a
// translation key (NotificationTemplateText); the CRM's own templates
// (server/providers/crm/notification-templates.ts) register English strings
// and are worded again in every language under `admin.notificationTemplates`,
// by template id. Any other template, the Users plugin's invitation among
// them, shows what it registered: its translation key in the interface
// language, or its string as written.

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
  | 'approvalRejected';

// The General settings' Reminders switch each CRM template is sent under
// (`crm.notifications.*`, the settings' own labels).
type Switch =
  | 'notifyRecordChanges'
  | 'notifyTaskReminders'
  | 'notifyComments'
  | 'notifyApprovals';

interface Known {
  readonly key: ItemKey;
  readonly switch: Switch;
  // Whether the item has a rule of its own (`items.<key>.rule`).
  readonly rule?: boolean;
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
};

// The registered categories (by their default text), channel types,
// contributors and the CRM templates' variables the CRM words again; anything
// else shows as registered.
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
};
const VARIABLES = new Set(['entity', 'record', 'name']);

/** A registered text as authored, for grouping and as the fallback. */
export function templateDefaultText(text: NotificationTemplateText): string {
  return typeof text === 'string' ? text : text.defaultValue;
}

// The directory's queries: the list, a template, a template's preview.
export const NOTIFICATION_TEMPLATES_KEY = ['crm', 'notificationTemplates'];

export interface TemplateText {
  readonly name: (view: NotificationTemplateView) => string;
  readonly trigger: (view: NotificationTemplateView) => string;
  readonly recipients: (view: NotificationTemplateView) => string;
  /** The conditions, one sentence each. */
  readonly conditions: (view: NotificationTemplateView) => readonly string[];
  readonly language: (view: NotificationTemplateView) => string;
  /** Whether one message carries every language: no preview language to pick. */
  readonly allLanguages: (view: NotificationTemplateView) => boolean;
  /** A category, by its registered text. */
  readonly category: (category: NotificationTemplateText) => string;
  readonly channelType: (channel: NotificationTemplateChannel) => string;
  readonly contributor: (view: NotificationTemplateView) => string;
  readonly variable: (
    view: NotificationTemplateView,
    variable: NotificationTemplateView['variables'][number],
  ) => string;
}

export function useTemplateText(): TemplateText {
  const { text } = useCrmText();
  const { t } = useTranslation();
  const word = useCallback(
    (key: string, options?: Record<string, unknown>) =>
      text(`admin.notificationTemplates.${key}`, options),
    [text],
  );
  // A registered text in the interface language: a translation key from its
  // own namespace, its default when that has none; a string as written.
  const registered = useCallback(
    (value: NotificationTemplateText): string =>
      typeof value === 'string'
        ? value
        : t(value.key, { ns: value.ns, defaultValue: value.defaultValue }),
    [t],
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
        return [
          word('switchRule', {
            switch: text(`notifications.${known.switch}`),
          }),
          ...own,
          word('always'),
        ];
      },
      language: (view) =>
        item(view) ? word('crmLanguage') : registered(view.languagePolicy),
      allLanguages: (view) => view.localeMode === 'combined',
      category: (category) => {
        const key = CATEGORIES[templateDefaultText(category)];
        return key ? word(`categories.${key}`) : registered(category);
      },
      channelType: (channel) =>
        CHANNEL_TYPES.has(channel.type)
          ? word(`channelTypes.${channel.type}`)
          : channel.typeLabel
            ? registered(channel.typeLabel)
            : channel.type,
      contributor: (view) => {
        const key = CONTRIBUTORS[view.contributor];
        return key
          ? word(`contributors.${key}`)
          : view.contributorLabel
            ? registered(view.contributorLabel)
            : view.contributor;
      },
      variable: (view, variable) =>
        item(view) && VARIABLES.has(variable.name)
          ? word(`variableText.${variable.name}`)
          : registered(variable.description),
    };
  }, [word, text, registered]);
}
