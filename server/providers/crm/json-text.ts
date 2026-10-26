import type {
  DatabaseConnection,
  Expression,
  ExpressionBuilder,
  SqlBool,
} from '@nocobase/db';
import type { Knex } from 'knex';

// The CRM matches a JSON column's text with LIKE (a task's participants, a
// comment's `changes`, a deal's contacts, a notice's target): its JSON values
// are JSON text inside the JSON column (`encodeRow`), which JSON operators do
// not see into. SQLite and MySQL compare a JSON column's text with LIKE as it
// is. PostgreSQL has no LIKE for `json` and the query adapter no cast, so
// there the matching rows' ids are read first through the connection's client
// with the column cast to text, and the query keeps those ids. That read runs
// on the connection given, outside any transaction the caller holds.

// The physical name of a logical one: the connection names tables and columns
// underscored (`crmTasks` → `crm_tasks`, `internalParticipants` →
// `internal_participants`).
const physical = (name: string): string =>
  name.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

// Rows of `table` whose `column`, read as text, matches any of `patterns`,
// as a condition for a query on that table. `id` is the table's key.
export async function jsonTextLike(
  connection: DatabaseConnection,
  table: string,
  column: string,
  patterns: readonly string[],
): Promise<(eb: ExpressionBuilder) => Expression<SqlBool>> {
  if (connection.dialect !== 'postgres')
    return (eb) =>
      eb.or(patterns.map((pattern) => eb(column, 'like', pattern)));
  const client = await connection.client<Knex>();
  const rows = await client<{ id: unknown }>(physical(table))
    .select('id')
    .where((where) => {
      for (const pattern of patterns)
        where.orWhereRaw('??::text like ?', [physical(column), pattern]);
    });
  const ids = rows.map((row) => String(row.id));
  return (eb) => (ids.length ? eb('id', 'in', ids) : eb('id', '=', ''));
}
