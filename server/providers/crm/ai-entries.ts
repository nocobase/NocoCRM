import { toText } from './schema.js';
import { jsonValue } from './values.js';
import type { Row } from '@nocobase/db';

// The AI's own entries in a record's activity feed (crmHistory, action
// `ai`): what it concluded and where that stands. Read by the feed and by
// the evaluator (lead-evaluation.ts), kept apart so neither imports the
// other.

export const EVALUATION = 'evaluation';
// An entry still running after this long is taken to have died with the
// process that ran it.
const STALE_AFTER_MS = 10 * 60 * 1000;

// A lead's follow-up recommendation (lead-evaluation.ts): keep following it
// up, nurture it, convert it or set it aside as invalid, with the grade,
// the reasons and what to do next.
export interface Verdict {
  recommendation: 'follow' | 'nurture' | 'convert' | 'invalid';
  grade: 'A' | 'B' | 'C' | null;
  summary: string;
  reasons: string[];
  edition: string | null;
  invalidReason: string | null;
  // Following up: the next thing to do, when, what to prepare and ask.
  // `activityId`: an activity already planned that the step carries on
  // (prepared for, moved, or asked about when overdue) instead of a new one.
  nextStep: {
    type: string;
    subject: string;
    inDays: number;
    activityId?: string | null;
  } | null;
  prep?: string[];
  questions: string[];
  // Converting: the opportunity to open.
  opportunity?: { name: string; amount: number | null } | null;
  // Nurturing: when to look at it again.
  reviewInDays?: number | null;
  // What changed since the previous recommendation, when there was one.
  changes?: string[];
  // Following up by email: the draft, never sent by the CRM.
  email?: { subject: string; body: string } | null;
  // Particulars found on the web, offered to fill the lead.
  enrich?: Enrichment[];
}

// A value found on the web for one of the lead's fields, with its source and
// what the lead holds now (null when empty).
export interface Enrichment {
  field: string;
  value: string;
  source: string | null;
  current: string | null;
}

export interface EvaluationEntry {
  id: string;
  recordId: string;
  // `superseded`: a newer evaluation of the same lead replaced it.
  status:
    'running' | 'pending' | 'accepted' | 'dismissed' | 'failed' | 'superseded';
  createdAt: string;
  ai: {
    kind: typeof EVALUATION;
    result?: Verdict;
    error?: string;
    sessionId?: string;
    decidedById?: string;
    decidedAt?: string;
    activityId?: string;
    // When this run looked the company up on the web; a run that did not
    // (recently checked, see lead-evaluation.ts) leaves it out.
    researchedAt?: string;
    // A card redone as a person asked: the card it replaced, what they
    // asked and who.
    revises?: string;
    instruction?: string;
    instructedById?: string;
    // The web findings the person chose to write into the lead.
    enrichedFields?: string[];
    enrichedById?: string;
    enrichedAt?: string;
  };
}

export function readEntry(row: Row): EvaluationEntry {
  const ai = (jsonValue(row.ai) ?? {}) as EvaluationEntry['ai'];
  let status = toText(row.aiStatus) as EvaluationEntry['status'];
  if (
    status === 'running' &&
    Date.now() - Date.parse(toText(row.createdAt)) > STALE_AFTER_MS
  )
    status = 'failed';
  return {
    id: toText(row.id),
    recordId: toText(row.recordId),
    status,
    createdAt: toText(row.createdAt),
    ai,
  };
}
