// The words of the AI's proposal for merging two leads
// (server/providers/crm/lead-merge.ts): its conversation's title and the
// names it gives the two leads, which the model reuses in what it writes,
// picked in the language it writes in.
import type { Pair, Pairs } from './index.js';

export const mergeTitle: Pair = ['合并重复线索', 'Merge duplicate leads'];

export const mergeLabels = {
  // What the line that names a lead is headed (see nameLine).
  callIt: ['称呼', 'Refer to as'],
  unsaved: ['新整理的内容', 'the newly organised lead'],
  thisLead: ['本页这条', 'this lead'],
  otherLead: ['另一条', 'the other lead'],
  unsavedSummary: [
    '刚由 AI 从销售粘贴的文字整理出来，还没有保存成线索，没有活动和备注',
    'Just organised by the AI from text a salesperson pasted; not yet saved as a lead, with no activities or notes',
  ],
} as const satisfies Pairs;

// A lead named by the day it was created (`day` as YYYY-MM-DD).
export const createdOn = (day: string): Pair => {
  const [, month, date] = day.split('-');
  return [
    `${Number(month)} 月 ${Number(date)} 日创建的那条`,
    `the lead created on ${day}`,
  ];
};

// The line that gives a lead the name the model is to call it by.
export const nameLine = (name: string): Pair => [
  `称呼：${name}`,
  `Refer to as: ${name}`,
];

// A saved lead's dates and how much history it has.
export const leadSummary = (
  created: string,
  updated: string,
  activities: number,
  notes: number,
): Pair => [
  `创建于 ${created}，更新于 ${updated}；活动 ${activities} 条，备注 ${notes} 条`,
  `Created ${created}, updated ${updated}; ${activities} activities, ${notes} notes`,
];

// The Chinese words at the end of a company's name that only say what kind
// of company it is (joint-stock limited, limited liability, limited, group,
// company), left off when two names are compared; the longer before the
// shorter that ends it.
export const companySuffixes: readonly string[] = [
  '股份有限公司',
  '有限责任公司',
  '有限公司',
  '集团',
  '公司',
];
