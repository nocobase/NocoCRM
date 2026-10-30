import type { User } from './api.js';

/**
 * The people an approval may be sent to: the active users the approver rule
 * names who hold `approve` (`canApprove`), other than the person choosing.
 * Oneself is offered only when no one else is, as the server's
 * `CrmService.checkApprover` allows, so a team with one approver can still
 * raise approvals.
 */
export function approverChoices(
  users: readonly User[],
  me: string | undefined,
): User[] {
  const approvers = users.filter((u) => !u.disabled && u.canApprove);
  const others = approvers.filter((u) => u.id !== me);
  return others.length ? others : approvers;
}
