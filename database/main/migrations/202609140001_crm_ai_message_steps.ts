import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// What the assistant did while answering — the records it searched and read,
// whether it searched the web — kept on the question so the panel can show
// progress while the reply is on its way and the trail afterwards.
const migration: MigrationDefinition = defineMigration({
  name: '202609140001_crm_ai_message_steps',
  async up({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmAiMessages', (collection) => {
      collection.json('steps').nullable();
    });
  },
  async down({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmAiMessages', (collection) => {
      collection.dropField('steps');
    });
  },
});

export default migration;
