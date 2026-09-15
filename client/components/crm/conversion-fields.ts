import type { CrmRecord, Data } from './api.js';

// What conversion copies from the lead into each record. The server holds the
// same lists; these drive the preview and the conflict check only.
export const inherited = {
  accounts: [
    'name',
    'website',
    'industry',
    'country',
    'state',
    'city',
    'source',
    'ownerId',
  ],
  contacts: ['name', 'phone', 'email', 'jobTitle', 'source', 'ownerId'],
} as const;

export function proposalFor(
  lead: CrmRecord,
  entity: 'accounts' | 'contacts',
): Data {
  return entity === 'accounts'
    ? {
        name: lead.company,
        website: lead.website,
        industry: lead.industry,
        country: lead.country,
        state: lead.state,
        city: lead.city,
        source: lead.source,
        ownerId: lead.ownerId,
        status: 'qualified',
      }
    : {
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        jobTitle: lead.jobTitle,
        source: lead.source,
        ownerId: lead.ownerId,
      };
}
