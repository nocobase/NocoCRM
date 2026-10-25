import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// Accounts are called companies: the table, the columns that point at one,
// and what the history, the outbox and the demo manifest call them. The
// builder renames neither this collection nor a field, so each is created
// under its new name, filled from the old one and the old one dropped. Mail
// entries keep their `accountId`, which names the mailbox.

// [table, old column, new column, required, indexed]
const LINKS = [
  ['crmContacts', 'accountId', 'companyId', true, true],
  ['crmOpportunities', 'accountId', 'companyId', true, true],
  ['crmTasks', 'accountId', 'companyId', false, true],
  ['crmLeads', 'convertedAccountId', 'convertedCompanyId', false, false],
] as const;

// The table under either name, as 202609090001 created it with the changes
// since (no logo, 202609110004; a churn reason, 202609110005; names that may
// repeat, 202609110010). The builder cannot rename a collection with
// supplemental metadata, so the new one is created, filled and the old one
// dropped.
async function createCompanyTable(
  builder: MigrationContext['builder'],
  name: string,
): Promise<void> {
  await builder.createCollection(name, (c) => {
    c.string('id', { length: 36, nullable: false });
    c.primary('id');
    c.string('name', { nullable: false });
    c.index('name');
    c.string('ownerId', { length: 64, nullable: false });
    c.index('ownerId');
    c.string('createdById', { length: 64, nullable: false });
    c.datetimeTz('createdAt', { nullable: false });
    c.datetimeTz('updatedAt', { nullable: false });
    c.string('status', { nullable: false });
    c.string('source', { nullable: false });
    c.string('website');
    c.string('industry');
    c.string('country');
    c.string('state');
    c.string('city');
    c.string('address');
    c.text('description');
    c.string('type');
    c.string('employees');
    c.json('attachments');
    c.string('churnReason');
  });
}

// The keys a history entry's changes and previous values name a company by.
const HISTORY_KEYS = [
  ['accountId', 'companyId'],
  ['convertedAccountId', 'convertedCompanyId'],
] as const;

// JSON text, which reads back as text or, through some adapters, already
// parsed.
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// The object with its keys renamed, or undefined when none was there.
function renameKeys(
  value: unknown,
  keys: readonly (readonly [string, string])[],
): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined;
  if (!keys.some(([from]) => from in value)) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    const renamed = keys.find(([from]) => from === key);
    out[renamed ? renamed[1] : key] = item;
  }
  return out;
}

async function rename(
  { builder, query }: MigrationContext,
  forward: boolean,
): Promise<void> {
  const [fromTable, toTable] = forward
    ? ['crmAccounts', 'crmCompanies']
    : ['crmCompanies', 'crmAccounts'];
  const [fromEntity, toEntity] = forward
    ? ['accounts', 'companies']
    : ['companies', 'accounts'];
  const pick = <T>(a: T, b: T): T => (forward ? a : b);

  await createCompanyTable(builder, toTable);
  for (const row of await query.selectFrom(fromTable).selectAll().execute())
    await query.insertInto(toTable).values(row).execute();
  await builder.dropCollection(fromTable);

  for (const [table, oldColumn, newColumn, required, indexed] of LINKS) {
    const from = pick(oldColumn, newColumn);
    const to = pick(newColumn, oldColumn);
    await builder.alterCollection(table, (c) => {
      c.string(to, { length: 36 });
      if (indexed) c.index(to);
    });
    const rows = await query
      .selectFrom(table)
      .select(['id', from])
      .where(from, 'is not', null)
      .execute();
    for (const row of rows)
      await query
        .updateTable(table)
        .set({ [to]: row[from] })
        .where('id', '=', row.id)
        .execute();
    // Dropping the field drops its index.
    await builder.alterCollection(table, (c) => {
      c.dropField(from);
    });
    if (required)
      await builder.alterCollection(table, (c) => {
        c.alterField(to, { type: 'string', length: 36, nullable: false });
      });
  }

  for (const table of ['crmHistory', 'crmOutbox'])
    await query
      .updateTable(table)
      .set({ entity: toEntity })
      .where('entity', '=', fromEntity)
      .execute();

  // History entries that name a company in their values; a mail entry's
  // accountId is its mailbox.
  const keys = HISTORY_KEYS.map(
    ([oldKey, newKey]) => [pick(oldKey, newKey), pick(newKey, oldKey)] as const,
  );
  // Every entry is read rather than matched with LIKE, which PostgreSQL has
  // no form of for a JSON column; renameKeys passes over those without one.
  const entries = await query
    .selectFrom('crmHistory')
    .select(['id', 'changes', 'previous'])
    .where('action', '!=', 'mail')
    .execute();
  for (const entry of entries) {
    const changes = renameKeys(parse(entry.changes), keys);
    const previous = renameKeys(parse(entry.previous), keys);
    if (!changes && !previous) continue;
    await query
      .updateTable('crmHistory')
      .set({
        ...(changes ? { changes: JSON.stringify(changes) } : {}),
        ...(previous ? { previous: JSON.stringify(previous) } : {}),
      })
      .where('id', '=', entry.id)
      .execute();
  }

  // The demo import's manifest, which removal reads its records from.
  const manifest = await query
    .selectFrom('crmSettings')
    .select(['id', 'value'])
    .where('id', '=', 'demo-dataset-v1')
    .executeTakeFirst();
  const parsed = parse(manifest?.value);
  if (isRecord(parsed) && Array.isArray(parsed.records)) {
    const records = parsed.records.map((record: unknown) =>
      isRecord(record) && record.entity === fromEntity
        ? { ...record, entity: toEntity }
        : record,
    );
    await query
      .updateTable('crmSettings')
      .set({ value: JSON.stringify({ ...parsed, records }) })
      .where('id', '=', 'demo-dataset-v1')
      .execute();
  }
}

const migration: MigrationDefinition = defineMigration({
  name: '202610100001_crm_companies',
  async up(context: MigrationContext): Promise<void> {
    await rename(context, true);
  },
  async down(context: MigrationContext): Promise<void> {
    await rename(context, false);
  },
});

export default migration;
