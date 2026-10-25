import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// What a person writes into a record's timeline is a comment (评论), no
// longer a note: its history entries, their edits and removals change
// action, and the keys that named one change with them (an edit's
// `noteId`, a merge's count of the `notes` that came over).
const ACTIONS = [
  ['note', 'comment'],
  ['noteEdited', 'commentEdited'],
  ['noteDeleted', 'commentDeleted'],
] as const;
// The action whose changes carry the key, and the key before and after.
const KEYS = [
  ['commentEdited', 'noteId', 'commentId'],
  ['merged', 'notes', 'comments'],
] as const;

// JSON text, which reads back as text or, through some adapters, already
// parsed.
function parse(value: unknown): unknown {
  let current = value;
  for (let i = 0; i < 2 && typeof current === 'string'; i++) {
    try {
      current = JSON.parse(current) as unknown;
    } catch {
      return current;
    }
  }
  return current;
}

async function rename(
  { query }: MigrationContext,
  forward: boolean,
): Promise<void> {
  const actions = forward
    ? ACTIONS
    : ACTIONS.map(([from, to]) => [to, from] as const);
  for (const [from, to] of actions)
    await query
      .updateTable('crmHistory')
      .set({ action: to })
      .where('action', '=', from)
      .execute();
  for (const [action, oldKey, newKey] of KEYS) {
    const [from, to] = forward ? [oldKey, newKey] : [newKey, oldKey];
    // The edit entries are named by their action as it now stands.
    const named = forward
      ? action
      : action === 'commentEdited'
        ? 'noteEdited'
        : action;
    // No LIKE on the JSON column, which PostgreSQL has no form of: the key
    // is looked for in the parsed changes below.
    for (const row of await query
      .selectFrom('crmHistory')
      .select(['id', 'changes'])
      .where('action', '=', named)
      .execute()) {
      const changes = parse(row.changes);
      if (typeof changes !== 'object' || changes === null) continue;
      const record = changes as Record<string, unknown>;
      if (!(from in record)) continue;
      const { [from]: value, ...rest } = record;
      await query
        .updateTable('crmHistory')
        .set({ changes: JSON.stringify({ ...rest, [to]: value }) })
        .where('id', '=', row.id)
        .execute();
    }
  }
}

const migration: MigrationDefinition = defineMigration({
  name: '202610100003_crm_comments',
  async up(context: MigrationContext): Promise<void> {
    await rename(context, true);
  },
  async down(context: MigrationContext): Promise<void> {
    await rename(context, false);
  },
});

export default migration;
