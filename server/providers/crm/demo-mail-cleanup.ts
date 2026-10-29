import type { MailService } from '@nocobase/app-plugin-mail/server';

/** Mail owns deletion and retries; absence, not `removing`, releases the address. */
export async function waitForDemoMailboxRemoval(
  mail: Pick<MailService, 'listAccounts'>,
  accounts: readonly { id: string; userId: string }[],
): Promise<void> {
  const pending = new Map<string, Set<string>>();
  for (const account of accounts) {
    const ids = pending.get(account.userId) ?? new Set<string>();
    ids.add(account.id);
    pending.set(account.userId, ids);
  }
  const start = performance.now();
  while (pending.size) {
    for (const [userId, ids] of pending) {
      const current = (await mail.listAccounts({ actorId: userId })).filter(
        (account) => ids.has(account.id),
      );
      const failed = current.find((account) => account.removalFailed);
      if (failed)
        throw new Error(
          `Demo mailbox cleanup failed for account ${failed.id}. Mail reported removalFailed; inspect Mail worker logs and retry reset after cleanup recovers.`,
        );
      const remaining = new Set(current.map((account) => account.id));
      if (remaining.size) pending.set(userId, remaining);
      else pending.delete(userId);
    }
    if (!pending.size) return;
    if (performance.now() - start >= 180_000)
      throw new Error(
        `Demo mailbox cleanup timed out after 180000ms; pending account IDs: ${[...pending.values()].flatMap((ids) => [...ids]).join(', ')}. Check Mail background workers before retrying reset.`,
      );
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}
