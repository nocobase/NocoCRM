import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';
import type { Knex } from 'knex';

// Takes back what 202610250001_postgres_json_like declared on PostgreSQL:
// LIKE and NOT LIKE between json and text, and the functions behind them.
// The CRM now matches a JSON column's text per database in its own queries
// (server/providers/crm/json-text.ts), so the database carries nothing of
// the CRM's beyond its tables. Every other database is left as it is.
const FUNCTIONS = [
  ['crm_json_like', 'LIKE', '~~'],
  ['crm_json_not_like', 'NOT LIKE', '!~~'],
] as const;

const migration: MigrationDefinition = defineMigration({
  name: '202610260001_postgres_drop_json_like',
  async up({ connection }: MigrationContext): Promise<void> {
    if (connection.dialect !== 'postgres') return;
    const client = await connection.client<Knex>();
    for (const [name, , operator] of FUNCTIONS) {
      await client.raw(`DROP OPERATOR IF EXISTS ${operator} (json, text)`);
      await client.raw(`DROP FUNCTION IF EXISTS ${name}(json, text)`);
    }
  },
  // Declares them again, as 202610250001_postgres_json_like did.
  async down({ connection }: MigrationContext): Promise<void> {
    if (connection.dialect !== 'postgres') return;
    const client = await connection.client<Knex>();
    for (const [name, match, operator] of FUNCTIONS) {
      await client.raw(
        `CREATE OR REPLACE FUNCTION ${name}(json, text) RETURNS boolean
           LANGUAGE sql IMMUTABLE STRICT PARALLEL SAFE
           AS 'SELECT $1::text ${match} $2'`,
      );
      await client.raw(
        `DO $$
         BEGIN
           IF NOT EXISTS (
             SELECT 1 FROM pg_catalog.pg_operator o
             JOIN pg_catalog.pg_namespace n ON n.oid = o.oprnamespace
             WHERE o.oprname = '${operator}'
               AND o.oprleft = 'json'::regtype
               AND o.oprright = 'text'::regtype
               AND n.nspname = current_schema()
           ) THEN
             CREATE OPERATOR ${operator} (
               LEFTARG = json, RIGHTARG = text, FUNCTION = ${name}
             );
           END IF;
         END
         $$`,
      );
    }
  },
});

export default migration;
