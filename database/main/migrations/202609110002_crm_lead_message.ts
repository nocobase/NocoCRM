import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// "originalInfo" becomes "message": the enquiry as the lead sent it. Renamed
// by adding the new column, copying, then dropping the old one, since the
// builder has no rename. Change history stores submitted field names inside
// its JSON, so the key is rewritten there too or old entries would show a
// label-less raw key.
type Column = 'originalInfo' | 'message';

async function copyColumn(
  query: MigrationContext['query'],
  from: Column,
  to: Column,
): Promise<void> {
  const rows = await query
    .selectFrom('crmLeads')
    .select(['id', from])
    .execute();
  for (const row of rows) {
    if (row[from] == null || row[from] === '') continue;
    await query
      .updateTable('crmLeads')
      .set({ [to]: row[from] })
      .where('id', '=', row.id)
      .execute();
  }
}

async function renameHistoryKey(
  query: MigrationContext['query'],
  from: Column,
  to: Column,
): Promise<void> {
  // Matched here rather than with LIKE, which PostgreSQL has no form of for
  // a JSON column; a driver may also hand the JSON back parsed.
  const rows = await query
    .selectFrom('crmHistory')
    .select(['id', 'changes'])
    .where('entity', '=', 'leads')
    .execute();
  for (const row of rows) {
    const text =
      typeof row.changes === 'string'
        ? row.changes
        : JSON.stringify(row.changes ?? null);
    if (!text.includes(`"${from}"`)) continue;
    const renamed = text.split(`"${from}"`).join(`"${to}"`);
    await query
      .updateTable('crmHistory')
      .set({
        changes:
          typeof row.changes === 'string'
            ? renamed
            : (JSON.parse(renamed) as unknown),
      })
      .where('id', '=', row.id)
      .execute();
  }
}

const migration: MigrationDefinition = defineMigration({
  name: '202609110002_crm_lead_message',
  async up({ builder, query }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmLeads', (collection) => {
      collection.text('message').nullable();
    });
    await copyColumn(query, 'originalInfo', 'message');
    await builder.alterCollection('crmLeads', (collection) => {
      collection.dropField('originalInfo');
    });
    await renameHistoryKey(query, 'originalInfo', 'message');
  },
  async down({ builder, query }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmLeads', (collection) => {
      collection.text('originalInfo').nullable();
    });
    await copyColumn(query, 'message', 'originalInfo');
    await builder.alterCollection('crmLeads', (collection) => {
      collection.dropField('message');
    });
    await renameHistoryKey(query, 'message', 'originalInfo');
  },
});

export default migration;
