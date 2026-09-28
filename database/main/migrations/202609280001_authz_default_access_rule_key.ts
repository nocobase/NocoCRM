import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';
import type { Knex } from 'knex';

// The default access plugin (@nocobase/app-plugin-authz-default-access,
// 0.1.0-beta.5) rewrote its executed migration
// 202608210002_create_default_access_rules instead of adding one: its rules
// now carry a unique `key`, and the one-rule-per-resource index was renamed.
// A database created before that has neither, and every authorization check
// then fails reading the rules table ("no such column: key"), which denies
// every non-root user everything. This brings such a table to the shape the
// plugin now creates: a rule that exists keeps its id as its key. A table
// created by the rewritten migration already has the column and is left
// alone, as is an absent table. The plugin's own migration then reports a
// checksum mismatch, which is a warning; this migration is what accounts for
// it.
const collection = 'authorizationDefaultAccessRules';
const table = 'authorization_default_access_rules';

const migration: MigrationDefinition = defineMigration({
  name: '202609280001_authz_default_access_rule_key',
  async up({ builder, connection }: MigrationContext): Promise<void> {
    if (!(await builder.hasCollection(collection))) return;
    const client = await connection.client<Knex>();
    if (await client.schema.hasColumn(table, 'key')) return;
    await builder.alterCollection(collection, (c) => {
      c.string('key', { length: 255, nullable: true });
    });
    // Through the raw client: the rows are read and written by physical
    // column, and the new column is not yet part of any Collection shape the
    // query adapter would be asked to trust.
    await client(table).update({ key: client.ref('id') });
    await builder.alterCollection(collection, (c) => {
      c.alterField('key', { type: 'string', length: 255, nullable: false });
      c.unique('key', { name: 'uq_authorization_default_access_rules_key' });
      c.dropIndex('uq_authorization_default_access_resource');
      c.unique(['resourceType', 'resourceId'], {
        name: 'uq_authorization_default_access_rules_resource',
      });
    });
  },
  async down({ builder, connection }: MigrationContext): Promise<void> {
    if (!(await builder.hasCollection(collection))) return;
    const client = await connection.client<Knex>();
    if (!(await client.schema.hasColumn(table, 'key'))) return;
    // The indexes first, on their own: dropping the column rebuilds the
    // table on SQLite, which takes the index on it along.
    await builder.alterCollection(collection, (c) => {
      c.dropIndex('uq_authorization_default_access_rules_resource');
      c.unique(['resourceType', 'resourceId'], {
        name: 'uq_authorization_default_access_resource',
      });
      c.dropIndex('uq_authorization_default_access_rules_key');
    });
    await builder.alterCollection(collection, (c) => {
      c.dropField('key');
    });
  },
});

export default migration;
