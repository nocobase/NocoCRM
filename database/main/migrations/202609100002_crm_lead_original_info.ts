import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// A lead records the enquiry as it arrived; accounts and opportunities have a
// description written later. Sharing one column conflated the two, so the lead
// column is renamed by adding the new one, copying, then dropping the old.
// The query builder has no column-to-column update, so the copy reads each row
// and writes it back under the other name.
async function copyColumn(
  query: MigrationContext['query'],
  from: 'description' | 'originalInfo',
  to: 'description' | 'originalInfo',
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

const migration: MigrationDefinition = defineMigration({
  name: '202609100002_crm_lead_original_info',
  async up({ builder, query }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmLeads', (collection) => {
      collection.text('originalInfo').nullable();
    });
    await copyColumn(query, 'description', 'originalInfo');
    await builder.alterCollection('crmLeads', (collection) => {
      collection.dropField('description');
    });
  },
  async down({ builder, query }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmLeads', (collection) => {
      collection.text('description').nullable();
    });
    await copyColumn(query, 'originalInfo', 'description');
    await builder.alterCollection('crmLeads', (collection) => {
      collection.dropField('originalInfo');
    });
  },
});

export default migration;
