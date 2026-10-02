import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// An activity's statuses are planned, completed and cancelled: the former
// "no-show" is gone, a meeting the other side missed being cancelled like
// any other that did not take place. Activities saved with it become
// cancelled. Their history keeps the status as it was recorded.
const migration: MigrationDefinition = defineMigration({
  name: '202610020001_crm_activities_no_show_cancelled',
  async up({ builder, query }: MigrationContext): Promise<void> {
    if (!(await builder.hasCollection('crmActivities'))) return;
    await query
      .updateTable('crmActivities')
      .set({ status: 'cancelled' })
      .where('status', '=', 'noShow')
      .execute();
  },
  async down(): Promise<void> {
    // Which cancelled activities were no-shows is not kept; cancelled is
    // a valid status before this migration too.
  },
});

export default migration;
