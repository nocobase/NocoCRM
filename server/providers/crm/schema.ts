import type { Row } from '@nocobase/db';
import { countryCodes } from './geography.js';
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
  | 'leads'
  | 'accounts'
  | 'contacts'
  | 'opportunities'
  | 'activities'
  | 'approvals';
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
const account: Field = field(
  'accountId',
  'relation',
  true,
  undefined,
  'accounts',
);
// Country and subdivision carry ISO 3166 codes; the client renders localized
// labels. City stays free text because no bounded, authoritative city list exists.
const employeeRanges = [
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
const person: Field[] = [
  field('phone'),
  field('email', 'email'),
  field('jobTitle'),
];
export const definitions: Record<Entity, EntityDefinition> = {
  leads: {
    table: 'crmLeads',
    statusField: 'status',
    statuses: ['new', 'working', 'nurturing', 'converted', 'invalid'],
    columns: ['name', 'company', 'status', 'source', 'ownerId', 'updatedAt'],
    fields: [
      field('name', 'text', true),
      field('company'),
      ...person,
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
      ...geography,
      field('address'),
      field('website', 'url'),
      // A lead carries the enquiry as it arrived, which is not the same thing
      // as the description an account or opportunity is given later.
      field('message', 'textarea'),
      // What the company is, found by research; becomes the account's
      // introduction on conversion.
      field('companyDescription', 'textarea'),
      attachments,
    ],
  },
  accounts: {
    table: 'crmAccounts',
    statusField: 'status',
    statuses: ['prospect', 'qualified', 'customer', 'inactive', 'churned'],
    columns: ['name', 'status', 'industry', 'source', 'ownerId', 'updatedAt'],
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
      ...geography,
      field('website', 'url'),
      field('address'),
      field('description', 'textarea'),
      field('notes', 'textarea'),
      attachments,
    ],
  },
  contacts: {
    table: 'crmContacts',
    statuses: [],
    columns: [
      'name',
      'accountId',
      'jobTitle',
      'email',
      'phone',
      'employed',
      'ownerId',
    ],
    fields: [
      field('name', 'text', true),
      account,
      ...person,
      owner,
      { ...source, required: false },
      field('gender', 'select', true, ['male', 'female', 'unknown']),
      field('employed', 'boolean'),
      // The main person to reach at the account; false unless chosen.
      field('primary', 'boolean'),
      field('notes', 'textarea'),
    ],
  },
  opportunities: {
    table: 'crmOpportunities',
    statusField: 'stage',
    statuses: stages,
    // The amount column is formatted in its currency, so no currency column.
    columns: [
      'name',
      'accountId',
      'stage',
      'amount',
      'expectedCloseAt',
      'ownerId',
    ],
    fields: [
      field('name', 'text', true),
      account,
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
  activities: {
    table: 'crmActivities',
    statusField: 'status',
    statuses: ['planned', 'completed', 'cancelled', 'noShow'],
    columns: ['name', 'type', 'startAt', 'status', 'accountId', 'ownerId'],
    fields: [
      // Type leads: "a call about X" is how an activity is thought of.
      field('type', 'select', true, [
        'call',
        'meeting',
        'email',
        'task',
        'meal',
        'visit',
        'demo',
        'other',
      ]),
      field('name', 'text', true),
      owner,
      field('status', 'select', true, [
        'planned',
        'completed',
        'cancelled',
        'noShow',
      ]),
      field('startAt', 'datetime', true),
      field('endAt', 'datetime', true),
      field('leadId', 'relation', false, undefined, 'leads'),
      { ...account, required: false },
      field('opportunityId', 'relation', false, undefined, 'opportunities'),
      field('internalParticipants', 'multi', false, undefined, 'users'),
      field('externalParticipants', 'multi', false, undefined, 'contacts'),
      field('description', 'textarea'),
      field('feedback', 'textarea'),
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
    'convertedAccountId',
    'convertedContactId',
    'convertedOpportunityId',
  ],
  opportunities: ['closedAt'],
  activities: ['completedAt'],
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
  aiEnabled: boolean;
  activityReminderMinutes: number;
  closeReminderDays: number;
  leadStaleDays: number;
  staleDays: number;
  aiService: string;
  aiModel: string;
  aiInstructions: string;
  options: Record<string, string[]>;
}
export const defaultSettings: CrmSettings = {
  currency: 'USD',
  timeZone: 'Asia/Shanghai',
  aiEnabled: true,
  activityReminderMinutes: 30,
  closeReminderDays: 7,
  leadStaleDays: 7,
  staleDays: 14,
  aiService: '',
  aiModel: '',
  aiInstructions: '',
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
    accountType: ['direct', 'partner', 'reseller', 'other'],
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
