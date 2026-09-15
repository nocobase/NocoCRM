import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// Marks the main person to reach at an account. A flag on the contact rather
// than a pointer on the account, so an account can have none, and setting it
// is a one-field edit on the contact. Defaults to false for existing rows.
const migration: MigrationDefinition = defineMigration({
  name: '202609110006_crm_contact_primary',
  async up({ builder, query }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmContacts', (collection) => {
      collection.boolean('primary').nullable();
    });
    await query
      .updateTable('crmContacts')
      .set({ primary: false })
      .where('primary', 'is', null)
      .execute();
  },
  async down({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmContacts', (collection) => {
      collection.dropField('primary');
    });
  },
});

export default migration;
