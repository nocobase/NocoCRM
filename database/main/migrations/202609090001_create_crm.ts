import { defineMigration, type MigrationDefinition } from '@nocobase/db';

const migration: MigrationDefinition = defineMigration({
  name: '202609090001_create_crm',
  async up({ builder }) {
    await builder.createCollection('crmAccounts', (c) => {
      c.string('id', { length: 36, nullable: false }); c.primary('id');
      c.string('name', { nullable: false }); c.unique('name');
      c.string('ownerId', { length: 64, nullable: false }); c.index('ownerId');
      c.string('createdById', { length: 64, nullable: false });
      c.datetime('createdAt', { nullable: false }); c.datetime('updatedAt', { nullable: false });
      c.string('status', { nullable: false }); c.string('source', { nullable: false });
      c.string('website'); c.string('industry'); c.string('country'); c.string('state'); c.string('city');
      c.string('address'); c.text('description'); c.text('notes'); c.string('logo');
      c.string('type'); c.string('employees'); c.text('lostReason'); c.json('attachments');
    });
    await builder.createCollection('crmContacts', (c) => {
      c.string('id', { length: 36, nullable: false }); c.primary('id');
      c.string('name', { nullable: false }); c.string('accountId', { length: 36, nullable: false }); c.index('accountId');
      c.string('ownerId', { length: 64, nullable: false }); c.index('ownerId'); c.string('createdById', { length: 64, nullable: false });
      c.datetime('createdAt', { nullable: false }); c.datetime('updatedAt', { nullable: false });
      c.string('phone'); c.string('email'); c.string('jobTitle'); c.string('gender'); c.boolean('active', { defaultValue: true });
      c.string('source'); c.text('notes');
    });
    await builder.createCollection('crmOpportunities', (c) => {
      c.string('id', { length: 36, nullable: false }); c.primary('id'); c.string('name', { nullable: false });
      c.string('accountId', { length: 36, nullable: false }); c.index('accountId');
      c.string('ownerId', { length: 64, nullable: false }); c.index('ownerId'); c.string('createdById', { length: 64, nullable: false });
      c.datetime('createdAt', { nullable: false }); c.datetime('updatedAt', { nullable: false });
      c.string('stage', { nullable: false }); c.index('stage'); c.decimal('amount', { precision: 18, scale: 2, nullable: false });
      c.string('currency', { length: 3 }); c.datetime('expectedCloseAt'); c.datetime('closedAt');
      c.text('description'); c.text('lostReason'); c.text('pauseReason'); c.datetime('resumeAt');
      c.string('source', { nullable: false }); c.string('businessType'); c.json('contacts'); c.json('attachments');
    });
    await builder.createCollection('crmLeads', (c) => {
      c.string('id', { length: 36, nullable: false }); c.primary('id'); c.string('name', { nullable: false });
      c.string('ownerId', { length: 64, nullable: false }); c.index('ownerId'); c.string('createdById', { length: 64, nullable: false });
      c.datetime('createdAt', { nullable: false }); c.datetime('updatedAt', { nullable: false });
      c.string('status', { nullable: false }); c.index('status'); c.string('source', { nullable: false });
      c.string('company'); c.string('phone'); c.string('email'); c.string('jobTitle');
      c.string('website'); c.string('industry'); c.string('country'); c.string('state'); c.string('city');
      c.text('description'); c.string('invalidReason'); c.json('attachments'); c.datetime('recontactAt');
      c.datetime('convertedAt'); c.string('convertedAccountId', { length: 36 }); c.string('convertedContactId', { length: 36 });
      c.string('convertedOpportunityId', { length: 36 });
    });
    await builder.createCollection('crmActivities', (c) => {
      c.string('id', { length: 36, nullable: false }); c.primary('id'); c.string('name', { nullable: false });
      c.string('ownerId', { length: 64, nullable: false }); c.index('ownerId'); c.string('createdById', { length: 64, nullable: false });
      c.datetime('createdAt', { nullable: false }); c.datetime('updatedAt', { nullable: false });
      c.string('type', { nullable: false }); c.string('status', { nullable: false });
      c.datetime('startAt', { nullable: false }); c.datetime('endAt', { nullable: false }); c.index('startAt'); c.datetime('completedAt');
      c.text('description'); c.text('feedback'); c.json('attachments'); c.json('internalParticipants'); c.json('externalParticipants');
      c.string('leadId', { length: 36 }); c.index('leadId'); c.string('accountId', { length: 36 }); c.index('accountId');
      c.string('opportunityId', { length: 36 }); c.index('opportunityId');
    });
    await builder.createCollection('crmApprovals', (c) => {
      c.string('id', { length: 36, nullable: false }); c.primary('id'); c.string('name', { nullable: false });
      c.string('ownerId', { length: 64, nullable: false }); c.string('createdById', { length: 64, nullable: false });
      c.datetime('createdAt', { nullable: false }); c.datetime('updatedAt', { nullable: false });
      c.string('opportunityId', { length: 36, nullable: false }); c.index('opportunityId');
      c.string('topic', { nullable: false }); c.text('description', { nullable: false }); c.json('attachments');
      c.string('approverId', { length: 64 }); c.index('approverId'); c.string('status', { nullable: false });
      c.text('decisionComment'); c.datetime('submittedAt'); c.datetime('decidedAt');
    });
    await builder.createCollection('crmHistory', (c) => {
      c.string('id', { length: 36, nullable: false }); c.primary('id'); c.string('entity', { nullable: false });
      c.string('recordId', { length: 36, nullable: false }); c.index('recordId'); c.string('actorId', { length: 64, nullable: false });
      c.string('action', { nullable: false }); c.string('fromValue'); c.string('toValue'); c.datetime('createdAt', { nullable: false }); c.json('changes');
    });
    await builder.createCollection('crmSettings', (c) => {
      c.string('id', { length: 64, nullable: false }); c.primary('id'); c.json('value'); c.datetime('updatedAt', { nullable: false });
    });
    await builder.createCollection('crmUserPreferences', (c) => {
      c.string('id', { length: 64, nullable: false }); c.primary('id'); c.boolean('disabled', { defaultValue: false });
      c.string('locale', { defaultValue: 'en-US' });
    });
    await builder.createCollection('crmFiles', (c) => {
      c.string('id', { length: 36, nullable: false }); c.primary('id'); c.string('disk', { nullable: false });
      c.string('key', { nullable: false }); c.string('filename', { nullable: false }); c.string('ext'); c.string('mimeType'); c.bigInt('size');
      c.datetime('createdAt', { nullable: false }); c.datetime('updatedAt', { nullable: false });
    });
    await builder.createCollection('crmOutbox', (c) => {
      c.string('id', { length: 191, nullable: false }); c.primary('id'); c.string('recipientId', { length: 64, nullable: false });
      c.string('entity'); c.string('recordId'); c.string('event'); c.string('name'); c.string('status', { nullable: false });
      c.datetime('createdAt', { nullable: false }); c.datetime('claimedAt'); c.string('notificationId'); c.text('error');
    });
    await builder.createCollection('crmAiMessages', (c) => {
      c.string('id', { length: 36, nullable: false }); c.primary('id'); c.string('ownerId', { length: 64, nullable: false }); c.index('ownerId');
      c.string('role', { nullable: false }); c.text('content', { nullable: false }); c.string('entity'); c.string('recordId'); c.datetime('createdAt', { nullable: false });
    });
    await builder.createCollection('crmAiActions', (c) => {
      c.string('id', { length: 36, nullable: false }); c.primary('id'); c.string('ownerId', { length: 64, nullable: false }); c.index('ownerId');
      c.string('messageId', { length: 36 }); c.string('entity', { nullable: false }); c.string('recordId'); c.string('operation', { nullable: false });
      c.string('title', { nullable: false }); c.json('input'); c.json('assumptions'); c.string('status', { nullable: false });
      c.datetime('createdAt', { nullable: false }); c.datetime('executedAt'); c.string('resultId'); c.text('error');
    });
  },
  async down({ builder }) {
    for (const table of ['crmAiActions', 'crmAiMessages', 'crmOutbox', 'crmFiles', 'crmUserPreferences', 'crmSettings', 'crmHistory', 'crmApprovals', 'crmActivities', 'crmLeads', 'crmOpportunities', 'crmContacts', 'crmAccounts']) {
      await builder.dropCollection(table);
    }
  },
});

export default migration;
