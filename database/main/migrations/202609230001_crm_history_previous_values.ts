import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// A history entry for an update recorded only the values a save wrote, so
// the change history could say what a field became but not what it had been.
// Keep the values the changed fields held before the save beside them. Older
// entries have no record of their earlier values and keep none.
const migration: MigrationDefinition = defineMigration({
  name: '202609230001_crm_history_previous_values',
  async up({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmHistory', (collection) => {
      collection.json('previous').nullable();
    });
  },
  async down({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmHistory', (collection) => {
      collection.dropField('previous');
    });
  },
});

export default migration;
