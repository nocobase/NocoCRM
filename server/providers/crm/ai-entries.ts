import { toText } from './schema.js';
import { jsonValue } from './values.js';
import type { Row } from '@nocobase/db';

// The AI's own entries in a record's activity feed (crmHistory, action
// `ai`): what it concluded and where that stands. Read by the feed and by
// the evaluator (lead-evaluation.ts), kept apart so neither imports the
// other.

export const EVALUATION = 'evaluation';
// A run started this long ago and still going is taken to have died with
// the process that ran it; one still waiting its turn (no `startedAt`), after
// a day, its task lost (a process killed without shutting down).
const STALE_AFTER_MS = 10 * 60 * 1000;
const QUEUED_STALE_AFTER_MS = 24 * 60 * 60 * 1000;

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
    // Its owner, when the AI named one (else the record's owner).
    ownerId?: string | null;
  } | null;
  prep?: string[];
  questions: string[];
  // Converting: the opportunity to open.
  // Its currency, when the AI named one; else the CRM's default.
  opportunity?: {
    name: string;
    amount: number | null;
    currency?: string | null;
  } | null;
  // Nurturing: when to look at it again.
  reviewInDays?: number | null;
  // What changed since the previous recommendation, when there was one.
  changes?: string[];
  // Following up by email: the draft, never sent by the CRM.
  email?: { subject: string; body: string } | null;
  // Particulars found on the web, offered to fill the lead.
  enrich?: Enrichment[];
}

// An opportunity's follow-up recommendation (opportunity-evaluation.ts):
// move it to another stage, keep at it where it is, pause it or lose it,
// with how likely it is to close, the reasons, the risks and what to do
// next.
export interface OpportunityVerdict {
  recommendation: 'advance' | 'continue' | 'pause' | 'lose';
  confidence: 'high' | 'medium' | 'low' | null;
  // Advancing (or going back): the stage the evidence supports.
  stage: string | null;
  summary: string;
  reasons: string[];
  risks: string[];
  nextStep: Verdict['nextStep'];
  prep: string[];
  questions: string[];
  email: { subject: string; body: string } | null;
  // The amount or the expected close date to change, with why, and what the
  // deal holds now (null when empty).
  updates: OpportunityUpdate[];
  pauseReason: string | null;
  resumeInDays: number | null;
  lostReason: string | null;
  // Lost: when to look in on the customer again, if worth it.
  revisitInDays: number | null;
  changes: string[];
}

export interface OpportunityUpdate {
  field: 'amount' | 'expectedCloseAt';
  value: string;
  reason: string;
  current: string | null;
}

// A value found on the web for one of the lead's fields, with its source and
// what the lead holds now (null when empty).
export interface Enrichment {
  field: string;
  value: string;
  source: string | null;
  current: string | null;
}

export interface EvaluationEntry<V = Verdict> {
  id: string;
  recordId: string;
  // `superseded`: a newer evaluation of the same record replaced it.
  status:
    'running' | 'pending' | 'accepted' | 'dismissed' | 'failed' | 'superseded';
  createdAt: string;
  ai: {
    kind: typeof EVALUATION;
    result?: V;
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
    // The deal's fields the person kept with an accept (an opportunity's
    // amount or expected close date).
    updatedFields?: string[];
    // What started a follow-up the system ran on its own (a signal, a
    // changed company, an activity marked done); absent when asked for.
    trigger?: string;
    // When a running card's run began; absent while it waits its turn.
    startedAt?: string;
  };
}

export function readEntry<V = Verdict>(row: Row): EvaluationEntry<V> {
  const ai = (jsonValue(row.ai) ?? {}) as EvaluationEntry<V>['ai'];
  let status = toText(row.aiStatus) as EvaluationEntry['status'];
  if (
    status === 'running' &&
    (ai.startedAt
      ? Date.now() - Date.parse(ai.startedAt) > STALE_AFTER_MS
      : Date.now() - Date.parse(toText(row.createdAt)) > QUEUED_STALE_AFTER_MS)
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
