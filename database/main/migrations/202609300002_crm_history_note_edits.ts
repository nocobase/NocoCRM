import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// Notes join a record's activity feed as history entries of their own
// (`action` 'note', the text in `changes`), written by anyone who may read
// the record. Unlike the rest of the feed a note may be edited by its
// author, and `editedAt` says when it last was; the text before the edit
// is kept in `previous`. Every other entry leaves it empty.
const migration: MigrationDefinition = defineMigration({
  name: '202609300002_crm_history_note_edits',
  async up({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmHistory', (collection) => {
      collection.datetimeTz('editedAt').nullable();
    });
  },
  async down({ builder }: MigrationContext): Promise<void> {
    await builder.alterCollection('crmHistory', (collection) => {
      collection.dropField('editedAt');
    });
  },
});

export default migration;
