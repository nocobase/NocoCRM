// @vitest-environment node

import { createTestDatabase } from '@nocobase/app-testing/server';
import { expect, it } from 'vitest';
import declare from '../../database/main/migrations/202610250001_postgres_json_like.js';
import drop from '../../database/main/migrations/202610260001_postgres_drop_json_like.js';
import { jsonTextLike } from '../../server/providers/crm/json-text.js';

// A JSON column's text matched with LIKE in the CRM's own queries, per
// database (server/providers/crm/json-text.ts), with no operator of the
// CRM's in the database: 202610260001 takes back what 202610250001 declared
// on PostgreSQL.
it('matches a JSON column by its text on every database, with no operator of its own', async () => {
  const test = await createTestDatabase();
  const isolated = test.database;
  try {
    const builder = isolated.builder();
    const query = isolated.query();
    const connection = isolated.connection();
    const context = { builder, query, connection } as never;
    await builder.createCollection('crmJsonTextProbe', (c) => {
      c.string('id', { length: 36, nullable: false });
      c.primary('id');
      c.json('participants');
    });
    await query
      .insertInto('crmJsonTextProbe')
      .values([
        { id: 'with', participants: ['user-1', 'user-2'] },
        { id: 'without', participants: ['user-3'] },
        { id: 'other', participants: ['user-4'] },
      ])
      .execute();
    const matching = async (patterns: string[]) =>
      (
        await query
          .selectFrom('crmJsonTextProbe')
          .select('id')
          .where(
            await jsonTextLike(
              connection,
              'crmJsonTextProbe',
              'participants',
              patterns,
            ),
          )
          .orderBy('id')
          .execute()
      ).map((row) => row.id);
    const rawLike = () =>
      query
        .selectFrom('crmJsonTextProbe')
        .select('id')
        .where('participants', 'like', '%"user-2"%')
        .execute();

    // As an installation that ran 202610250001 has it.
    await declare.up(context);
    await drop.up(context);
    expect(await matching(['%"user-2"%'])).toEqual(['with']);
    expect(await matching(['%"user-2"%', '%"user-4"%'])).toEqual([
      'other',
      'with',
    ]);
    expect(await matching(['%"nobody"%'])).toEqual([]);
    if (test.dialect === 'postgres')
      await expect(rawLike()).rejects.toThrow(/operator does not exist/);
    else expect((await rawLike()).map((row) => row.id)).toEqual(['with']);

    // Taken back, PostgreSQL has the operator again.
    await drop.down?.(context);
    expect((await rawLike()).map((row) => row.id)).toEqual(['with']);
    await drop.up(context);
  } finally {
    await test.destroy();
  }
});
