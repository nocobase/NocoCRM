import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';
import type { Knex } from 'knex';

// The CRM matches JSON columns with LIKE: a task's participants, a comment's
// attachments, a deal's contacts, and the Agents plugin's conversation
// metadata. SQLite and MySQL compare a JSON column's text there; PostgreSQL
// has no LIKE for json at all ("operator does not exist: json ~~ unknown"),
// and the query adapter offers no cast. So on PostgreSQL this declares LIKE
// and NOT LIKE between json and text as the same match on the JSON's text,
// and every other database is left as it is. The functions are plain SQL and
// immutable, so the planner inlines them into `json::text LIKE pattern`.
//
// Created in the connection's current schema, where the tables are. A schema
// reset drops tables but keeps functions and operators, so `up` replaces the
// functions and creates each operator only when it is not there yet.
const FUNCTIONS = [
  ['crm_json_like', 'LIKE', '~~'],
  ['crm_json_not_like', 'NOT LIKE', '!~~'],
] as const;

const migration: MigrationDefinition = defineMigration({
  name: '202610250001_postgres_json_like',
  async up({ connection }: MigrationContext): Promise<void> {
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
  async down({ connection }: MigrationContext): Promise<void> {
    if (connection.dialect !== 'postgres') return;
    const client = await connection.client<Knex>();
    for (const [name, , operator] of FUNCTIONS) {
      await client.raw(`DROP OPERATOR IF EXISTS ${operator} (json, text)`);
      await client.raw(`DROP FUNCTION IF EXISTS ${name}(json, text)`);
    }
  },
});

export default migration;
