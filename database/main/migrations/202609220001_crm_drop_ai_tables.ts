import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// The CRM's own chat service is gone: conversations, tool calls and their
// confirmations live in the AI Employee plugin now. Its transcript and
// proposed-action tables held only that service's state, so they go with
// it. The reverse recreates them in the shape they last had, as the
// previous migrations left them.
const migration: MigrationDefinition = defineMigration({
  name: '202609220001_crm_drop_ai_tables',
  async up({ builder }: MigrationContext): Promise<void> {
    await builder.dropCollection('crmAiActions');
    await builder.dropCollection('crmAiMessages');
  },
  async down({ builder }: MigrationContext): Promise<void> {
    await builder.createCollection('crmAiMessages', (c) => {
      c.string('id', { length: 36, nullable: false });
      c.primary('id');
      c.string('ownerId', { length: 64, nullable: false });
      c.index('ownerId');
      c.string('role', { nullable: false });
      c.text('content', { nullable: false });
      c.string('entity');
      c.string('recordId');
      c.datetimeTz('createdAt', { nullable: false });
      c.string('status');
      c.json('options');
      c.json('steps');
    });
    await builder.createCollection('crmAiActions', (c) => {
      c.string('id', { length: 36, nullable: false });
      c.primary('id');
      c.string('ownerId', { length: 64, nullable: false });
      c.index('ownerId');
      c.string('messageId', { length: 36 });
      c.string('entity', { nullable: false });
      c.string('recordId');
      c.string('operation', { nullable: false });
      c.string('title', { nullable: false });
      c.json('input');
      c.json('assumptions');
      c.string('status', { nullable: false });
      c.datetimeTz('createdAt', { nullable: false });
      c.datetimeTz('executedAt');
      c.string('resultId');
      c.text('error');
      c.json('proposedInput');
    });
  },
});

export default migration;
