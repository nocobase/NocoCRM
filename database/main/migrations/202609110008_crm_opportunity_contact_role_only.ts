import {
  defineMigration,
  type MigrationContext,
  type MigrationDefinition,
} from '@nocobase/db';

// An opportunity's contacts carry only their role: the "primary" flag on the
// pairing goes, since the account already names its primary contact. Rewrites
// the JSON list on every opportunity to {contactId, role}. Down leaves it:
// nothing reads the flag any more.
const migration: MigrationDefinition = defineMigration({
  name: '202609110008_crm_opportunity_contact_role_only',
  async up({ query }: MigrationContext): Promise<void> {
    const rows = await query
      .selectFrom('crmOpportunities')
      .select(['id', 'contacts'])
      .execute();
    for (const row of rows) {
      const raw = row.contacts;
      const list: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!Array.isArray(list)) continue;
      const stripped = list.map((item) => {
        const contact = (item ?? {}) as Record<string, unknown>;
        return { contactId: contact.contactId, role: contact.role };
      });
      await query
        .updateTable('crmOpportunities')
        .set({ contacts: JSON.stringify(stripped) })
        .where('id', '=', row.id)
        .execute();
    }
  },
  async down(): Promise<void> {
    // Nothing to restore: the flag has no reader.
  },
});

export default migration;
