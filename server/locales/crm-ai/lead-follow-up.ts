// The words of the AI's lead follow-up (server/providers/crm/lead-evaluation.ts)
// that reach people or that the model is told to reuse in its output, in
// both languages: Chinese first, English second.

import type { Pair, Pairs } from './index.js';

// The title of the unattended conversation a follow-up runs in.
export const followUpTitle: Pair = ['跟进线索', 'Lead follow-up'];

// The name of the review task a nurtured lead gets, after the company name.
export const nurtureReviewName: Pair = ['培育复查', 'nurture review'];

// An activity's name where the model left its reference (A1…) in a text;
// `%s` is the name. Chinese corner brackets, English quotation marks.
export const activityNameQuote: Pair = ['「%s」', '“%s”'];

// Words the verdict prompt hands the model to write in its output, in the
// output language.
export const followUpWords = {
  // What `changes` says when nothing changed.
  noChange: ['没有变化', 'No change'],
  // A side of a change that had or has no value.
  none: ['无', 'None'],
  // The reason noting that this run did not search the web.
  notResearched: ['本次未联网', 'Not researched on the web this time'],
  // What the research turn writes when the search found nothing.
  notFound: ['未查到', 'Nothing found'],
  // An example of an edition's name.
  editionExample: ['专业版', 'Professional'],
  // How a suggested value names the CRM material it came from.
  originalMessage: ['原始信息', 'original message'],
  note: ['备注', 'note'],
} as const satisfies Pairs;
