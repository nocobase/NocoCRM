import { z } from 'zod';
import { JsonObject, TitlesShape } from './common.js';
import { OpportunityContact, RecordSchemas } from './records.js';
import type {
  LeadDuplicate,
  MergeProposal,
} from '../../providers/crm/lead-merge.js';

// The leads', opportunities', tasks' and approvals' own operations: the AI's
// follow-ups and reviews, capture from pasted text, merging and converting
// leads, a task's outcome and an approval's decisions.

const id = z.string();
export const EntryParams = {
  leads: z.object({ leadId: id, entryId: id }),
  opportunities: z.object({ opportunityId: id, entryId: id }),
  approvals: z.object({ approvalId: id, entryId: id }),
  tasks: z.object({ taskId: id, entryId: id }),
};

// A suggestion of the AI on a record: a lead's or an opportunity's
// follow-up, an approval's review. Its result is the model's structured
// answer, whose shape is the kind's (lead-evaluation.ts,
// opportunity-evaluation.ts, approval-review.ts).
export const AiEntry = z
  .object({
    id: z.string(),
    recordId: z.string(),
    status: z.enum([
      'running',
      'pending',
      'accepted',
      'dismissed',
      'failed',
      'superseded',
    ]),
    createdAt: z.string(),
    ai: JsonObject.meta({
      description:
        "The AI's work: its `result`, what started it (`trigger`), and what became of it.",
    }),
  })
  .meta({ ref: 'CrmAiEntry' });

// Asking for a follow-up or a review; with `revise`, the waiting one is
// redone as the person asks.
export const EvaluateInput = z.strictObject({
  revise: z.string().optional().meta({
    description: 'The waiting entry to redo.',
  }),
  instruction: z.string().max(1000).optional().meta({
    description: "What to change, in the person's words; with `revise`.",
  }),
});

// The task a card plans, as the person set it on the card, over what the
// AI proposed; for a task carried on, whether it was done and what came of
// it.
export const PlannedTask = z
  .object({
    name: z.string().optional(),
    dueAt: z.string().optional().meta({ description: 'An RFC 3339 time.' }),
    ownerId: z.string().optional(),
    description: z.string().optional().meta({ description: 'Markdown.' }),
    mode: z.enum(['report', 'reschedule']).optional().meta({
      description:
        'For a task carried on: `report` records its outcome, `reschedule` moves it.',
    }),
    outcome: z.string().optional(),
    followUp: z.boolean().optional().meta({
      description:
        'With `report`: whether the AI follows the record up anew; true by default.',
    }),
  })
  .meta({ ref: 'CrmPlannedTask' });

const findings = z.array(z.string()).meta({
  description: 'The fields of its findings to write into the record.',
});

export const DecideLeadEvaluationInput = z.strictObject({
  decision: z.enum(['accept', 'dismiss']),
  fields: findings.optional(),
  task: PlannedTask.optional(),
});

export const DecideOpportunityEvaluationInput = z.strictObject({
  decision: z.enum(['accept', 'dismiss']),
  fields: findings.optional(),
  task: PlannedTask.optional(),
  approvals: z
    .array(
      z.object({
        index: z.number().int().min(0),
        approverId: z.string().optional(),
      }),
    )
    .optional()
    .meta({
      description:
        'The proposed approvals to submit, by their place in the result, each to its approver.',
    }),
  contacts: z.array(z.number().int().min(0)).optional().meta({
    description: 'The proposed people to keep, by their place in the result.',
  }),
});

export const EnrichInput = z.strictObject({
  fields: findings.min(1),
});

// The owner's decision on a task's preparation: its points written into the
// task's description, or the card set aside.
export const DecidePreparationInput = z.strictObject({
  decision: z.enum(['accept', 'dismiss']),
});

export const DecideReviewInput = z.strictObject({
  decision: z.enum(['approve', 'reject', 'dismiss']),
  comment: z.string().optional().meta({
    description: "The decision's comment, with approve or reject.",
  }),
});

// New lead with the AI: the pasted text, and, to adjust, the person's
// instruction with the leads as the review holds them.
export const CaptureLeadsInput = z.strictObject({
  text: z.string().meta({ description: 'The pasted text.' }),
  instruction: z.string().optional(),
  leads: z
    .array(
      // A lead form's values as they stand, under the review's key; the
      // capture reads the lead's fields from it and ignores the rest.
      z.object({ ref: z.string() }).catchall(z.unknown()),
    )
    .max(20)
    .optional(),
  // The labels the dialog shows: a field's under its key, an option's
  // under `key.value`, for the AI to name them by.
  labels: z.record(z.string(), z.string()).optional(),
});

export const CapturedLeads = z
  .object({
    leads: z.array(
      z.object({
        ref: z.string().optional(),
        input: JsonObject.meta({ description: "The lead form's values." }),
        uncertain: z.array(z.string()),
        duplicates: z.array(JsonObject),
      }),
    ),
    reply: z.string().optional(),
  })
  .meta({ ref: 'CrmCapturedLeads' });

const Person = z.object({
  name: z.string(),
  jobTitle: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  role: z.string(),
  contactId: z.string().nullable(),
  contactName: z.string().optional(),
});

export const CaptureOpportunityInput = z.strictObject({
  text: z.string().meta({ description: 'The pasted text.' }),
  instruction: z.string().optional(),
  // The opportunity form's values as they stand, its contact rows
  // included; the capture reads the opportunity's fields from it.
  deal: JsonObject.optional(),
  companyId: z.string().optional(),
  // The labels the dialog shows: a field's under its key, an option's
  // under `key.value`, for the AI to name them by.
  labels: z.record(z.string(), z.string()).optional(),
});

export const CapturedOpportunity = z
  .object({
    deal: z.object({
      input: JsonObject.meta({
        description: "The opportunity form's values.",
      }),
      company: z.string().nullable(),
      companies: z.array(z.object({ id: z.string(), name: z.string() })),
      people: z.array(Person),
      duplicates: z.array(
        z.object({ id: z.string(), name: z.string(), stage: z.string() }),
      ),
      uncertain: z.array(z.string()),
    }),
    reply: z.string().optional(),
  })
  .meta({ ref: 'CrmCapturedOpportunity' });

export const MatchCompanyInput = z.strictObject({
  companyId: z.string(),
  // The form's contact rows: a contact by its id, or a person new to the
  // CRM under `person`.
  people: z.array(JsonObject).max(20).optional(),
});

export const CompanyMatch = z.object({
  people: z.array(Person),
  duplicates: z.array(
    z.object({ id: z.string(), name: z.string(), stage: z.string() }),
  ),
});

export const LeadDuplicateSchema: z.ZodType<LeadDuplicate> = z
  .object({
    id: z.string(),
    name: z.string(),
    company: z.string(),
    status: z.string(),
    ownerId: z.string(),
    createdAt: z.string(),
    matched: z.array(z.enum(['email', 'phone', 'person'])),
    mergeable: z.boolean(),
  })
  .meta({ ref: 'CrmLeadDuplicate' });

// The other lead, or, with `input`, a lead not yet saved (the capture
// review's values).
const otherSide = {
  input: JsonObject.optional().meta({
    description: 'The values of a lead not yet saved, merged in instead.',
  }),
};
export const ProposeMergeInput = z.strictObject({
  with: z.string().optional().meta({ description: 'The other lead.' }),
  ...otherSide,
});

export const MergeProposalSchema: z.ZodType<MergeProposal> = z
  .object({
    leads: z.array(
      RecordSchemas.leads.extend({
        tasks: z.number().int(),
        comments: z.number().int(),
      }),
    ),
    keepId: z.string(),
    picks: z.record(z.string(), z.string()),
    reason: z.string(),
    reasons: z.record(z.string(), z.string()),
    keepable: z.array(z.string()),
    groups: z.array(z.string()),
    ai: z.boolean(),
  })
  .meta({ ref: 'CrmMergeProposal' }) as unknown as z.ZodType<MergeProposal>;

export const MergeLeadsInput = z.strictObject({
  from: z.string().optional().meta({
    description: 'The lead merged in and deleted.',
  }),
  ...otherSide,
  picks: z.record(z.string(), z.string()).optional().meta({
    description:
      'Per differing group, by its first field: the lead whose value it takes, or `both` for a long text.',
  }),
  followUp: z.boolean().optional().meta({
    description:
      'Whether the AI follows the kept lead up anew; true by default.',
  }),
});

export const ConversionPreview = z
  .object({
    lead: JsonObject,
    companies: z.array(JsonObject),
    contacts: z.array(JsonObject),
    opportunities: z.array(JsonObject),
    titles: TitlesShape.titles,
    names: TitlesShape.names,
  })
  .catchall(z.unknown())
  .meta({ ref: 'CrmConversionPreview' });

export const ConvertLeadInput = z.strictObject({
  companyId: z.string().nullable().optional().meta({
    description: 'An existing company; a new one is created without it.',
  }),
  contactId: z.string().nullable().optional().meta({
    description: 'An existing contact; a new one is created without it.',
  }),
  companyName: z.string().optional(),
  // Field values laid over what the lead gives the new company or contact;
  // saved like any create, which checks each.
  company: JsonObject.optional(),
  contact: JsonObject.optional(),
  overwriteCompanyFields: z.array(z.string()).optional().meta({
    description: "Fields of an existing company the lead's values replace.",
  }),
  overwriteContactFields: z.array(z.string()).optional(),
  createOpportunity: z.boolean().optional(),
  opportunityName: z.string().optional(),
  amount: z.number().nullable().optional(),
  opportunity: z
    .object({
      currency: z.string().optional(),
      expectedCloseAt: z.string().nullable().optional(),
    })
    .optional(),
  followUp: z.boolean().optional().meta({
    description:
      'Whether the AI follows the new opportunity up at once; true by default.',
  }),
});

export const OrganiseFeedbackInput = z.strictObject({
  text: z.string().meta({ description: 'The notes, as jotted down.' }),
});

export const RecordOutcomeInput = z.strictObject({
  outcome: z.string().optional().meta({ description: 'What came of it.' }),
  followUp: z.boolean().optional().meta({
    description:
      'Whether the AI follows its opportunity or lead up anew; true by default.',
  }),
});

export const ApprovalActionInput = z.strictObject({
  comment: z.string().optional().meta({
    description: "The decision's comment.",
  }),
});

export { OpportunityContact };
