import { LifecycleError } from '@nocobase/lifecycle';
import { createLifecycleTestKit } from '@nocobase/lifecycle/testing';
import { describe, expect, it } from 'vitest';
import { approvalLifecycle } from '../../server/lifecycles/approvals.js';

// The approvals' lifecycle (server/lifecycles/approvals.ts) on the library's
// test kit: a memory store and a fake clock, so its rules are checked
// without a database. CrmService checks permissions before firing
// (crm.test.ts covers those); these are the rules any caller meets.

const refusal = (promise: Promise<unknown>) =>
  promise.then(
    () => {
      throw new Error('expected a refusal');
    },
    (error: unknown) => {
      if (!(error instanceof LifecycleError)) throw error;
      return { code: error.code, blocker: error.blockers[0]?.code };
    },
  );

describe('the approvals lifecycle', () => {
  it('goes from a draft to a decision, and back to the applicant when withdrawn', async () => {
    const kit = createLifecycleTestKit(approvalLifecycle, {
      now: '2026-10-13T08:00:00.000Z',
    });
    const approval = await kit.start(
      { ownerId: 'rep', approverId: 'manager' },
      { actor: 'rep' },
    );
    expect(approval.status).toBe('draft');
    let now = await kit.fire(approval, 'submit', {}, { actor: 'rep' });
    expect(now).toMatchObject({
      status: 'pending',
      submittedAt: '2026-10-13T08:00:00.000Z',
      decidedAt: null,
    });
    // Withdrawn, it is the applicant's again, and may be submitted anew.
    await kit.fire(approval, 'withdraw', {}, { actor: 'rep' });
    kit.advance({ hours: 2 });
    now = await kit.fire(approval, 'submit', {}, { actor: 'rep' });
    expect(now.submittedAt).toBe('2026-10-13T10:00:00.000Z');
    now = await kit.fire(
      approval,
      'approve',
      { comment: 'Fine for this deal.' },
      { actor: 'manager' },
    );
    expect(now).toMatchObject({
      status: 'approved',
      decisionComment: 'Fine for this deal.',
      decidedAt: '2026-10-13T10:00:00.000Z',
    });
    expect(await kit.history(approval)).toEqual([
      '$create',
      'submit',
      'withdraw',
      'submit',
      'approve',
    ]);
    // A decision ends it.
    expect(
      (await kit.available(approval, 'rep')).map((item) => item.name),
    ).toEqual([]);
  });

  it('lets only the applicant submit or withdraw, and only the approver decide', async () => {
    const kit = createLifecycleTestKit(approvalLifecycle);
    const approval = await kit.start(
      { ownerId: 'rep', approverId: 'manager' },
      { actor: 'rep' },
    );
    expect(
      await refusal(kit.fire(approval, 'submit', {}, { actor: 'manager' })),
    ).toEqual({ code: 'GUARD_REJECTED', blocker: 'approvalLocked' });
    await kit.fire(approval, 'submit', {}, { actor: 'rep' });
    expect(
      await refusal(kit.fire(approval, 'approve', {}, { actor: 'rep' })),
    ).toEqual({ code: 'GUARD_REJECTED', blocker: 'forbidden' });
    expect(
      await refusal(kit.fire(approval, 'reject', {}, { actor: 'other' })),
    ).toEqual({ code: 'GUARD_REJECTED', blocker: 'forbidden' });
    expect(
      await refusal(kit.fire(approval, 'withdraw', {}, { actor: 'manager' })),
    ).toEqual({ code: 'GUARD_REJECTED', blocker: 'approvalLocked' });
    // An applicant who is their request's approver decides it: whether
    // they may be chosen is CrmService.checkApprover's (only when no one
    // else may approve), not the lifecycle's.
    const own = await kit.start(
      { ownerId: 'manager', approverId: 'manager' },
      { actor: 'manager' },
    );
    await kit.fire(own, 'submit', {}, { actor: 'manager' });
    await kit.fire(own, 'approve', {}, { actor: 'manager' });
  });

  it('asks for an approver before a submission, and refuses moves the state does not allow', async () => {
    const kit = createLifecycleTestKit(approvalLifecycle);
    const approval = await kit.start(
      { ownerId: 'rep', approverId: null },
      { actor: 'rep' },
    );
    expect(
      await refusal(kit.fire(approval, 'submit', {}, { actor: 'rep' })),
    ).toEqual({ code: 'GUARD_REJECTED', blocker: 'required' });
    expect(
      await refusal(kit.fire(approval, 'approve', {}, { actor: 'manager' })),
    ).toMatchObject({ code: 'INVALID_STATE' });
    kit.update(approval, { approverId: 'manager' });
    await kit.fire(approval, 'submit', {}, { actor: 'rep' });
    await kit.fire(approval, 'reject', {}, { actor: 'manager' });
    // Rejected is final: a new request is a new approval.
    expect(
      await refusal(kit.fire(approval, 'submit', {}, { actor: 'rep' })),
    ).toMatchObject({ code: 'INVALID_STATE' });
  });
});
