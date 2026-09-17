import { toText, type Entity, type CrmRecord } from './api.js';

// How a record is named wherever it is linked from another record. A lead is
// "name / company": on its own a person's name says little about which
// enquiry it is. A contact is a person at an account and an opportunity is
// named for what it delivers, so both carry the account's name, which comes
// from the titles the server resolved for the page (a contact's or deal's
// own title there already includes it).
export function recordTitle(
  entity: Entity,
  record: CrmRecord,
  titles: Record<string, string> = {},
): string {
  const own = titles[toText(record.id)];
  if (entity === 'leads')
    return [record.name, record.company]
      .map(toText)
      .filter(Boolean)
      .join(' / ');
  if (entity === 'contacts') {
    const account = titles[toText(record.accountId ?? '')];
    return own && !record.name
      ? own
      : [record.name, account].map(toText).filter(Boolean).join(' / ');
  }
  if (entity === 'opportunities') {
    const account = titles[toText(record.accountId ?? '')];
    return own && !record.name
      ? own
      : [account, record.name].map(toText).filter(Boolean).join(' / ');
  }
  return toText(record.name) || own || '';
}
