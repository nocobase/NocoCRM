import type { MailService } from '@nocobase/app-plugin-mail/server';

export interface DemoMailboxAccount {
  id: string;
  userId: string;
  status?: string;
}

export interface DemoMailboxRemovalOptions {
  timeoutMs?: number;
  intervalMs?: number;
}

const REMOVAL_TIMEOUT_MS = 180_000;
const REMOVAL_INTERVAL_MS = 500;

/** Submits each demo mailbox to Mail's removal queue, then waits for it to go. */
export async function removeDemoMailboxes(
  mail: Pick<MailService, 'removeAccount' | 'listAccounts'>,
  accounts: readonly DemoMailboxAccount[],
  options: DemoMailboxRemovalOptions = {},
): Promise<void> {
  for (const account of accounts) {
    // Already queued, by an earlier attempt or another reset: Mail is removing it.
    if (account.status === 'removing') continue;
    try {
      await mail.removeAccount({ actorId: account.userId }, account.id);
    } catch (error) {
      // Mail finished removing it between the snapshot and this call.
      if (!isMailAccountNotFound(error)) throw error;
    }
  }
  await waitForDemoMailboxRemoval(mail, accounts, options);
}

/**
 * Mail owns deletion and retries; absence, not `removing`, releases the address.
 * `removalFailed` only says the last attempt failed: Mail retries it, so it is
 * reported on timeout rather than ending the wait.
 */
export async function waitForDemoMailboxRemoval(
  mail: Pick<MailService, 'listAccounts'>,
  accounts: readonly DemoMailboxAccount[],
  {
    timeoutMs = REMOVAL_TIMEOUT_MS,
    intervalMs = REMOVAL_INTERVAL_MS,
  }: DemoMailboxRemovalOptions = {},
): Promise<void> {
  const pending = new Map<string, Set<string>>();
  for (const account of accounts) {
    const ids = pending.get(account.userId) ?? new Set<string>();
    ids.add(account.id);
    pending.set(account.userId, ids);
  }
  const failing = new Set<string>();
  const start = performance.now();
  while (pending.size) {
    for (const [userId, ids] of pending) {
      const current = (await mail.listAccounts({ actorId: userId })).filter(
        (account) => ids.has(account.id),
      );
      for (const account of current)
        if (account.removalFailed) failing.add(account.id);
        else failing.delete(account.id);
      const remaining = new Set(current.map((account) => account.id));
      if (remaining.size) pending.set(userId, remaining);
      else pending.delete(userId);
    }
    if (!pending.size) return;
    if (performance.now() - start >= timeoutMs) {
      const ids = [...pending.values()].flatMap((set) => [...set]);
      const failed = ids.filter((id) => failing.has(id));
      throw new Error(
        `Demo mailbox cleanup timed out after ${timeoutMs}ms; pending account IDs: ${ids.join(', ')}` +
          (failed.length
            ? `; Mail reported removalFailed for: ${failed.join(', ')}`
            : '') +
          '. Check Mail background workers and logs before retrying reset.',
      );
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

function isMailAccountNotFound(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error as { reason?: unknown }).reason === 'MAIL_ACCOUNT_NOT_FOUND'
  );
}
