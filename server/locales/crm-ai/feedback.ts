// The words of an activity's feedback as the AI writes it up
// (server/providers/crm/feedback.ts): its conversation's title and the
// headings of the feedback, picked in the language it writes in.
import type { Pair, Pairs } from './index.js';

export const feedbackTitle: Pair = [
  '整理活动反馈',
  'Write up activity feedback',
];

export const feedbackHeadings = {
  feedback: ['对方反馈', 'Their feedback'],
  facts: ['确认的事实', 'Facts confirmed'],
  agreed: ['约定', 'Agreed'],
  next: ['下一步', 'Next steps'],
} as const satisfies Pairs;
