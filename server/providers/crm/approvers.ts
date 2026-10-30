import {
  resolveReviewerSelections,
  type ReviewerSelection,
} from '@nocobase/lifecycle';

import { roles } from './roles.js';
import { CrmError } from './schema.js';

// The approver rule (server/lifecycles/approvals.ts) as people: the users it
// names by role or by id who are active and hold the `approve` capability,
// for the pickers (a user's `canApprove`) and for the check before a draft
// is saved or submitted (CrmService.checkApprover). Resolved before a
// transaction opens, from the users CrmService.users lists, since who holds
// a role and a capability is not read inside SQLite's one transaction. The
// applicant, where a request is known, may be chosen only when no one else
// is named (`selfApproval`), which is checked there, not here.

export interface ApproverCandidate {
  readonly id: string;
  readonly roles: readonly string[];
  readonly disabled: boolean;
}

export async function resolveApprovers(
  rule: readonly ReviewerSelection[],
  users: readonly ApproverCandidate[],
  mayApprove: (id: string) => Promise<boolean>,
): Promise<ReadonlySet<string>> {
  const byId = new Map(users.map((user) => [user.id, user]));
  return new Set(
    await resolveReviewerSelections(
      rule,
      { scope: 'crm', applicantId: '' },
      {
        selectors: {
          role: async (role) =>
            users
              .filter((user) => user.roles.includes(role))
              .map((user) => user.id),
          user: async (id) => (byId.has(id) ? [id] : []),
        },
        eligible: async (id) =>
          byId.get(id)?.disabled === false && (await mayApprove(id)),
      },
    ),
  );
}

// The rule as Settings → Approval process edits it: the roles and the people
// who may approve, each a selection of its own, so any one of them is
// enough.
export interface ApproverRuleInput {
  readonly roles: readonly string[];
  readonly users: readonly string[];
}

export function approverRule(
  input: ApproverRuleInput,
  userIds: ReadonlySet<string>,
): ReviewerSelection[] {
  const chosenRoles = [...new Set(input.roles)];
  const chosenUsers = [...new Set(input.users)];
  if (chosenRoles.some((role) => !roles.includes(role)))
    throw new CrmError('invalidInput', 400, 'roles');
  if (chosenUsers.some((id) => !userIds.has(id)))
    throw new CrmError('invalidInput', 400, 'users');
  if (!chosenRoles.length && !chosenUsers.length)
    throw new CrmError('required', 400, 'roles');
  return [
    ...chosenRoles.map((referenceId) => ({ type: 'role', referenceId })),
    ...chosenUsers.map((referenceId) => ({ type: 'user', referenceId })),
  ].map((selection, index) => ({ group: index + 1, ...selection }));
}

// A stored rule back as roles and people. Every selection the page saves is
// a group of its own; a group of several (an intersection) is not one it
// writes, so it is not one it reads either.
export function approverRuleInput(
  rule: readonly ReviewerSelection[],
): ApproverRuleInput {
  return {
    roles: rule.filter((s) => s.type === 'role').map((s) => s.referenceId),
    users: rule.filter((s) => s.type === 'user').map((s) => s.referenceId),
  };
}
