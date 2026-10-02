import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// An activity's end time is optional: a call or an email has a start and
// often nothing that marks its end. Rolling back gives each activity
// without one its start as its end, which the column required before.
const migration: MigrationDefinition = defineMigration({
  name: '202610020002_crm_activities_end_optional',
  async up({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmActivities', (c) => {
      c.alterField('endAt', { type: 'datetimeTz', nullable: true });
    });
  },
  async down({ builder, query }: MigrationContext): Promise<void> {
    const open = await query
      .selectFrom('crmActivities')
      .select(['id', 'startAt'])
      .where('endAt', 'is', null)
      .execute();
    for (const row of open)
      await query
        .updateTable('crmActivities')
        .set({ endAt: row.startAt })
        .where('id', '=', row.id as string)
        .execute();
    await builder.alterCollection('crmActivities', (c) => {
      c.alterField('endAt', { type: 'datetimeTz', nullable: false });
    });
  },
});

export default migration;
