import type { Row } from '@nocobase/db';
import { compileFilter, conditions, type Actor } from './authorization.js';
import { definitions, toText, type Entity } from './schema.js';
import type { CrmService } from './service.js';

// Display names for the records a response refers to, resolved on the server
// so the client never has to load whole objects to label a link. A lead is
// "name / company", a contact "name / account", an opportunity "account /
// name"; everything else is its name. `names` keeps the bare name for the
// places that already say which account a person belongs to.
export interface Titles {
  titles: Record<string, string>;
  names: Record<string, string>;
  // The size of the deals a page refers to, for the approval list's amount
  // column; only present when opportunities were among the references.
  opportunities?: Record<string, { amount: number; currency: string }>;
}

type Wanted = Partial<Record<Entity, Set<string>>>;

const relationFields: Record<string, Entity> = {
  accountId: 'accounts',
  leadId: 'leads',
  opportunityId: 'opportunities',
  contactId: 'contacts',
  convertedAccountId: 'accounts',
  convertedContactId: 'contacts',
  convertedOpportunityId: 'opportunities',
};

const want = (wanted: Wanted, entity: Entity, id: unknown): void => {
  const key = toText(id ?? '');
  if (!key) return;
  (wanted[entity] ??= new Set()).add(key);
};

// The ids a row points at: its relation fields, the contacts on a deal, the
// external participants of an activity.
export function referencedIds(wanted: Wanted, row: Row): void {
  for (const [field, entity] of Object.entries(relationFields))
    if (field in row) want(wanted, entity, row[field]);
  if (Array.isArray(row.externalParticipants))
    for (const id of row.externalParticipants) want(wanted, 'contacts', id);
  if (Array.isArray(row.contacts))
    for (const item of row.contacts)
      if (item && typeof item === 'object')
        want(wanted, 'contacts', (item as Row).contactId);
}

export function titleOf(
  entity: Entity,
  record: Row,
  accountNames: Record<string, string> = {},
): string {
  if (entity === 'leads')
    return [record.name, record.company]
      .map((v) => toText(v ?? ''))
      .filter(Boolean)
      .join(' / ');
  if (entity === 'contacts')
    return [record.name, accountNames[toText(record.accountId ?? '')]]
      .map((v) => toText(v ?? ''))
      .filter(Boolean)
      .join(' / ');
  if (entity === 'opportunities')
    return [accountNames[toText(record.accountId ?? '')], record.name]
      .map((v) => toText(v ?? ''))
      .filter(Boolean)
      .join(' / ');
  return toText(record.name ?? '');
}

const CHUNK = 400;

// Resolves titles for the rows given (each row's own title plus everything
// it references) and for any extra ids, within the actor's read access: a
// record the actor may not read is simply absent from the map.
export async function resolveTitles(
  service: CrmService,
  actor: Actor,
  rows: Partial<Record<Entity, readonly Row[]>>,
  extra: Partial<Record<Entity, readonly unknown[]>> = {},
): Promise<Titles> {
  const wanted: Wanted = {};
  for (const [entity, list] of Object.entries(rows))
    for (const row of list ?? []) {
      want(wanted, entity as Entity, row.id);
      referencedIds(wanted, row);
    }
  for (const [entity, ids] of Object.entries(extra))
    for (const id of ids ?? []) want(wanted, entity as Entity, id);

  const fetched: Partial<Record<Entity, Row[]>> = {};
  const fetch = async (entity: Entity, ids: Set<string>): Promise<void> => {
    const known = new Set((fetched[entity] ?? []).map((r) => toText(r.id)));
    const missing = [...ids].filter((id) => !known.has(id));
    if (!missing.length) return;
    let access;
    try {
      access = await conditions(actor, entity, 'read');
    } catch {
      return;
    }
    const readable = new Set(access.fields);
    const columns = [
      'id',
      'name',
      'company',
      'accountId',
      'amount',
      'currency',
    ].filter(
      (c) =>
        c === 'id' ||
        (readable.has(c) &&
          definitions[entity].fields.some((f) => f.key === c)),
    );
    const query = service.database.query();
    for (let i = 0; i < missing.length; i += CHUNK) {
      const chunk = missing.slice(i, i + CHUNK);
      const found = await query
        .selectFrom(definitions[entity].table)
        .select(columns)
        .where('id', 'in', chunk)
        .where((eb) => compileFilter(eb, access.scope))
        .execute();
      (fetched[entity] ??= []).push(...found);
    }
  };
  for (const [entity, ids] of Object.entries(wanted))
    await fetch(entity as Entity, ids);
  // A contact or a deal is titled with its account, which may not itself
  // be on the page: one more round for those accounts.
  const accountIds = new Set<string>();
  for (const entity of ['contacts', 'opportunities'] as const)
    for (const row of fetched[entity] ?? [])
      if (row.accountId) accountIds.add(toText(row.accountId));
  if (accountIds.size) await fetch('accounts', accountIds);

  const accountNames: Record<string, string> = {};
  for (const row of fetched.accounts ?? [])
    accountNames[toText(row.id)] = toText(row.name ?? '');
  const titles: Record<string, string> = {};
  const names: Record<string, string> = {};
  let opportunities: Titles['opportunities'];
  for (const [entity, list] of Object.entries(fetched))
    for (const row of list ?? []) {
      const id = toText(row.id);
      titles[id] = titleOf(entity as Entity, row, accountNames);
      names[id] = toText(row.name ?? '');
      if (entity === 'opportunities' && row.amount !== undefined)
        (opportunities ??= {})[id] = {
          amount: Number(row.amount ?? 0),
          currency: toText(row.currency ?? ''),
        };
    }
  return { titles, names, ...(opportunities ? { opportunities } : {}) };
}
