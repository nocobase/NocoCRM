import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// Two accounts may share a name (a group and its subsidiary, branches in
// different cities), so the unique index on the name goes; a plain index
// keeps name lookups fast. Down restores the unique index, which fails if
// duplicates were created meanwhile — the expected signal.
const migration: MigrationDefinition = defineMigration({
  name: '202609110010_crm_account_name_not_unique',
  async up({ builder }: MigrationContext): Promise<void> {
    await builder.dropIndex('crmAccounts', 'idx_crm_accounts_name');
    await builder.addIndex('crmAccounts', {
      name: 'idx_crm_accounts_name',
      fields: ['name'],
    });
  },
  async down({ builder }: MigrationContext): Promise<void> {
    await builder.dropIndex('crmAccounts', 'idx_crm_accounts_name');
    await builder.addIndex('crmAccounts', {
      name: 'idx_crm_accounts_name',
      fields: ['name'],
      type: 'unique',
    });
  },
});

export default migration;
