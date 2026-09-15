import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// The account logo was a URL column nothing displayed. Dropped rather than
// left as a field the forms keep asking for. Values are not recoverable on
// the way back down; the reverse restores the column, empty.
const migration: MigrationDefinition = defineMigration({
  name: '202609110004_crm_drop_account_logo',
  async up({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmAccounts', (collection) => {
      collection.dropField('logo');
    });
  },
  async down({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmAccounts', (collection) => {
      collection.string('logo').nullable();
    });
  },
});

export default migration;
