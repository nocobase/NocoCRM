import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// Takes the settings the CRM no longer has out of its stored business
// settings (the `crmSettings` row `business`), which reading and saving the
// settings dropped until now: the approval switch and the first-contact
// threshold, and the former assistant's business instructions, model service,
// model and on/off switch (the AI now runs whenever the Agents plugin has a
// model to ask). Every other setting stays as stored. Irreversible: the
// values were ignored, and nothing keeps them.
const RETIRED = [
  'approvalEnabled',
  'firstContactDays',
  'aiInstructions',
  'aiService',
  'aiModel',
  'aiEnabled',
] as const;

// A stored JSON value, which an older row may hold as a JSON string inside
// the JSON column.
function parse(value: unknown): unknown {
  let current = value;
  for (let i = 0; i < 2 && typeof current === 'string'; i++) {
    try {
      current = JSON.parse(current) as unknown;
    } catch {
      return current;
    }
  }
  return current;
}

const migration: MigrationDefinition = defineMigration({
  name: '202611100001_crm_drop_retired_settings',
  irreversible: true,
  async up({ query }: MigrationContext): Promise<void> {
    const row = await query
      .selectFrom('crmSettings')
      .select(['id', 'value'])
      .where('id', '=', 'business')
      .executeTakeFirst();
    const settings = parse(row?.value);
    if (!settings || typeof settings !== 'object' || Array.isArray(settings))
      return;
    const kept = { ...(settings as Record<string, unknown>) };
    if (!RETIRED.some((key) => key in kept)) return;
    for (const key of RETIRED) delete kept[key];
    await query
      .updateTable('crmSettings')
      .set({ value: JSON.stringify(kept), updatedAt: new Date() })
      .where('id', '=', 'business')
      .execute();
  },
});

export default migration;
