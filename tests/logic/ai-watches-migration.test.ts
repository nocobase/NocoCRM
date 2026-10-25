// @vitest-environment node

import { createTestDatabase } from '@nocobase/app-testing/server';
import { expect, it } from 'vitest';
import migration from '../../database/main/migrations/202610160001_crm_ai_watches.js';

// The AI work a conversation waits on
// (database/main/migrations/202610160001_crm_ai_watches.ts): one row per AI
// entry, and dropped again.
it('creates the AI watches table keyed by the entry, and drops it', async () => {
  const test = await createTestDatabase();
  const isolated = test.database;
  try {
    const builder = isolated.builder();
    const query = isolated.query();
    const context = {
      builder,
      query,
      connection: isolated.connection(),
    } as never;
    await migration.up(context);
    expect(await builder.hasCollection('crmAiWatches')).toBe(true);
    const watch = {
      id: 'entry-1',
      entity: 'leads',
      recordId: 'lead-1',
      userId: 'rep',
      conversationId: 'conversation-1',
      createdAt: '2026-10-16T00:00:00.000Z',
    };
    await query.insertInto('crmAiWatches').values(watch).execute();
    // One watch per entry.
    await expect(
      query.insertInto('crmAiWatches').values(watch).execute(),
    ).rejects.toThrow();
    await migration.down(context);
    expect(await builder.hasCollection('crmAiWatches')).toBe(false);
  } finally {
    await test.destroy();
  }
});
