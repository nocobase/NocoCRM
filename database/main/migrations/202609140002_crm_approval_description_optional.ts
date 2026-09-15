import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// An approval's description became optional in the form (the subject says
// what is asked; the description elaborates), but the column still refused
// a null, so a request raised without one failed on insert.
const migration: MigrationDefinition = defineMigration({
  name: '202609140002_crm_approval_description_optional',
  async up({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmApprovals', (collection) => {
      collection.alterField('description', { type: 'text', nullable: true });
    });
  },
  async down({ builder, query }: MigrationContext): Promise<void> {
    // Rows without a description would violate the constraint: give them an
    // empty one before it is restored.
    await query
      .updateTable('crmApprovals')
      .set({ description: '' })
      .where('description', 'is', null)
      .execute();
    await builder.alterCollection('crmApprovals', (collection) => {
      collection.alterField('description', { type: 'text', nullable: false });
    });
  },
});

export default migration;
