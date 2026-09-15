import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// Every CRM timestamp is an instant, written as an ISO string with a zone
// (`2026-09-15T02:00:00.000Z`). The database layer now tells a zoned instant
// (`datetimeTz`) from a naive local time (`datetime`) and refuses a zoned
// value in a naive column, so the columns take the type of the values they
// have always held. On SQLite this changes the collection metadata only; the
// stored text is unchanged.
const columns: Record<string, Record<string, boolean>> = {
  crmAccounts: { createdAt: false, updatedAt: false },
  crmContacts: { createdAt: false, updatedAt: false },
  crmOpportunities: {
    createdAt: false,
    updatedAt: false,
    expectedCloseAt: true,
    closedAt: true,
    resumeAt: true,
  },
  crmLeads: { createdAt: false, updatedAt: false, convertedAt: true },
  crmActivities: {
    createdAt: false,
    updatedAt: false,
    startAt: false,
    endAt: false,
    completedAt: true,
  },
  crmApprovals: {
    createdAt: false,
    updatedAt: false,
    submittedAt: true,
    decidedAt: true,
  },
  crmHistory: { createdAt: false },
  crmSettings: { updatedAt: false },
  crmFiles: { createdAt: false, updatedAt: false },
  crmOutbox: { createdAt: false, claimedAt: true },
  crmAiMessages: { createdAt: false },
  crmAiActions: { createdAt: false, executedAt: true },
};

async function retype(
  { builder }: MigrationContext,
  type: 'datetime' | 'datetimeTz',
): Promise<void> {
  for (const [collection, fields] of Object.entries(columns)) {
    await builder.alterCollection(collection, (c) => {
      for (const [name, nullable] of Object.entries(fields)) {
        c.alterField(name, { type, nullable });
      }
    });
  }
}

const migration: MigrationDefinition = defineMigration({
  name: '202609150001_crm_datetime_tz',
  async up(context: MigrationContext): Promise<void> {
    await retype(context, 'datetimeTz');
  },
  async down(context: MigrationContext): Promise<void> {
    await retype(context, 'datetime');
  },
});

export default migration;
