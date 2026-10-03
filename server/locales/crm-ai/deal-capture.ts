import type { Pair } from './index.js';

// The deal capture's conversation titles, by whether it organises a text or
// adjusts the deal organised from one (server/providers/crm/opportunity-capture.ts).
export const dealCaptureTitles = {
  organise: ['商机整理', 'Opportunity capture'],
  adjust: ['商机整理：调整', 'Opportunity capture: adjust'],
} as const satisfies Record<string, Pair>;

// A few of the opportunity form's labels as the user sees them, for the
// model to call the fields by in its reply.
export const dealCaptureFormLabels: readonly Pair[] = [
  ['商机名称', 'Opportunity name'],
  ['客户', 'Account'],
  ['阶段', 'Stage'],
  ['金额', 'Amount'],
  ['预计成交日期', 'Expected close date'],
  ['业务类型', 'Business type'],
  ['描述', 'Description'],
  ['联系人', 'Contacts'],
];
