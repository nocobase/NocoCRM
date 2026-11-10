import type { I18nRuntime } from '@nocobase/i18n';
import type { Row } from '@nocobase/db';
import type { ServiceContainer } from '@nocobase/service-provider';
import {
  describeNotificationTemplateChannel,
  notificationTemplateRegistryToken,
  type NotificationConfigInput,
  type NotificationTemplateDefinition,
} from '@nocobase/app-plugin-notification/server';

import { notificationLocales } from '../../locales/crm-notifications/index.js';
import {
  crmNotificationContent,
  crmNotificationLabels,
} from './notification-content.js';
import type { Entity } from './schema.js';
import { titleOf } from './titles.js';

// The CRM's in-app notifications in the template's notification template
// directory (Settings → Notification management → Notification templates),
// one entry per message the outbox delivers (service.ts queueMessage, sent by
// CrmProvider.deliverNotifications). Each entry renders through the same
// builder the delivery pass sends with (notification-content.ts), from
// synthetic records only: the directory reads no record, user or setting and
// sends nothing. A change to a message, its trigger or its recipients is
// made here as well, and in the page's own wording of each, in every
// language (`admin.notificationTemplates.items` in client/locales/crm,
// keyed in client/pages/settings/notification-template-text.ts): the plugin
// carries the English here only, which the API and a template the page does
// not know show.
//
// Not in the directory:
// - `whatsapp` and `whatsappNew`: nothing queues them since 2026-10-16; the
//   delivery pass still sends rows queued before, with the same builder.
// - The Users plugin's invitation mail registers itself (`users.invitation`).
// - The Authentication plugin's password reset mail: the plugin's own
//   builder or callback, not enumerable here (the template's directory does
//   not register it either).
// - Mail a confirmed AI plan sends (plans/engine.ts sendMail), mail written in
//   the Mail plugin and WhatsApp replies: authored per message by a person or
//   the AI, not a system template.

const CONTRIBUTOR = 'crm';

const LANGUAGE_POLICY =
  "Each recipient's own language: the one stored in their CRM preferences when the server offers it, otherwise English. The interface language of whoever caused the message does not change it; the preview language chooses which of these is shown.";

// What every message is held to besides its own switch (queueMessage and
// deliverNotifications).
const ALWAYS =
  'Never sent to the person who made the change, for a record that no longer exists, or to a disabled account; delivered only while the recipient may still read the record, and queued once per message.';

const switchRule = (label: string): string =>
  `Sent while Settings → General → Reminders → ${label} is on (the default). ${ALWAYS}`;

const NAME = {
  name: 'name',
  description:
    'The record as the pages name it: a lead or a contact "name / company", an opportunity "company / name", anything else its name. The body is this alone; the inbox links it to the record.',
};
const OBJECT_VARIABLES = [
  {
    name: 'entity',
    description:
      'The kind of record, by its own name in the recipient language (Lead, Opportunity, Company, Contact, Task, Approval).',
  },
  {
    name: 'record',
    description:
      'The kind of record inside a sentence ("a lead"), for the languages whose title needs it.',
  },
  NAME,
];

// Synthetic records only, named the way titleOf names real ones.
const EXAMPLE_COMPANY_ID = 'example-company';
const EXAMPLE_COMPANIES = { [EXAMPLE_COMPANY_ID]: 'Example Trading Co.' };
const samples = {
  lead: {
    entity: 'leads',
    record: { name: 'Avery Sample', company: 'Example Trading Co.' },
  },
  task: { entity: 'tasks', record: { name: 'Sample kickoff call' } },
  opportunity: {
    entity: 'opportunities',
    record: { name: 'Sample renewal', companyId: EXAMPLE_COMPANY_ID },
  },
  contact: {
    entity: 'contacts',
    record: { name: 'Jordan Example', companyId: EXAMPLE_COMPANY_ID },
  },
  company: { entity: 'companies', record: { name: 'Example Trading Co.' } },
  approval: {
    entity: 'approvals',
    record: { name: 'Sample discount request' },
  },
} satisfies Record<string, { entity: Entity; record: Row }>;

interface Scenario {
  readonly event: string;
  readonly id: string;
  readonly category: string;
  readonly name: string;
  readonly trigger: string;
  readonly recipients: string;
  readonly businessRule: string;
  readonly sample: { entity: Entity; record: Row };
}

const scenarios: readonly Scenario[] = [
  {
    event: 'assigned',
    id: 'crm.record-assigned',
    category: 'Records',
    name: 'Record assigned',
    trigger:
      'A lead, opportunity, company, contact, task or approval is saved with a different owner than before, a new record created for someone else included.',
    recipients: 'The new owner.',
    businessRule: switchRule('Record change notifications'),
    sample: samples.lead,
  },
  {
    event: 'invited',
    id: 'crm.task-invited',
    category: 'Tasks',
    name: 'Added to a task',
    trigger: "A person is added to a task's internal participants.",
    recipients: 'Each internal participant added.',
    businessRule: switchRule('Record change notifications'),
    sample: samples.task,
  },
  {
    event: 'removed',
    id: 'crm.task-removed',
    category: 'Tasks',
    name: 'Removed from a task',
    trigger: "A person is removed from a task's internal participants.",
    recipients: 'Each internal participant removed.',
    businessRule: switchRule('Record change notifications'),
    sample: samples.task,
  },
  {
    event: 'cancelled',
    id: 'crm.task-cancelled',
    category: 'Tasks',
    name: 'Task cancelled',
    trigger: 'A task is saved as cancelled.',
    recipients:
      'Each internal participant who stays on the task (the owner is not told).',
    businessRule: switchRule('Record change notifications'),
    sample: samples.task,
  },
  {
    event: 'rescheduled',
    id: 'crm.task-rescheduled',
    category: 'Tasks',
    name: 'Task rescheduled',
    trigger: 'A task that is not cancelled is saved with a different time.',
    recipients:
      'Each internal participant who stays on the task (the owner is not told).',
    businessRule: switchRule('Record change notifications'),
    sample: samples.task,
  },
  {
    event: 'starting',
    id: 'crm.task-starting',
    category: 'Tasks',
    name: 'Task coming up',
    trigger:
      'The reminder pass, every half minute, finds an open task with a time (not a date alone) starting within the lead time set under Reminders.',
    recipients: 'The task owner and each internal participant.',
    businessRule: `${switchRule('Task reminders')} Once per task, start time and person.`,
    sample: samples.task,
  },
  {
    event: 'mentioned',
    id: 'crm.comment-mentioned',
    category: 'Comments',
    name: 'Mentioned in a comment',
    trigger:
      'A comment on a record @-mentions a colleague, when it is written or when an edit adds the mention.',
    recipients: 'Each active colleague the comment newly mentions.',
    businessRule: `${switchRule('Comment notifications')} Once per comment and person.`,
    sample: samples.opportunity,
  },
  {
    event: 'replied',
    id: 'crm.comment-replied',
    category: 'Comments',
    name: 'Reply in a comment thread',
    trigger: 'Someone replies to a comment, or to a reply, on a record.',
    recipients:
      'Everyone who has written in the thread, except those the reply mentions, who are told of the mention instead.',
    businessRule: `${switchRule('Comment notifications')} Once per reply and person.`,
    sample: samples.contact,
  },
  {
    event: 'signal',
    id: 'crm.company-signal',
    category: 'Company signals',
    name: 'Company news',
    trigger:
      "The company signals check records news the AI's web search found about a company.",
    recipients: "The company's owner and the owners of its open opportunities.",
    businessRule: `${switchRule('Record change notifications')} Once per signal and person; opens the company's signals.`,
    sample: samples.company,
  },
  {
    event: 'pending',
    id: 'crm.approval-pending',
    category: 'Approvals',
    name: 'Approval requested',
    trigger: 'An approval request is submitted.',
    recipients: 'The approver.',
    businessRule: switchRule('Approval notifications'),
    sample: samples.approval,
  },
  {
    event: 'withdrawn',
    id: 'crm.approval-withdrawn',
    category: 'Approvals',
    name: 'Approval request withdrawn',
    trigger: 'The applicant withdraws a submitted approval request.',
    recipients: 'The approver.',
    businessRule: switchRule('Approval notifications'),
    sample: samples.approval,
  },
  {
    event: 'approved',
    id: 'crm.approval-approved',
    category: 'Approvals',
    name: 'Approval request approved',
    trigger: 'The approver approves a request.',
    recipients: 'The applicant (the request owner).',
    businessRule: switchRule('Approval notifications'),
    sample: samples.approval,
  },
  {
    event: 'rejected',
    id: 'crm.approval-rejected',
    category: 'Approvals',
    name: 'Approval request rejected',
    trigger: 'The approver rejects a request.',
    recipients: 'The applicant (the request owner).',
    businessRule: switchRule('Approval notifications'),
    sample: samples.approval,
  },
];

// The registered ids, for the tests and documentation.
export const crmNotificationTemplateIds: readonly string[] = scenarios.map(
  (scenario) => scenario.id,
);

// Registers every scenario in the directory; returns the release to call at
// shutdown, or nothing when the Notification plugin is not installed.
export function registerCrmNotificationTemplates(input: {
  container: ServiceContainer;
  i18n: I18nRuntime;
  // The safe projection of the in-app Channel the messages go through.
  notification: () => NotificationConfigInput | undefined;
  channel: string;
}): (() => void) | undefined {
  const { container, i18n, notification, channel } = input;
  if (!container.has(notificationTemplateRegistryToken)) return undefined;
  const registry = container.resolve(notificationTemplateRegistryToken);
  const locales = Object.keys(notificationLocales);
  const definition = (scenario: Scenario): NotificationTemplateDefinition => ({
    id: scenario.id,
    contributor: CONTRIBUTOR,
    category: scenario.category,
    name: scenario.name,
    trigger: scenario.trigger,
    recipients: scenario.recipients,
    businessRule: scenario.businessRule,
    locales,
    languagePolicy: LANGUAGE_POLICY,
    variables: OBJECT_VARIABLES,
    channels: () => [
      describeNotificationTemplateChannel(notification(), channel),
    ],
    render: async (locale, example) => {
      // The translations the delivery pass sends with, loaded from the
      // application's own locale modules.
      await i18n.ensureLocaleLoaded(locale);
      const t = i18n.getFixedT('crm-notifications', locale);
      const { entity, record } = scenario.sample;
      return example === 'definition'
        ? crmNotificationContent(
            t,
            scenario.event,
            { entity: '{{entity}}', record: '{{record}}' },
            '{{name}}',
          )
        : crmNotificationContent(
            t,
            scenario.event,
            crmNotificationLabels(t, entity),
            titleOf(entity, record, EXAMPLE_COMPANIES),
          );
    },
  });
  const releases = scenarios.map((scenario) =>
    registry.register(definition(scenario)),
  );
  return () => {
    for (const release of releases) release();
  };
}
