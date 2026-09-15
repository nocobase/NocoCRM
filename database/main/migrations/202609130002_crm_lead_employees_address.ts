import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// A lead records the company's employee range and street address the way an
// account does, so research can fill them in and conversion carries them over.
const migration: MigrationDefinition = defineMigration({
  name: '202609130002_crm_lead_employees_address',
  async up({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmLeads', (collection) => {
      collection.string('employees').nullable();
      collection.string('address').nullable();
    });
  },
  async down({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmLeads', (collection) => {
      collection.dropField('address');
      collection.dropField('employees');
    });
  },
});

export default migration;
