// The words an opportunity's follow-up (server/providers/crm/opportunity-
// evaluation.ts) puts in front of people or of the model, Chinese first.

import type { Pair, Pairs } from './index.js';

// The deal's stages by key, as the model reads and repeats them.
export const dealStageNames = {
  contact: ['初步接触', 'Initial contact'],
  qualification: ['需求确认', 'Qualification'],
  validation: ['方案验证', 'Validation'],
  proposal: ['方案报价', 'Proposal'],
  negotiation: ['商务谈判', 'Negotiation'],
  contract: ['合同签署', 'Contract'],
  won: ['赢单', 'Won'],
  lost: ['输单', 'Lost'],
  paused: ['暂停', 'Paused'],
} as const satisfies Pairs;

// A contact's role on the deal by key.
export const dealContactRoles = {
  decisionMaker: ['决策', 'Decision maker'],
  champion: ['推动', 'Champion'],
  evaluator: ['评估', 'Evaluator'],
  influencer: ['影响', 'Influencer'],
  user: ['使用', 'End user'],
  blocker: ['阻碍', 'Blocker'],
  other: ['其他', 'Other'],
} as const satisfies Pairs;

// The follow-up's conversation title.
export const dealFollowUpTitle: Pair = ['推进商机', 'Opportunity follow-up'];

// What the model writes in `changes` when nothing changed, and for a side
// that has nothing; and in the research when nothing was found.
export const dealWords = {
  noChange: ['没有变化', 'No change'],
  none: ['无', 'none'],
  nothingFound: ['未查到', 'Nothing found'],
} as const satisfies Pairs;

// The task planned after a pause (to resume) or a loss (to revisit), after
// the deal's name.
export const dealTaskNames = {
  resume: ['恢复跟进', 'resume'],
  revisit: ['回访', 'revisit'],
} as const satisfies Pairs;
