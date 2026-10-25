// @vitest-environment node

import { createTestDatabase } from '@nocobase/app-testing/server';
import { expect, it } from 'vitest';
import migration from '../../database/main/migrations/202610140002_crm_company_signals.js';
import checksMigration from '../../database/main/migrations/202610150001_crm_signal_checks.js';
import checkIdsMigration from '../../database/main/migrations/202610150002_crm_signal_check_ids.js';

// The company signals' table, and the companies' watch switch and last check
// (database/main/migrations/202610140002_crm_company_signals.ts): created
// beside the companies, one event kept once per company, and dropped again.
it("creates the signals table and the companies' signal columns, and drops them", async () => {
  const test = await createTestDatabase();
  const isolated = test.database;
  try {
    const builder = isolated.builder();
    // The companies as they stood before.
    await builder.createCollection('crmCompanies', (c) => {
      c.string('id', { length: 36 });
      c.primary('id');
      c.string('name');
    });
    const query = isolated.query();
    await query
      .insertInto('crmCompanies')
      .values({ id: 'c1', name: 'Acme' })
      .execute();
    const context = {
      builder,
      query,
      connection: isolated.connection(),
    } as never;
    await migration.up(context);
    expect(await builder.hasCollection('crmSignals')).toBe(true);
    // An existing company is not watched and never checked.
    expect(
      await query
        .selectFrom('crmCompanies')
        .select(['signalsWatched', 'signalsCheckedAt'])
        .where('id', '=', 'c1')
        .executeTakeFirstOrThrow(),
    ).toMatchObject({ signalsCheckedAt: null });
    const signal = {
      id: 's1',
      companyId: 'c1',
      type: 'funding',
      title: 'Acme raised a Series B.',
      occurredOn: '2026-10-02',
      sources: JSON.stringify([]),
      eventKey: 'funding:2026-10:acmeraisedaseriesb',
      status: 'new',
      createdAt: '2026-10-03T00:00:00.000Z',
      updatedAt: '2026-10-03T00:00:00.000Z',
    };
    await query.insertInto('crmSignals').values(signal).execute();
    // The same event of the same company is kept once.
    await expect(
      query
        .insertInto('crmSignals')
        .values({ ...signal, id: 's2' })
        .execute(),
    ).rejects.toThrow();

    await migration.down(context);
    expect(await builder.hasCollection('crmSignals')).toBe(false);
    expect(
      Object.keys(
        (await query
          .selectFrom('crmCompanies')
          .selectAll()
          .executeTakeFirstOrThrow()) as Record<string, unknown>,
      ).sort(),
    ).toEqual(['id', 'name']);
  } finally {
    await test.destroy();
  }
});

// The checks' log, and the check each signal names
// (202610150001_crm_signal_checks, 202610150002_crm_signal_check_ids).
it('adds the signal checks and the check a signal names, and removes them', async () => {
  const test = await createTestDatabase();
  const isolated = test.database;
  try {
    const builder = isolated.builder();
    await builder.createCollection('crmCompanies', (c) => {
      c.string('id', { length: 36 });
      c.primary('id');
      c.string('name');
    });
    const query = isolated.query();
    const context = {
      builder,
      query,
      connection: isolated.connection(),
    } as never;
    await migration.up(context);
    await checksMigration.up(context);
    await checkIdsMigration.up(context);
    await query
      .insertInto('crmSignalChecks')
      .values({
        id: 'k1',
        companyId: 'c1',
        trigger: 'daily',
        actorId: null,
        status: 'found',
        found: 1,
        followUps: 1,
        error: null,
        createdAt: '2026-10-15T01:30:00.000Z',
      })
      .execute();
    await query
      .insertInto('crmSignals')
      .values({
        id: 's1',
        companyId: 'c1',
        type: 'funding',
        title: 'Acme raised a Series B.',
        occurredOn: '2026-10-02',
        sources: JSON.stringify([]),
        eventKey: 'funding:2026-10:acme',
        status: 'new',
        checkId: 'k1',
        createdAt: '2026-10-15T01:30:00.000Z',
        updatedAt: '2026-10-15T01:30:00.000Z',
      })
      .execute();
    expect(
      await query
        .selectFrom('crmSignals')
        .select('checkId')
        .executeTakeFirstOrThrow(),
    ).toEqual({ checkId: 'k1' });

    await checkIdsMigration.down(context);
    expect(
      Object.keys(
        (await query
          .selectFrom('crmSignals')
          .selectAll()
          .executeTakeFirstOrThrow()) as Record<string, unknown>,
      ),
    ).not.toContain('checkId');
    await checksMigration.down(context);
    expect(await builder.hasCollection('crmSignalChecks')).toBe(false);
    expect(await builder.hasCollection('crmSignals')).toBe(true);
  } finally {
    await test.destroy();
  }
});
