import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// The in-app notification plugin declares its timestamps as naive
// `datetime` columns but stamps every row with a zoned ISO instant
// (`2026-09-18T15:00:00.089Z`, from the notification store's now()). Since
// the database layer started refusing a zoned value in a naive column,
// reading the notification list fails for anyone who has a notification.
// The columns take the type of the values they hold, as the CRM's own did
// in 202609150001. On SQLite this changes collection metadata only; the
// stored text is unchanged. Drop this migration once the plugin declares
// the columns `datetimeTz` itself; it skips when the table is absent (tests
// without the plugin, or a plugin that removed the table).
const collection = 'notificationInAppItems';
const columns: Record<string, boolean> = {
  readAt: true,
  createdAt: false,
  updatedAt: false,
};

async function retype(
  { builder }: MigrationContext,
  type: 'datetime' | 'datetimeTz',
): Promise<void> {
  if (!(await builder.hasCollection(collection))) return;
  await builder.alterCollection(collection, (c) => {
    for (const [name, nullable] of Object.entries(columns))
      c.alterField(name, { type, nullable });
  });
}

const migration: MigrationDefinition = defineMigration({
  name: '202609190001_notification_in_app_datetime_tz',
  async up(context: MigrationContext): Promise<void> {
    await retype(context, 'datetimeTz');
  },
  async down(context: MigrationContext): Promise<void> {
    await retype(context, 'datetime');
  },
});

export default migration;
