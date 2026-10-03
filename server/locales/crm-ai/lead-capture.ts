import type { Pair } from './index.js';

// The capture's conversation titles, by whether it organises a text or
// adjusts the leads organised from one.
export const captureTitles = {
  organise: ['线索整理', 'Lead capture'],
  adjust: ['线索整理：调整', 'Lead capture: adjust'],
} as const satisfies Record<string, Pair>;

// A few of the lead form's labels as the user sees them, for the model to
// call the fields by in its reply (client/locales/crm has them all).
export const captureFormLabels: readonly Pair[] = [
  ['原始信息', 'Original message'],
  ['职位', 'Job title'],
  ['公司', 'Company'],
  ['负责人', 'Owner'],
];
