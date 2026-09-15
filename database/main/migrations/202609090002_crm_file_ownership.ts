import { defineMigration, type MigrationDefinition } from '@nocobase/db';
const migration: MigrationDefinition = defineMigration({
  name: '202609090002_crm_file_ownership',
  async up({ builder }) { await builder.createCollection('crmFileUploads', (c) => { c.string('id', { length: 36, nullable: false }); c.primary('id'); c.string('ownerId', { length: 64, nullable: false }); c.index('ownerId'); }); },
  async down({ builder }) { await builder.dropCollection('crmFileUploads'); },
});
export default migration;
