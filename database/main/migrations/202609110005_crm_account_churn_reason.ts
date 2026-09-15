import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// An account's churn reason becomes a coded choice so churn can be analysed;
// the free text it replaces moves into notes, and the row is coded "other".
// Opportunities keep their free-text lostReason: it is a different question
// with a different rule about what to write.
const migration: MigrationDefinition = defineMigration({
  name: '202609110005_crm_account_churn_reason',
  async up({ builder, query }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmAccounts', (collection) => {
      collection.string('churnReason').nullable();
    });
    const rows = await query
      .selectFrom('crmAccounts')
      .select(['id', 'lostReason', 'notes'])
      .where('lostReason', 'is not', null)
      .execute();
    const asText = (value: unknown): string =>
      typeof value === 'string' ? value.trim() : '';
    for (const row of rows) {
      const text = asText(row.lostReason);
      if (!text) continue;
      const notes = asText(row.notes);
      await query
        .updateTable('crmAccounts')
        .set({
          churnReason: 'other',
          notes: notes ? `${notes}\n${text}` : text,
        })
        .where('id', '=', row.id)
        .execute();
    }
    await builder.alterCollection('crmAccounts', (collection) => {
      collection.dropField('lostReason');
    });
  },
  async down({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmAccounts', (collection) => {
      collection.text('lostReason').nullable();
    });
    await builder.alterCollection('crmAccounts', (collection) => {
      collection.dropField('churnReason');
    });
  },
});

export default migration;
