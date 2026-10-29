import { describe, expect, it, vi } from 'vitest';
import {
  removeDemoMailboxes,
  waitForDemoMailboxRemoval,
} from '../../server/providers/crm/demo-mail-cleanup.js';

type Listed = { id: string; removalFailed?: boolean };

// A Mail stand-in whose listAccounts answers with the next snapshot per call.
function fakeMail(snapshots: Listed[][]) {
  let call = 0;
  return {
    removeAccount: vi.fn(async () => undefined),
    listAccounts: vi.fn(
      async () => snapshots[Math.min(call++, snapshots.length - 1)] ?? [],
    ),
  };
}

const fast = { intervalMs: 1 };

describe('demo mailbox cleanup', () => {
  it('waits until removed accounts disappear', async () => {
    const mail = fakeMail([[{ id: 'a' }], [{ id: 'a' }], []]);
    await waitForDemoMailboxRemoval(mail, [{ id: 'a', userId: 'u' }], fast);
    expect(mail.listAccounts).toHaveBeenCalledTimes(3);
  });

  it('keeps waiting through a removal that failed once and Mail retries', async () => {
    const mail = fakeMail([
      [{ id: 'a', removalFailed: true }],
      [{ id: 'a', removalFailed: true }],
      [{ id: 'a' }],
      [],
    ]);
    await expect(
      waitForDemoMailboxRemoval(mail, [{ id: 'a', userId: 'u' }], fast),
    ).resolves.toBeUndefined();
  });

  it('names pending and failing accounts on timeout', async () => {
    const mail = fakeMail([
      [{ id: 'a', removalFailed: true }, { id: 'b' }, { id: 'other' }],
    ]);
    const wait = waitForDemoMailboxRemoval(
      mail,
      [
        { id: 'a', userId: 'u' },
        { id: 'b', userId: 'u' },
      ],
      { timeoutMs: 5, intervalMs: 1 },
    );
    await expect(wait).rejects.toThrow(/pending account IDs: a, b/u);
    await expect(wait).rejects.toThrow(/removalFailed for: a\./u);
  });

  it('does not resubmit accounts already being removed', async () => {
    const mail = fakeMail([[]]);
    await removeDemoMailboxes(
      mail,
      [
        { id: 'a', userId: 'u1', status: 'removing' },
        { id: 'b', userId: 'u2', status: 'active' },
      ],
      fast,
    );
    expect(mail.removeAccount).toHaveBeenCalledTimes(1);
    expect(mail.removeAccount).toHaveBeenCalledWith({ actorId: 'u2' }, 'b');
  });

  it('treats an account Mail already removed as gone', async () => {
    const mail = fakeMail([[]]);
    mail.removeAccount.mockRejectedValueOnce(
      Object.assign(new Error('Mail account was not found.'), {
        reason: 'MAIL_ACCOUNT_NOT_FOUND',
      }),
    );
    await expect(
      removeDemoMailboxes(
        mail,
        [{ id: 'a', userId: 'u', status: 'active' }],
        fast,
      ),
    ).resolves.toBeUndefined();
  });

  it('propagates other removal errors', async () => {
    const mail = fakeMail([[]]);
    mail.removeAccount.mockRejectedValueOnce(new Error('database down'));
    await expect(
      removeDemoMailboxes(
        mail,
        [{ id: 'a', userId: 'u', status: 'active' }],
        fast,
      ),
    ).rejects.toThrow('database down');
  });
});
