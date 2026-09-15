import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// Gender becomes required with "unknown" as its resting value, and the option
// list shrinks to male / female / unknown. Rows without a value, and rows on
// the two retired options, are read as unknown. Down leaves the values: they
// are all valid text either way.
const migration: MigrationDefinition = defineMigration({
  name: '202609110007_crm_contact_gender',
  async up({ query }: MigrationContext): Promise<void> {
    await query
      .updateTable('crmContacts')
      .set({ gender: 'unknown' })
      .where((eb) =>
        eb.or([
          eb('gender', 'is', null),
          eb('gender', '=', ''),
          eb('gender', 'in', ['other', 'unspecified']),
        ]),
      )
      .execute();
  },
  async down(): Promise<void> {
    // Nothing to restore: "unknown" is as valid a text value as the old ones.
  },
});

export default migration;
