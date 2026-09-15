import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// Lost and pause reasons become coded choices, as churn reasons did on
// accounts. The free text each replaces moves into the description, and the
// row is coded "other". Column types are left alone: the values are text
// either way, only shorter now.
const migration: MigrationDefinition = defineMigration({
  name: '202609110009_crm_opportunity_reason_options',
  async up({ query }: MigrationContext): Promise<void> {
    const rows = await query
      .selectFrom('crmOpportunities')
      .select(['id', 'lostReason', 'pauseReason', 'description'])
      .where((eb) =>
        eb.or([
          eb('lostReason', 'is not', null),
          eb('pauseReason', 'is not', null),
        ]),
      )
      .execute();
    const asText = (value: unknown): string =>
      typeof value === 'string' ? value.trim() : '';
    for (const row of rows) {
      const lost = asText(row.lostReason);
      const paused = asText(row.pauseReason);
      if (!lost && !paused) continue;
      const kept = [asText(row.description), lost, paused].filter(Boolean);
      await query
        .updateTable('crmOpportunities')
        .set({
          lostReason: lost ? 'other' : null,
          pauseReason: paused ? 'other' : null,
          description: kept.join('\n'),
        })
        .where('id', '=', row.id)
        .execute();
    }
  },
  async down(): Promise<void> {
    // The original wording is in the description; the codes stay valid text.
  },
});

export default migration;
