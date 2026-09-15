import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// The lead specification never listed a recontact time; the column existed
// only to feed one dashboard reminder for nurturing leads, and the assistant
// kept filling it on leads of every status because nothing said otherwise.
// Dropping it removes the ambiguity. The values are not recoverable on the way
// back down: the reverse restores the column, empty.
const migration: MigrationDefinition = defineMigration({
  name: '202609110001_crm_drop_lead_recontact',
  async up({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmLeads', (collection) => {
      collection.dropField('recontactAt');
    });
  },
  async down({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmLeads', (collection) => {
      collection.datetime('recontactAt').nullable();
    });
  },
});

export default migration;
