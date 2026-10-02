import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// The change history becomes a record's activity feed: who changed what,
// people and the AI alike. `source` says where a change came from (empty
// for a person's own edit, `assistant` for one the AI proposed and a person
// confirmed, `ai` for the AI's own work such as a lead evaluation). An AI
// entry keeps what it concluded in `ai` and where it stands in `aiStatus`
// (running, pending, accepted, dismissed, failed), a column of its own so
// the lists can find the leads that wait on a decision. Entries written
// before this carry no source and count as a person's.
const migration: MigrationDefinition = defineMigration({
  name: '202609300001_crm_history_ai',
  async up({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmHistory', (collection) => {
      collection.string('source', { length: 32 }).nullable();
      collection.string('aiStatus', { length: 32 }).nullable();
      collection.json('ai').nullable();
      collection.index(['aiStatus'], { name: 'crm_history_ai_status' });
    });
  },
  async down({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmHistory', (collection) => {
      collection.dropIndex('crm_history_ai_status');
    });
    await builder.alterCollection('crmHistory', (collection) => {
      collection.dropField('ai');
      collection.dropField('aiStatus');
      collection.dropField('source');
    });
  },
});

export default migration;
