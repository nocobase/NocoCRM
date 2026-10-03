// The words the AI's review of an approval request puts before the model
// and the approver (server/providers/crm/approval-review.ts): the names of
// the values it reads, which it reuses in what it writes, picked in the
// language it writes in.
import type { Pair, Pairs } from './index.js';

export const reviewTitle: Pair = ['审批辅助', 'Approval review'];

export const stageNames = {
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

export const topicNames = {
  discount: ['折扣', 'Discount'],
  paymentTerms: ['付款条款', 'Payment terms'],
  contractTerms: ['合同条款', 'Contract terms'],
  commitment: ['商务承诺', 'Business commitment'],
  other: ['其他', 'Other'],
} as const satisfies Pairs;

export const statusNames = {
  draft: ['草稿', 'Draft'],
  pending: ['审批中', 'Pending'],
  approved: ['已通过', 'Approved'],
  rejected: ['已驳回', 'Rejected'],
  withdrawn: ['已撤回', 'Withdrawn'],
} as const satisfies Pairs;

export const roleNames = {
  decisionMaker: ['决策', 'Decision maker'],
  champion: ['推动', 'Champion'],
  evaluator: ['评估', 'Evaluator'],
  influencer: ['影响', 'Influencer'],
  user: ['使用', 'User'],
  blocker: ['阻碍', 'Blocker'],
  other: ['其他', 'Other'],
} as const satisfies Pairs;
