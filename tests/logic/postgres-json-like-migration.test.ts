// @vitest-environment node

import { createTestDatabase } from '@nocobase/app-testing/server';
import { expect, it } from 'vitest';
import migration from '../../database/main/migrations/202610250001_postgres_json_like.js';

// LIKE on a JSON column (database/main/migrations/202610250001_postgres_json_like.ts):
// SQLite and MySQL match its text already; on PostgreSQL the migration
// declares the same match, and taking it back leaves PostgreSQL without one.
it('matches a JSON column with LIKE on every database, and takes the PostgreSQL match back', async () => {
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
    await builder.createCollection('crmJsonLikeProbe', (c) => {
      c.string('id', { length: 36, nullable: false });
      c.primary('id');
      c.json('participants');
    });
    await query
      .insertInto('crmJsonLikeProbe')
      .values([
        { id: 'with', participants: ['user-1', 'user-2'] },
        { id: 'without', participants: ['user-3'] },
      ])
      .execute();
    const matching = async (operator: 'like' | 'not like') =>
      (
        await query
          .selectFrom('crmJsonLikeProbe')
          .select('id')
          .where('participants', operator, '%"user-2"%')
          .execute()
      ).map((row) => row.id);

    await migration.up(context);
    expect(await matching('like')).toEqual(['with']);
    expect(await matching('not like')).toEqual(['without']);
    // Run again, as a schema reset that keeps functions leaves it to.
    await migration.up(context);
    expect(await matching('like')).toEqual(['with']);

    await migration.down?.(context);
    if (test.dialect === 'postgres')
      await expect(matching('like')).rejects.toThrow(/operator does not exist/);
    else expect(await matching('like')).toEqual(['with']);
  } finally {
    await test.destroy();
  }
});
