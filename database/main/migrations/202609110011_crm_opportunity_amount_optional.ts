import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// An opportunity may be logged before its value is known, so the amount is
// no longer required: the column accepts NULL, which the statistics already
// read as zero. Down fills NULLs with 0 before tightening the column again.
const migration: MigrationDefinition = defineMigration({
  name: '202609110011_crm_opportunity_amount_optional',
  async up({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmOpportunities', (collection) => {
      collection.alterField('amount', {
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: true,
      });
    });
  },
  async down({ builder, query }: MigrationContext): Promise<void> {
    await query
      .updateTable('crmOpportunities')
      .set({ amount: 0 })
      .where('amount', 'is', null)
      .execute();
    await builder.alterCollection('crmOpportunities', (collection) => {
      collection.alterField('amount', {
        type: 'decimal',
        precision: 18,
        scale: 2,
        nullable: false,
      });
    });
  },
});

export default migration;
