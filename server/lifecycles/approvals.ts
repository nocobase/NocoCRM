import {
  defineLifecycle,
  normalizeReviewerSelections,
  type Lifecycle,
  type LifecycleRecord,
  type ParameterGroup,
  type ReviewerSelection,
  type TransitionContext,
} from '@nocobase/lifecycle';

// An approval's states as a record lifecycle of `@nocobase/lifecycle`: the
// state stays in its own `status`, and only the runtime changes it
// (CrmService.approvalAction fires these transitions; CrmService.save
// creates a draft through it). A draft or a withdrawn request is submitted
// to its approver; a pending one is withdrawn by its applicant, or approved
// or rejected by its approver, which ends it.
//
// The guards are the business rules the transitions keep whoever fires
// them. Permissions stay with the CRM: CrmService checks, before firing,
// that the applicant may still edit the deal, that the approver may
// decide (the `approve` capability) and is one the approver rule names,
// and answers in its own error codes; these guards refuse what slips past.
// Side effects (the messages, the AI's review, the deal's follow-up) still
// run on CrmService's after-commit path, with the transitions.
//
// Who may be chosen as approver is the approver rule, a parameter an
// administrator sets on Settings → Approval process: roles and people,
// each matching on its own. The runtime keeps its versions
// (server/providers/lifecycles.ts), reads it live, and logs which version
// each submission ran under. CrmService resolves it into people before its
// transaction opens (CrmService.users, server/providers/crm/approvers.ts),
// since who holds a role and a capability is not read inside SQLite's one
// transaction, and checks the chosen approver against it before a draft is
// saved or submitted; a request once submitted keeps its approver whatever
// the rule becomes.

export type ApprovalState =
  'draft' | 'pending' | 'approved' | 'rejected' | 'withdrawn';

export interface ApprovalRecord extends LifecycleRecord {
  readonly status: ApprovalState;
  readonly ownerId: string;
  readonly approverId: string | null;
}

export interface ApprovalParameters {
  readonly approverRule: readonly ReviewerSelection[];
}

export interface ApprovalTypes {
  record: ApprovalRecord;
  state: ApprovalState;
  parameters: ApprovalParameters;
}

// The name the runtime keys every entry by: never rename it.
export const APPROVAL_LIFECYCLE = 'approvals';

// What an approver rule may name: a CRM role (`sales-manager`), or a user
// by id. Each selection is a group of its own, so the rule is their union.
export const APPROVER_SELECTOR_TYPES = ['role', 'user'] as const;

// Before an administrator sets one: the sales managers, as the CRM always
// had it.
export const DEFAULT_APPROVER_RULE: readonly ReviewerSelection[] = [
  { group: 1, type: 'role', referenceId: 'sales-manager' },
];

// The configuration group the rule is stored under: never rename its key,
// and raise `schemaVersion` only with a migration of the stored versions.
export const approverParameterGroup: ParameterGroup = {
  key: 'approvers',
  title: 'Approvers',
  schemaVersion: 1,
  fields: {
    approverRule: {
      type: 'reviewers',
      title: 'Who may approve',
      parse: (value) =>
        normalizeReviewerSelections(value, APPROVER_SELECTOR_TYPES),
      bindings: [{ transition: 'submit' }],
    },
  },
};

// The longest decision comment kept, as the CRM's long texts.
const COMMENT_LIMIT = 10_000;

const applicantOnly = ({ record, actor }: TransitionContext<ApprovalTypes>) =>
  actor.id === record.ownerId || {
    code: 'approvalLocked',
    message: 'Only the applicant can do this.',
  };

// The approver decides, the applicant too when they are it: who may be
// chosen (oneself only when no one else may approve) is checked when the
// approver is saved and when the request is submitted (CrmService
// .checkApprover).
const approverOnly = ({ record, actor }: TransitionContext<ApprovalTypes>) =>
  actor.id === record.approverId || {
    code: 'forbidden',
    message: 'Only the approver can decide.',
  };

const decided = ({ input, now }: TransitionContext<ApprovalTypes>) => ({
  decisionComment:
    typeof input.comment === 'string'
      ? input.comment.slice(0, COMMENT_LIMIT)
      : '',
  decidedAt: now.toISOString(),
  updatedAt: now.toISOString(),
});

export const approvalLifecycle: Lifecycle<ApprovalTypes> =
  defineLifecycle<ApprovalTypes>({
    name: APPROVAL_LIFECYCLE,
    collection: 'crmApprovals',
    initial: 'draft',
    states: [
      'draft',
      'pending',
      { name: 'approved', final: true },
      { name: 'rejected', final: true },
      'withdrawn',
    ],
    parameters: { approverRule: DEFAULT_APPROVER_RULE },
    parameterConfiguration: {
      readMode: 'live',
      groups: [approverParameterGroup],
    },
    transitions: {
      submit: {
        title: 'Submit',
        from: ['draft', 'withdrawn'],
        to: 'pending',
        guard: (context) => {
          const applicant = applicantOnly(context);
          if (applicant !== true) return applicant;
          return (
            Boolean(context.record.approverId) || {
              code: 'required',
              message: 'Choose an approver first.',
              kind: 'precondition',
            }
          );
        },
        // A new submission is decided afresh.
        set: ({ now }) => ({
          submittedAt: now.toISOString(),
          decisionComment: null,
          decidedAt: null,
          updatedAt: now.toISOString(),
        }),
      },
      withdraw: {
        title: 'Withdraw',
        from: 'pending',
        to: 'withdrawn',
        guard: applicantOnly,
        set: ({ now }) => ({ updatedAt: now.toISOString() }),
      },
      approve: {
        title: 'Approve',
        from: 'pending',
        to: 'approved',
        guard: approverOnly,
        set: decided,
      },
      reject: {
        title: 'Reject',
        from: 'pending',
        to: 'rejected',
        guard: approverOnly,
        set: decided,
      },
    },
  });
