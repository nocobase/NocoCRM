import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// The assumptions on an action card describe what the assistant proposed, but
// "input" is what the user edited it into before confirming. Once they differ
// the card reads as contradicting itself. Keep the proposal as it was made so
// the card can mark which fields the user changed. Existing rows have no
// record of their proposal, so their current input stands in for it.
const migration: MigrationDefinition = defineMigration({
  name: '202609110003_crm_action_proposed_input',
  async up({ builder, query }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmAiActions', (collection) => {
      collection.json('proposedInput').nullable();
    });
    const rows = await query
      .selectFrom('crmAiActions')
      .select(['id', 'input'])
      .execute();
    for (const row of rows)
      await query
        .updateTable('crmAiActions')
        .set({ proposedInput: row.input })
        .where('id', '=', row.id)
        .execute();
  },
  async down({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmAiActions', (collection) => {
      collection.dropField('proposedInput');
    });
  },
});

export default migration;
