import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// Industry and country moved from free English text to codes so both locales
// render from one stored value. Mappings are spelled out rather than imported
// because an applied migration must keep meaning what it meant when it ran.
const industries: Record<string, string> = {
  Education: 'education',
  Energy: 'energy',
  'Food and beverage': 'foodAndBeverage',
  Healthcare: 'healthcare',
  Logistics: 'logistics',
  Manufacturing: 'manufacturing',
  Retail: 'retail',
  Services: 'professionalServices',
  Software: 'technology',
};
const countries: Record<string, string> = {
  China: 'CN',
};
const tables = ['crmLeads', 'crmAccounts'] as const;

async function remap(
  query: MigrationContext['query'],
  column: 'industry' | 'country',
  mapping: Record<string, string>,
): Promise<void> {
  for (const table of tables)
    for (const [from, to] of Object.entries(mapping))
      await query
        .updateTable(table)
        .set({ [column]: to })
        .where(column, '=', from)
        .execute();
}

const migration: MigrationDefinition = defineMigration({
  name: '202609100001_crm_geography_codes',
  async up({ query }) {
    await remap(query, 'industry', industries);
    await remap(query, 'country', countries);
  },
  async down({ query }) {
    const invert = (mapping: Record<string, string>): Record<string, string> =>
      Object.fromEntries(
        Object.entries(mapping).map(([from, to]) => [to, from]),
      );
    await remap(query, 'country', invert(countries));
    await remap(query, 'industry', invert(industries));
  },
});
export default migration;
