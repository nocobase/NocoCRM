// @vitest-environment node

import sqlite from '@nocobase/db-sqlite';
import { createDatabaseManager, defineDatabase } from '@nocobase/db';
import type { Knex } from 'knex';
import { expect, it } from 'vitest';
import migration from '../../database/main/migrations/202609280001_authz_default_access_rule_key.js';

const collection = 'authorizationDefaultAccessRules';
const table = 'authorization_default_access_rules';

async function indexes(client: Knex): Promise<string[]> {
  const rows: { name: string }[] = await client.raw(
    `pragma index_list(${table})`,
  );
  // Leaves out the primary key's automatic index.
  return rows
    .map((row) => row.name)
    .filter((name) => !name.startsWith('sqlite_'))
    .sort();
}

it('adds the default access rule key a rewritten plugin migration expects', async () => {
  const isolated = createDatabaseManager(
    defineDatabase({
      drivers: { sqlite },
      default: 'main',
      connections: {
        main: {
          dialect: 'sqlite',
          filename: ':memory:',
          schemaManagement: 'managed',
        },
      },
    }),
  );
  try {
    await isolated.connect();
    const builder = isolated.builder();
    const connection = isolated.connection();
    const context = { builder, query: isolated.query(), connection } as never;
    // Absent table (the plugin not installed): nothing to do.
    await migration.up(context);
    expect(await builder.hasCollection(collection)).toBe(false);
    // The table as the plugin's first release of the migration created it.
    await builder.createCollection(collection, (c) => {
      c.string('id', { length: 64 }).notNull();
      c.string('resourceType', { length: 255 }).notNull();
      c.string('resourceId', { length: 255 }).notNull();
      c.json('actions').notNull();
      c.datetime('createdAt').notNull();
      c.datetime('updatedAt').notNull();
      c.primary('id', { name: 'pk_authorization_default_access_rules' });
      c.unique(['resourceType', 'resourceId'], {
        name: 'uq_authorization_default_access_resource',
      });
    });
    const client = await connection.client<Knex>();
    await client(table).insert({
      id: 'rule-1',
      resource_type: 'composite',
      resource_id: 'crm.leads',
      actions: '[]',
      created_at: '2026-09-01T00:00:00.000Z',
      updated_at: '2026-09-01T00:00:00.000Z',
    });

    await migration.up(context);
    expect(await client.schema.hasColumn(table, 'key')).toBe(true);
    expect(await client(table).select('id', 'key')).toEqual([
      { id: 'rule-1', key: 'rule-1' },
    ]);
    expect(await indexes(client)).toEqual([
      'uq_authorization_default_access_rules_key',
      'uq_authorization_default_access_rules_resource',
    ]);
    // A key is required and unique now, as the plugin's store writes it.
    await expect(
      client(table).insert({
        id: 'rule-2',
        resource_type: 'composite',
        resource_id: 'crm.accounts',
        actions: '[]',
        created_at: '2026-09-01T00:00:00.000Z',
        updated_at: '2026-09-01T00:00:00.000Z',
      }),
    ).rejects.toThrow();
    // A table that already has the key is left alone.
    await migration.up(context);
    expect(await indexes(client)).toHaveLength(2);

    await migration.down?.(context);
    expect(await client.schema.hasColumn(table, 'key')).toBe(false);
    expect(await indexes(client)).toEqual([
      'uq_authorization_default_access_resource',
    ]);
    expect(await client(table).select('id')).toEqual([{ id: 'rule-1' }]);
  } finally {
    await isolated.destroy();
  }
});
