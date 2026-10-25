// @vitest-environment node

import { createTestDatabase } from '@nocobase/app-testing/server';
import type { DatabaseConnection } from '@nocobase/db';
import { expect, it } from 'vitest';
import migration from '../../database/main/migrations/202610100001_crm_companies.js';

const now = '2026-10-01T00:00:00.000Z';

// A table's columns in order, through the connection's schema inspector so
// every dialect reports them alike.
async function columns(
  connection: DatabaseConnection,
  table: string,
): Promise<string[]> {
  const physical = await connection.schemaInspector.getPhysicalCollection({
    tableName: table,
  });
  return (physical?.columns ?? []).map((column) => column.columnName);
}

it('renames accounts to companies and back, keeping the data and mail entries’ mailbox', async () => {
  const test = await createTestDatabase();
  const isolated = test.database;
  try {
    const builder = isolated.builder();
    const connection = isolated.connection();
    const query = isolated.query();
    const context = { builder, query, connection } as never;
    // The tables as the CRM's migrations left them, with only the columns
    // this migration reads.
    await builder.createCollection('crmAccounts', (c) => {
      c.string('id', { length: 36, nullable: false });
      c.primary('id');
      c.string('name', { nullable: false });
      c.index('name');
      c.string('ownerId', { length: 64, nullable: false });
      c.index('ownerId');
      c.string('createdById', { length: 64, nullable: false });
      c.datetimeTz('createdAt', { nullable: false });
      c.datetimeTz('updatedAt', { nullable: false });
      c.string('status', { nullable: false });
      c.string('source', { nullable: false });
      c.string('website');
      c.string('industry');
      c.string('country');
      c.string('state');
      c.string('city');
      c.string('address');
      c.text('description');
      c.string('type');
      c.string('employees');
      c.json('attachments');
      c.string('churnReason');
    });
    for (const table of ['crmContacts', 'crmOpportunities'])
      await builder.createCollection(table, (c) => {
        c.string('id', { length: 36, nullable: false });
        c.primary('id');
        c.string('accountId', { length: 36, nullable: false });
        c.index('accountId');
      });
    await builder.createCollection('crmTasks', (c) => {
      c.string('id', { length: 36, nullable: false });
      c.primary('id');
      c.string('accountId', { length: 36 });
      c.index('accountId');
    });
    await builder.createCollection('crmLeads', (c) => {
      c.string('id', { length: 36, nullable: false });
      c.primary('id');
      c.string('convertedAccountId', { length: 36 });
    });
    await builder.createCollection('crmHistory', (c) => {
      c.string('id', { length: 36, nullable: false });
      c.primary('id');
      c.string('entity', { nullable: false });
      c.string('action', { nullable: false });
      c.json('changes');
      c.json('previous');
    });
    await builder.createCollection('crmOutbox', (c) => {
      c.string('id', { length: 36, nullable: false });
      c.primary('id');
      c.string('entity', { nullable: false });
    });
    await builder.createCollection('crmSettings', (c) => {
      c.string('id', { nullable: false });
      c.primary('id');
      c.json('value');
      c.datetimeTz('updatedAt');
    });

    await query
      .insertInto('crmAccounts')
      .values({
        id: 'a1',
        name: 'Acme',
        ownerId: 'u1',
        createdById: 'u1',
        createdAt: now,
        updatedAt: now,
        status: 'customer',
        source: 'website',
        website: 'https://acme.example',
      })
      .execute();
    await query
      .insertInto('crmContacts')
      .values({ id: 'c1', accountId: 'a1' })
      .execute();
    await query
      .insertInto('crmOpportunities')
      .values({ id: 'o1', accountId: 'a1' })
      .execute();
    await query
      .insertInto('crmTasks')
      .values([
        { id: 't1', accountId: 'a1' },
        { id: 't2', accountId: null },
      ])
      .execute();
    await query
      .insertInto('crmLeads')
      .values({ id: 'l1', convertedAccountId: 'a1' })
      .execute();
    await query
      .insertInto('crmHistory')
      .values([
        {
          id: 'h1',
          entity: 'accounts',
          action: 'update',
          changes: JSON.stringify({ name: 'Acme' }),
        },
        {
          id: 'h2',
          entity: 'opportunities',
          action: 'update',
          changes: JSON.stringify({ accountId: 'a2' }),
          previous: JSON.stringify({ accountId: 'a1' }),
        },
        {
          id: 'h3',
          entity: 'leads',
          action: 'convert',
          changes: JSON.stringify({ convertedAccountId: 'a1' }),
        },
        // A mail entry's accountId is its mailbox.
        {
          id: 'h4',
          entity: 'accounts',
          action: 'mail',
          changes: JSON.stringify({ accountId: 'mailbox-1' }),
        },
      ])
      .execute();
    await query
      .insertInto('crmOutbox')
      .values({ id: 'n1', entity: 'accounts' })
      .execute();
    await query
      .insertInto('crmSettings')
      .values({
        id: 'demo-dataset-v1',
        value: JSON.stringify({
          version: 7,
          records: [
            { entity: 'accounts', id: 'a1', name: 'Acme' },
            { entity: 'leads', id: 'l1', name: 'Lee' },
          ],
        }),
        updatedAt: now,
      })
      .execute();

    const history = async (): Promise<Record<string, unknown>[]> =>
      (
        await query
          .selectFrom('crmHistory')
          .select(['id', 'entity', 'changes', 'previous'])
          .orderBy('id')
          .execute()
      ).map((row) => ({
        id: row.id,
        entity: row.entity,
        changes: parse(row.changes),
        previous: parse(row.previous),
      }));
    const manifest = async (): Promise<unknown> =>
      parse(
        (
          await query
            .selectFrom('crmSettings')
            .select('value')
            .where('id', '=', 'demo-dataset-v1')
            .executeTakeFirst()
        )?.value,
      );

    await migration.up(context);
    expect(await builder.hasCollection('crmAccounts')).toBe(false);
    expect(
      await query.selectFrom('crmCompanies').select(['id', 'name']).execute(),
    ).toEqual([{ id: 'a1', name: 'Acme' }]);
    expect(await columns(isolated.connection(), 'crm_contacts')).toEqual([
      'id',
      'company_id',
    ]);
    expect(
      await query
        .selectFrom('crmTasks')
        .select(['id', 'companyId'])
        .orderBy('id')
        .execute(),
    ).toEqual([
      { id: 't1', companyId: 'a1' },
      { id: 't2', companyId: null },
    ]);
    expect(
      await query
        .selectFrom('crmLeads')
        .select(['convertedCompanyId'])
        .execute(),
    ).toEqual([{ convertedCompanyId: 'a1' }]);
    // Still required where it was.
    await expect(
      query
        .insertInto('crmOpportunities')
        .values({ id: 'o2', companyId: null })
        .execute(),
    ).rejects.toThrow();
    expect(await history()).toEqual([
      {
        id: 'h1',
        entity: 'companies',
        changes: { name: 'Acme' },
        previous: null,
      },
      {
        id: 'h2',
        entity: 'opportunities',
        changes: { companyId: 'a2' },
        previous: { companyId: 'a1' },
      },
      {
        id: 'h3',
        entity: 'leads',
        changes: { convertedCompanyId: 'a1' },
        previous: null,
      },
      {
        id: 'h4',
        entity: 'companies',
        changes: { accountId: 'mailbox-1' },
        previous: null,
      },
    ]);
    expect(
      await query.selectFrom('crmOutbox').select('entity').execute(),
    ).toEqual([{ entity: 'companies' }]);
    expect(await manifest()).toMatchObject({
      records: [{ entity: 'companies' }, { entity: 'leads' }],
    });

    await migration.down?.(context);
    expect(await builder.hasCollection('crmCompanies')).toBe(false);
    expect(
      await query.selectFrom('crmAccounts').select(['id', 'name']).execute(),
    ).toEqual([{ id: 'a1', name: 'Acme' }]);
    expect(await columns(isolated.connection(), 'crm_contacts')).toEqual([
      'id',
      'account_id',
    ]);
    expect(
      await query
        .selectFrom('crmOpportunities')
        .select(['accountId'])
        .execute(),
    ).toEqual([{ accountId: 'a1' }]);
    expect((await history()).map((row) => [row.entity, row.changes])).toEqual([
      ['accounts', { name: 'Acme' }],
      ['opportunities', { accountId: 'a2' }],
      ['leads', { convertedAccountId: 'a1' }],
      ['accounts', { accountId: 'mailbox-1' }],
    ]);
    expect(await manifest()).toMatchObject({
      records: [{ entity: 'accounts' }, { entity: 'leads' }],
    });
  } finally {
    await test.destroy();
  }
});

// JSON text, which reads back as text or already parsed.
function parse(value: unknown): unknown {
  let current = value;
  for (let i = 0; i < 2 && typeof current === 'string'; i++)
    current = JSON.parse(current) as unknown;
  return current ?? null;
}
