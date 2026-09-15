import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// A lead gains a company introduction of its own, separate from the enquiry
// text ("message"): what the company is, as found by research, carried over
// to the account's introduction on conversion.
const migration: MigrationDefinition = defineMigration({
  name: '202609130001_crm_lead_company_description',
  async up({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmLeads', (collection) => {
      collection.text('companyDescription').nullable();
    });
  },
  async down({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmLeads', (collection) => {
      collection.dropField('companyDescription');
    });
  },
});

export default migration;
