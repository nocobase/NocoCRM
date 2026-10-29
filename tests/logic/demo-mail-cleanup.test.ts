import { afterEach, expect, test, vi } from 'vitest';
import type { MailService } from '@nocobase/app-plugin-mail/server';
import { waitForDemoMailboxRemoval } from '../../server/providers/crm/demo-mail-cleanup.js';

const accounts = [{ id: 'old-mailbox', userId: 'owner' }];
function mailbox(id: string, removalFailed = false) {
  return { id, status: 'removing', removalFailed };
}
function service(listAccounts: ReturnType<typeof vi.fn>) {
  return { listAccounts } as unknown as Pick<MailService, 'listAccounts'>;
}
afterEach(() => vi.useRealTimers());
test('waits for actual disappearance and ignores unrelated mailboxes', async () => {
  vi.useFakeTimers();
  const list = vi
    .fn()
    .mockResolvedValueOnce([mailbox('old-mailbox')])
    .mockResolvedValue([mailbox('unrelated', true)]);
  let done = false;
  const waiting = waitForDemoMailboxRemoval(service(list), accounts).then(
    () => {
      done = true;
    },
  );
  await vi.advanceTimersByTimeAsync(499);
  expect(done).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  await waiting;
  expect(list).toHaveBeenCalledTimes(2);
  expect(list).toHaveBeenCalledWith({ actorId: 'owner' });
});
test('reports the public background failure without exposing provider details', async () => {
  await expect(
    waitForDemoMailboxRemoval(
      service(vi.fn().mockResolvedValue([mailbox('old-mailbox', true)])),
      accounts,
    ),
  ).rejects.toThrow('cleanup failed for account old-mailbox');
});
test('times out at the existing deadline with remaining account IDs', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'performance'] });
  const list = vi.fn().mockResolvedValue([mailbox('old-mailbox')]);
  // Assertion is consumed below after advancing the fake clock.
  // eslint-disable-next-line vitest/valid-expect
  const assertion = expect(
    waitForDemoMailboxRemoval(service(list), accounts),
  ).rejects.toThrow(
    'timed out after 180000ms; pending account IDs: old-mailbox',
  );
  await vi.advanceTimersByTimeAsync(180_000);
  await assertion;
  expect(list).toHaveBeenCalledTimes(361);
});
test('does not mistake a status query failure for completed cleanup', async () => {
  await expect(
    waitForDemoMailboxRemoval(
      service(vi.fn().mockRejectedValue(new Error('database unavailable'))),
      accounts,
    ),
  ).rejects.toThrow('database unavailable');
});
test('empty cleanup does not poll', async () => {
  const list = vi.fn();
  await waitForDemoMailboxRemoval(service(list), []);
  expect(list).not.toHaveBeenCalled();
});
