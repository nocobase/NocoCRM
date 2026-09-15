import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// A message is now written before the model answers, so a reload or a server
// restart while the answer is on its way no longer loses it. "status" is
// "pending" while the reply is awaited, "failed" when it never came (the row
// can then be resent), and empty once answered. "options" keeps the request
// flags a resend has to repeat, such as web search.
const migration: MigrationDefinition = defineMigration({
  name: '202609130003_crm_ai_message_status',
  async up({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmAiMessages', (collection) => {
      collection.string('status').nullable();
      collection.json('options').nullable();
    });
  },
  async down({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmAiMessages', (collection) => {
      collection.dropField('options');
      collection.dropField('status');
    });
  },
});

export default migration;
