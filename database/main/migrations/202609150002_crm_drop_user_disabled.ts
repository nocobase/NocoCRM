import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// Disabling a user is the Users page's job now, at the account level (the
// authentication plugin's disabledAt, which also ends sign-in). The CRM's
// own flag goes; a user it had disabled is disabled there instead.
const migration: MigrationDefinition = defineMigration({
  name: '202609150002_crm_drop_user_disabled',
  async up({ builder, query }: MigrationContext): Promise<void> {
    const disabled = await query
      .selectFrom('crmUserPreferences')
      .select('id')
      .where('disabled', '=', 1)
      .execute();
    if (disabled.length)
      await query
        .updateTable('user')
        .set({ disabledAt: new Date() })
        .where(
          'id',
          'in',
          disabled.map((row) => String(row.id)),
        )
        .where('disabledAt', 'is', null)
        .execute();
    await builder.alterCollection('crmUserPreferences', (collection) => {
      collection.dropField('disabled');
    });
  },
  async down({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmUserPreferences', (collection) => {
      collection.boolean('disabled', { defaultValue: false });
    });
  },
});

export default migration;
