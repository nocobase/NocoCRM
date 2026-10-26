import type { Row } from '@nocobase/db';
import { countryCodes } from './geography.js';
import { DEFAULT_TIME_ZONE } from './zone-time.js';
export function toText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'object')
    return value instanceof Date ? value.toISOString() : JSON.stringify(value);
  return typeof value === 'string'
    ? value
    : typeof value === 'number' ||
        typeof value === 'boolean' ||
        typeof value === 'bigint' ||
        typeof value === 'symbol'
      ? String(value)
      : '';
}

export type Entity =
  'leads' | 'companies' | 'contacts' | 'opportunities' | 'tasks' | 'approvals';
export interface CrmRecord extends Row {
  id: string;
  name: string;
  ownerId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}
export interface Field {
  key: string;
  type:
    | 'text'
    | 'textarea'
    | 'email'
    | 'url'
    | 'number'
    | 'date'
    | 'datetime'
    | 'select'
    | 'boolean'
    | 'relation'
    | 'multi'
    | 'contacts'
    | 'files'
    | 'country'
    | 'subdivision';
  required?: boolean;
  options?: string[];
  relation?: Entity | 'users';
  readOnly?: boolean;
}
export interface EntityDefinition {
  table: string;
  fields: Field[];
  statusField?: string;
  statuses: string[];
  columns: string[];
}
export const sources: string[] = [
  'website',
  'marketing',
  'exhibition',
  'search',
  'ai',
  'customerReferral',
  'employeeReferral',
  'partner',
  'outbound',
  'other',
];
export const industries: string[] = [
  'manufacturing',
  'technology',
  'telecommunications',
  'financialServices',
  'insurance',
  'healthcare',
  'pharmaceuticals',
  'retail',
  'wholesale',
  'foodAndBeverage',
  'agriculture',
  'energy',
  'construction',
  'realEstate',
  'automotive',
  'logistics',
  'hospitality',
  'media',
  'education',
  'professionalServices',
  'government',
  'nonprofit',
  'other',
];
export const churnReasons: string[] = [
  'price',
  'toCompetitor',
  'businessChange',
  'serviceDissatisfied',
  'closedOrMerged',
  'other',
];
export const lostReasons: string[] = [
  'price',
  'toCompetitor',
  'noBudget',
  'noDecision',
  'requirementMismatch',
  'timing',
  'other',
];
export const pauseReasons: string[] = [
  'budgetDeferred',
  'priorityChanged',
  'decisionDelayed',
  'waitingOnCustomer',
  'other',
];
// Currencies an opportunity can be priced in; the settings page can extend
// the list. Three-letter ISO codes, which the money formatter understands.
export const currencies: string[] = [
  'USD',
  'CNY',
  'EUR',
  'GBP',
  'JPY',
  'HKD',
  'SGD',
  'AUD',
  'CAD',
];
export const stages: string[] = [
  'contact',
  'qualification',
  'validation',
  'proposal',
  'negotiation',
  'contract',
  'won',
  'lost',
  'paused',
];
export const probabilities: Record<string, number> = {
  contact: 0.1,
  qualification: 0.25,
  validation: 0.45,
  proposal: 0.6,
  negotiation: 0.75,
  contract: 0.9,
  won: 1,
  lost: 0,
  paused: 0,
};
const field = (
  key: string,
  type: Field['type'] = 'text',
  required = false,
  options?: string[],
  relation?: Field['relation'],
): Field => ({ key, type, required, options, relation });
const owner: Field = field('ownerId', 'relation', true, undefined, 'users');
const source: Field = field('source', 'select', true, sources);
const attachments: Field = field('attachments', 'files');
const company: Field = field(
  'companyId',
  'relation',
  true,
  undefined,
  'companies',
);
// Country and subdivision carry ISO 3166 codes; the client renders localized
// labels. City stays free text because no bounded, authoritative city list exists.
export const employeeRanges = [
  '1-10',
  '11-50',
  '51-200',
  '201-500',
  '501-1000',
  '1001-5000',
  '5000+',
];
const geography: Field[] = [
  field('industry', 'select', false, industries),
  field('country', 'country', false, countryCodes),
  field('state', 'subdivision'),
  field('city'),
];
// A person's LinkedIn profile is an address kept as typed and opened from
// the record: LinkedIn offers no way to read a profile or its messages.
const person: Field[] = [
  field('phone'),
  field('email', 'email'),
  field('linkedin', 'url'),
  field('jobTitle'),
];
export const definitions: Record<Entity, EntityDefinition> = {
  leads: {
    table: 'crmLeads',
    statusField: 'status',
    statuses: ['new', 'working', 'nurturing', 'converted', 'invalid'],
    columns: [
      'name',
      'company',
      'jobTitle',
      'country',
      'status',
      'source',
      'ownerId',
      'updatedAt',
    ],
    fields: [
      field('name', 'text', true),
      field('company'),
      ...person,
      // As a contact's, and carried to the contact a conversion creates;
      // optional on a lead.
      field('gender', 'select', false, ['male', 'female', 'unknown']),
      owner,
      source,
      field('status', 'select', true, [
        'new',
        'working',
        'nurturing',
        'invalid',
      ]),
      field('invalidReason', 'select', false, [
        'notTarget',
        'badContact',
        'duplicate',
        'noNeed',
        'student',
        'competitor',
        'other',
      ]),
      field('employees', 'select', false, employeeRanges),
      // The company's annual revenue in a currency, as a company's, and
      // carried to it on conversion.
      field('currency', 'select', false, currencies),
      field('annualRevenue', 'number'),
      // The website beside the industry: both say what the company is, and
      // the form lays fields out in this order.
      geography[0],
      field('website', 'url'),
      ...geography.slice(1),
      field('address'),
      // A lead carries the enquiry as it arrived, which is not the same thing
      // as the description a company or opportunity is given later.
      field('message', 'textarea'),
      // What the company is, found by research; becomes the company's
      // introduction on conversion.
      field('companyDescription', 'textarea'),
      attachments,
    ],
  },
  companies: {
    table: 'crmCompanies',
    statusField: 'status',
    statuses: ['prospect', 'qualified', 'customer', 'inactive', 'churned'],
    columns: [
      'name',
      'status',
      'type',
      'industry',
      'employees',
      'country',
      'source',
      'ownerId',
      'updatedAt',
    ],
    fields: [
      field('name', 'text', true),
      owner,
      source,
      field('status', 'select', true, [
        'prospect',
        'qualified',
        'customer',
        'inactive',
        'churned',
      ]),
      field('churnReason', 'select', false, churnReasons),
      field('type', 'select', false, [
        'direct',
        'partner',
        'reseller',
        'other',
      ]),
      field('employees', 'select', false, employeeRanges),
      // Its annual revenue in a currency, as an opportunity's amount.
      field('currency', 'select', false, currencies),
      field('annualRevenue', 'number'),
      // The address right after the city it is in, as a lead's: the form
      // lays fields out in this order.
      ...geography,
      field('address'),
      field('website', 'url'),
      // Its LinkedIn page, as a person's profile.
      field('linkedin', 'url'),
      field('description', 'textarea'),
      attachments,
    ],
  },
  contacts: {
    table: 'crmContacts',
    statuses: [],
    columns: [
      'name',
      'companyId',
      'jobTitle',
      'email',
      'phone',
      'employed',
      'ownerId',
    ],
    fields: [
      field('name', 'text', true),
      company,
      ...person,
      owner,
      { ...source, required: false },
      field('gender', 'select', true, ['male', 'female', 'unknown']),
      field('employed', 'boolean'),
      // The main person to reach at the company; false unless chosen.
      field('primary', 'boolean'),
    ],
  },
  opportunities: {
    table: 'crmOpportunities',
    statusField: 'stage',
    statuses: stages,
    // The amount column is formatted in its currency, so no currency column.
    columns: [
      'name',
      'companyId',
      'stage',
      'businessType',
      'amount',
      'expectedCloseAt',
      'ownerId',
    ],
    fields: [
      field('name', 'text', true),
      company,
      owner,
      field('stage', 'select', true, stages),
      field('amount', 'number'),
      field('currency', 'select', true, currencies),
      field('expectedCloseAt', 'date'),
      source,
      field('businessType', 'select', false, [
        'newBusiness',
        'expansion',
        'crossSell',
        'renewal',
        'tender',
        'other',
      ]),
      field('contacts', 'contacts'),
      field('description', 'textarea'),
      field('lostReason', 'select', false, lostReasons),
      field('pauseReason', 'select', false, pauseReasons),
      field('resumeAt', 'date'),
      attachments,
    ],
  },
  tasks: {
    table: 'crmTasks',
    statusField: 'status',
    statuses: ['open', 'completed', 'cancelled'],
    columns: ['name', 'dueAt', 'status', 'companyId', 'ownerId'],
    fields: [
      // What to do, in the person's words: no type to pick.
      field('name', 'text', true),
      owner,
      field('status', 'select', true, ['open', 'completed', 'cancelled']),
      // Optional: a time, or a date alone, kept as the last instant of
      // that business day (isEndOfDay in zone-time.ts); with a time it is
      // reminded of before it starts.
      field('dueAt', 'datetime', false),
      // Optional: a task may stand on its own.
      field('leadId', 'relation', false, undefined, 'leads'),
      { ...company, required: false },
      field('opportunityId', 'relation', false, undefined, 'opportunities'),
      field('internalParticipants', 'multi', false, undefined, 'users'),
      field('description', 'textarea'),
      // What came of it, written when it is done.
      field('result', 'textarea'),
      attachments,
    ],
  },
  approvals: {
    table: 'crmApprovals',
    statusField: 'status',
    statuses: ['draft', 'pending', 'approved', 'rejected', 'withdrawn'],
    columns: [
      'name',
      'opportunityId',
      'topic',
      'status',
      'ownerId',
      'approverId',
      'submittedAt',
    ],
    fields: [
      field('name', 'text', true),
      field('opportunityId', 'relation', true, undefined, 'opportunities'),
      field('topic', 'select', true, [
        'discount',
        'paymentTerms',
        'contractTerms',
        'commitment',
        'other',
      ]),
      field('approverId', 'relation', false, undefined, 'users'),
      field('description', 'textarea'),
      attachments,
    ],
  },
};
export const entities: Entity[] = Object.keys(definitions) as Entity[];
export const systemFields: string[] = [
  'id',
  'name',
  'ownerId',
  'createdById',
  'createdAt',
  'updatedAt',
];
export const extraFields: Partial<Record<Entity, string[]>> = {
  leads: [
    'convertedAt',
    'convertedCompanyId',
    'convertedContactId',
    'convertedOpportunityId',
  ],
  opportunities: ['closedAt'],
  tasks: ['completedAt'],
  approvals: ['status', 'decisionComment', 'submittedAt', 'decidedAt'],
};
export function fieldsFor(entity: Entity): string[] {
  return [
    ...new Set([
      ...systemFields,
      ...definitions[entity].fields.map((f) => f.key),
      ...(extraFields[entity] ?? []),
    ]),
  ];
}
export interface CrmSettings {
  currency: string;
  timeZone: string;
  taskReminderMinutes: number;
  closeReminderDays: number;
  // A new lead nobody has contacted in this many days (the daily lead check).
  uncontactedDays: number;
  // A lead or a deal with no exchange (a task done, a comment, mail) in this
  // many days: stalled on the
  // dashboard, followed up by the daily checks.
  leadStaleDays: number;
  staleDays: number;
  // How many days after nurturing a lead its review comes, when the
  // customer named no time (lead-evaluation.ts).
  nurtureReviewDays: number;
  // The language the AI writes in when it works on its own (follow-ups,
  // approval reviews, the capture's replies, merge proposals, the daily
  // checks' task titles), the same for everyone so the team's AI records
  // read alike, and the language of the business guidance in the
  // assistant's prompt: `zh-CN` or `en-US`. The skills are English either
  // way. The chat always answers in the language the user writes in.
  aiLanguage: string;
  // Whether every page but the overview shows the assistant's ask box at
  // its bottom (assistant-dock.tsx), for the whole company; off, the
  // header's ✨ button opens the assistant.
  assistantDock: boolean;
  // Whether the CRM sends each kind of in-app message (service.ts,
  // queueMessage): approvals submitted, withdrawn and decided; records
  // changing hands and task participants told of a change; a colleague a
  // comment mentions and the people of a thread a reply answers; and
  // reminders before a task starts.
  notifyApprovals: boolean;
  notifyRecordChanges: boolean;
  notifyComments: boolean;
  notifyTaskReminders: boolean;
  // The deployment's business guidance as an administrator wrote it on the
  // settings page (Markdown); empty for the one shipped in guidance.ts, in
  // the AI language with the reminders' days. Every conversation and every
  // background run of the AI works from it (settingsGuidance).
  businessGuidance: string;
  options: Record<string, string[]>;
}
export type NotificationKind =
  'approvals' | 'recordChanges' | 'comments' | 'taskReminders';
export const notificationSwitches = {
  approvals: 'notifyApprovals',
  recordChanges: 'notifyRecordChanges',
  comments: 'notifyComments',
  taskReminders: 'notifyTaskReminders',
} as const satisfies Record<NotificationKind, keyof CrmSettings>;
export const aiLanguages = ['zh-CN', 'en-US'];
// The currency a company starts with, by the application's language
// (`i18n.defaultLocale`): the one most of its users trade in, among
// `currencies`; USD where theirs is not offered.
export function defaultCurrencyFor(locale: string | undefined): string {
  if (locale?.startsWith('zh-CN')) return 'CNY';
  if (locale?.startsWith('ja')) return 'JPY';
  if (['de', 'fr', 'es'].some((language) => locale?.startsWith(language)))
    return 'EUR';
  return 'USD';
}
// The business time zone a company starts with, by the application's
// language: its country's (the capital's where it has several), and US
// Eastern time for English and any other.
const LANGUAGE_TIME_ZONES: readonly [string, string][] = [
  ['zh-CN', 'Asia/Shanghai'],
  ['zh-TW', 'Asia/Taipei'],
  ['ja', 'Asia/Tokyo'],
  ['de', 'Europe/Berlin'],
  ['fr', 'Europe/Paris'],
  ['es', 'Europe/Madrid'],
  ['pt-BR', 'America/Sao_Paulo'],
  ['id', 'Asia/Jakarta'],
  ['vi', 'Asia/Ho_Chi_Minh'],
  ['ko', 'Asia/Seoul'],
  ['ru', 'Europe/Moscow'],
];
export function defaultTimeZoneFor(locale: string | undefined): string {
  return (
    LANGUAGE_TIME_ZONES.find(([language]) =>
      locale?.startsWith(language),
    )?.[1] ?? DEFAULT_TIME_ZONE
  );
}
export const defaultSettings: CrmSettings = {
  currency: 'USD',
  timeZone: DEFAULT_TIME_ZONE,
  taskReminderMinutes: 30,
  closeReminderDays: 7,
  uncontactedDays: 2,
  leadStaleDays: 14,
  staleDays: 14,
  nurtureReviewDays: 90,
  aiLanguage: 'en-US',
  assistantDock: true,
  notifyApprovals: true,
  notifyRecordChanges: true,
  notifyComments: true,
  notifyTaskReminders: true,
  businessGuidance: '',
  options: {
    source: sources,
    industry: industries,
    businessType: [
      'newBusiness',
      'expansion',
      'crossSell',
      'renewal',
      'tender',
      'other',
    ],
    companyType: ['direct', 'partner', 'reseller', 'other'],
    churnReason: churnReasons,
    currency: currencies,
    lostReason: lostReasons,
    pauseReason: pauseReasons,
    invalidReason: [
      'notTarget',
      'badContact',
      'duplicate',
      'noNeed',
      'student',
      'competitor',
      'other',
    ],
    topic: ['discount', 'paymentTerms', 'contractTerms', 'commitment', 'other'],
  },
};
export class CrmError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 400,
    public readonly field?: string,
    // Text from an upstream system, shown verbatim: a model provider explains a
    // refusal far better than any message this application could invent.
    public readonly detail?: string,
  ) {
    super(code);
  }
}
export function asEntity(value: string): Entity {
  if (!entities.includes(value as Entity)) throw new CrmError('notFound', 404);
  return value as Entity;
}
export function object(value: unknown): Row {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new CrmError('invalidInput');
  return value as Row;
}

// The same field information as JSON.stringify(definitions) in roughly half
// the characters, for the AI employee's prompt: one line per object, "!"
// marks required, "->" names the related object, parentheses list the
// allowed values. Derived from definitions, so a schema change still reaches
// the model without touching the prompt.
export function compactSchema(): string {
  return Object.entries(definitions)
    .map(([name, definition]) => {
      const fields = definition.fields
        .map((field) => {
          const options = field.options?.length
            ? `(${field.options.join('|')})`
            : '';
          return `${field.key}:${field.type}${field.required ? '!' : ''}${
            field.relation ? `->${field.relation}` : ''
          }${options}`;
        })
        .join(' ');
      return `${name} [${fields}]`;
    })
    .join('\n');
}
