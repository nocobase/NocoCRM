import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';
import type { Knex } from 'knex';

// Rows written through the raw query builder with a JavaScript Date landed in
// SQLite as the epoch number ("1789711828587.0") rather than the ISO instant
// the column declares. The query adapter tolerates that on read, but the
// repository layer refuses it, and the scheduler plugin (0.1.0-beta.2) now
// reads its sync-lock row through the repository at startup, so a database
// first started under an older plugin cannot start at all. The CRM's own
// settings rows from its first provisioning carry the same format. Rewrite
// those values as ISO instants through the raw client, since the query
// adapter would already present them converted; a value that is an instant
// is left alone, and a table that is absent is skipped.
const legacy = /^\d+(?:\.0+)?$/u;
const targets: {
  collection: string;
  table: string;
  key: string;
  columns: string[];
}[] = [
  {
    collection: 'scheduleSyncLocks',
    table: 'schedule_sync_locks',
    key: 'app_name',
    columns: ['created_at', 'updated_at'],
  },
  {
    collection: 'crmSettings',
    table: 'crm_settings',
    key: 'id',
    columns: ['updated_at'],
  },
];

const migration: MigrationDefinition = defineMigration({
  name: '202609200001_legacy_epoch_timestamps',
  async up({ builder, connection }: MigrationContext): Promise<void> {
    const client = await connection.client<Knex>();
    for (const { collection, table, key, columns } of targets) {
      if (!(await builder.hasCollection(collection))) continue;
      const rows: Record<string, unknown>[] = await client(table).select([
        key,
        ...columns,
      ]);
      for (const row of rows) {
        const changes: Record<string, string> = {};
        for (const column of columns) {
          const value = row[column];
          const text =
            typeof value === 'number'
              ? String(value)
              : typeof value === 'string'
                ? value
                : '';
          if (legacy.test(text))
            changes[column] = new Date(Number(text)).toISOString();
        }
        if (Object.keys(changes).length)
          await client(table)
            .where(key, '=', row[key] as string)
            .update(changes);
      }
    }
  },
  async down(): Promise<void> {
    // An ISO instant is valid for the columns before this migration too;
    // the legacy numbers were never a format anything relied on.
  },
});

export default migration;
