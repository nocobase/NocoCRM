import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// An email activity can be sent to its external participants through the
// notification plugin's email channel. The activity keeps what actually went
// out — subject, body, addresses, time — since the name and description it
// was drafted from stay editable afterwards.
const migration: MigrationDefinition = defineMigration({
  name: '202609150003_crm_activity_email_sent',
  async up({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmActivities', (collection) => {
      collection.datetimeTz('emailSentAt').nullable();
      collection.text('emailSentTo').nullable();
      collection.string('emailSubject').nullable();
      collection.text('emailBody').nullable();
    });
  },
  async down({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmActivities', (collection) => {
      collection.dropField('emailBody');
      collection.dropField('emailSubject');
      collection.dropField('emailSentTo');
      collection.dropField('emailSentAt');
    });
  },
});

export default migration;
