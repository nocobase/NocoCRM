import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// A contact's "active" flag has meant "still employed at the account" since
// the label became 在职; the column now says so. Renamed by adding the new
// column, copying, then dropping the old one, since the builder has no rename.
// Change history stores field names inside its JSON, so the key is rewritten
// there too or old entries would show a label-less raw key.
type Column = 'active' | 'employed';

async function copyColumn(
  query: MigrationContext['query'],
  from: Column,
  to: Column,
): Promise<void> {
  const rows = await query
    .selectFrom('crmContacts')
    .select(['id', from])
    .execute();
  for (const row of rows)
    await query
      .updateTable('crmContacts')
      .set({ [to]: row[from] === null ? true : Boolean(row[from]) })
      .where('id', '=', row.id)
      .execute();
}

async function renameHistoryKey(
  query: MigrationContext['query'],
  from: Column,
  to: Column,
): Promise<void> {
  const rows = await query
    .selectFrom('crmHistory')
    .select(['id', 'changes'])
    .where('entity', '=', 'contacts')
    .where('changes', 'like', `%"${from}"%`)
    .execute();
  for (const row of rows)
    await query
      .updateTable('crmHistory')
      .set({ changes: String(row.changes).split(`"${from}"`).join(`"${to}"`) })
      .where('id', '=', row.id)
      .execute();
}

const migration: MigrationDefinition = defineMigration({
  name: '202609130004_crm_contact_employed',
  async up({ builder, query }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmContacts', (collection) => {
      collection.boolean('employed', { defaultValue: true });
    });
    await copyColumn(query, 'active', 'employed');
    await builder.alterCollection('crmContacts', (collection) => {
      collection.dropField('active');
    });
    await renameHistoryKey(query, 'active', 'employed');
  },
  async down({ builder, query }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmContacts', (collection) => {
      collection.boolean('active', { defaultValue: true });
    });
    await copyColumn(query, 'employed', 'active');
    await builder.alterCollection('crmContacts', (collection) => {
      collection.dropField('employed');
    });
    await renameHistoryKey(query, 'employed', 'active');
  },
});

export default migration;
